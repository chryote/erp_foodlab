<?php

namespace App\Modules\CHO\Services;

use App\Enums\PayrollGroup;
use App\Enums\PayrollItemStatus;
use App\Enums\PayrollRunStatus;
use App\Models\Company;
use App\Models\Employee;
use App\Models\EmployeePosition;
use App\Models\PayrollItem;
use App\Models\PayrollRun;
use App\Support\IndexQuery;
use App\Support\InputNormalizer;
use App\Support\WriteGuard;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Spatie\QueryBuilder\AllowedFilter;
use Spatie\QueryBuilder\QueryBuilder;

class PayrollItemService
{
    public const CACHE_KEY_LIST = 'erp_foodlab:cho:payroll_items:list';

    private const MAX_DECIMAL_18_2 = 9999999999999999.99;

    /**
     * @var array<int, string>
     */
    private const RELATIONS = ['company', 'payrollRun', 'employee', 'employeePosition'];

    /**
     * @var list<string>
     */
    private const MONEY_FIELDS = [
        'base_salary',
        'bpjs_kesehatan',
        'bpjs_ketenagakerjaan',
        'bonus',
        'overtime',
        'deduction',
        'thr',
        'pph21',
    ];

    /**
     * @return LengthAwarePaginator|Collection<int, PayrollItem>
     */
    public function list(Request $request): LengthAwarePaginator|Collection
    {
        $query = IndexQuery::withDefaultRelations($this->query($request), $request, self::RELATIONS);

        IndexQuery::applyActiveCompanyFilter($query->getEloquentBuilder(), $request);

        if (IndexQuery::isPaginated($request)) {
            return IndexQuery::paginate($query, $request);
        }

        if (IndexQuery::isCacheable($request)) {
            return Cache::remember(self::CACHE_KEY_LIST, 60, fn () => $query->get());
        }

        return $query->get();
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    public function createPayrollItem(array $attributes): PayrollItem
    {
        $attributes = $this->sanitizeAttributes($attributes);

        $payrollItem = DB::transaction(function () use ($attributes): PayrollItem {
            $companyId = (int) $attributes['company_id'];
            $payrollRunId = (int) $attributes['payroll_run_id'];
            $employeeId = (int) $attributes['employee_id'];
            $positionId = isset($attributes['employee_position_id']) ? (int) $attributes['employee_position_id'] : null;

            $this->assertActiveCompany($companyId);
            $payrollRun = $this->lockAndAssertMutablePayrollRun($payrollRunId, $companyId);
            $this->assertActiveEmployee($employeeId, $companyId);
            $this->assertActivePosition($positionId, $companyId);

            WriteGuard::assertUniqueActive(
                PayrollItem::query(),
                'employee_id',
                (string) $employeeId,
                [
                    'company_id' => $companyId,
                    'payroll_run_id' => $payrollRunId,
                ],
                'employee_id',
                'Karyawan sudah terdaftar pada payroll run ini.',
                null,
                true
            );

            $attributes = $this->withComputedTotalNet($attributes);
            $created = PayrollItem::query()->create($attributes);

            self::syncPayrollRunTotals($payrollRun);

            return $created;
        });

        $this->forgetCaches();

        return $payrollItem->load(self::RELATIONS);
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    public function updatePayrollItem(PayrollItem $payrollItem, array $attributes): PayrollItem
    {
        $attributes = $this->sanitizeAttributes($attributes, forUpdate: true);

        $updated = DB::transaction(function () use ($payrollItem, $attributes): PayrollItem {
            $locked = PayrollItem::query()->lockForUpdate()->findOrFail($payrollItem->getKey());

            if ($this->isItemFinalized($locked)) {
                throw ValidationException::withMessages([
                    'payroll_item' => ['Cannot modify a payroll item that has already been finalized.'],
                ]);
            }

            $oldRunId = (int) $locked->payroll_run_id;
            $targetCompanyId = (int) ($attributes['company_id'] ?? $locked->company_id);
            $targetRunId = (int) ($attributes['payroll_run_id'] ?? $locked->payroll_run_id);
            $targetEmployeeId = (int) ($attributes['employee_id'] ?? $locked->employee_id);
            $targetPositionId = array_key_exists('employee_position_id', $attributes)
                ? ($attributes['employee_position_id'] !== null ? (int) $attributes['employee_position_id'] : null)
                : $locked->employee_position_id;

            // Lock runs in deterministic ID order to avoid deadlocks when moving across runs.
            $runIdsToLock = array_values(array_unique([$oldRunId, $targetRunId]));
            sort($runIdsToLock);
            $lockedRuns = [];
            foreach ($runIdsToLock as $runId) {
                $lockedRuns[$runId] = PayrollRun::query()
                    ->whereNull('deleted_at')
                    ->lockForUpdate()
                    ->find($runId);
            }

            $oldRun = $lockedRuns[$oldRunId] ?? null;
            if ($oldRun === null || $this->isRunLockedStatus($oldRun)) {
                throw ValidationException::withMessages([
                    'payroll_run_id' => ['Cannot modify payroll items when the payroll run is approved or void.'],
                ]);
            }

            $targetRun = $lockedRuns[$targetRunId] ?? null;
            if ($targetRun === null || (int) $targetRun->company_id !== $targetCompanyId) {
                throw ValidationException::withMessages([
                    'payroll_run_id' => ['The selected payroll run does not belong to the specified company.'],
                ]);
            }

            if ($this->isRunLockedStatus($targetRun)) {
                throw ValidationException::withMessages([
                    'payroll_run_id' => ['Cannot modify payroll items when the payroll run is approved or void.'],
                ]);
            }

            $this->assertActiveCompany($targetCompanyId);
            $this->assertActiveEmployee($targetEmployeeId, $targetCompanyId);
            $this->assertActivePosition($targetPositionId !== null ? (int) $targetPositionId : null, $targetCompanyId);

            WriteGuard::assertUniqueActive(
                PayrollItem::query(),
                'employee_id',
                (string) $targetEmployeeId,
                [
                    'company_id' => $targetCompanyId,
                    'payroll_run_id' => $targetRunId,
                ],
                'employee_id',
                'Karyawan sudah terdaftar pada payroll run ini.',
                $locked->getKey(),
                true
            );

            $attributes = $this->withComputedTotalNet($attributes, $locked);
            $locked->update($attributes);

            self::syncPayrollRunTotals($targetRun);
            if ($oldRunId !== $targetRunId) {
                self::syncPayrollRunTotals($oldRun);
            }

            return $locked;
        });

        $this->forgetCaches();

        return $updated->refresh()->load(self::RELATIONS);
    }

    public function deletePayrollItem(PayrollItem $payrollItem): void
    {
        DB::transaction(function () use ($payrollItem): void {
            $locked = PayrollItem::query()->lockForUpdate()->findOrFail($payrollItem->getKey());

            if ($this->isItemFinalized($locked)) {
                throw ValidationException::withMessages([
                    'payroll_item' => ['Cannot delete a payroll item that has already been finalized.'],
                ]);
            }

            $payrollRun = PayrollRun::query()
                ->whereNull('deleted_at')
                ->lockForUpdate()
                ->find($locked->payroll_run_id);

            if ($payrollRun !== null && $this->isRunLockedStatus($payrollRun)) {
                throw ValidationException::withMessages([
                    'payroll_run_id' => ['Cannot delete payroll items when the payroll run is approved or void.'],
                ]);
            }

            $locked->delete();

            if ($payrollRun !== null) {
                self::syncPayrollRunTotals($payrollRun);
            }
        });

        $this->forgetCaches();
    }

    public static function syncPayrollRunTotals(PayrollRun $payrollRun): void
    {
        $totals = PayrollItem::query()
            ->where('payroll_run_id', $payrollRun->getKey())
            ->whereNull('deleted_at')
            ->selectRaw('
                COALESCE(SUM(base_salary), 0) as total_base_salary,
                COALESCE(SUM(bpjs_kesehatan), 0) as total_bpjs_kesehatan,
                COALESCE(SUM(bpjs_ketenagakerjaan), 0) as total_bpjs_ketenagakerjaan,
                COALESCE(SUM(bonus), 0) as total_bonus,
                COALESCE(SUM(overtime), 0) as total_overtime,
                COALESCE(SUM(deduction), 0) as total_deduction,
                COALESCE(SUM(thr), 0) as total_thr,
                COALESCE(SUM(pph21), 0) as total_pph21,
                COALESCE(SUM(total_net), 0) as total_net
            ')
            ->first();

        $payrollRun->update([
            'total_base_salary' => round((float) ($totals?->total_base_salary ?? 0), 2),
            'total_bpjs_kesehatan' => round((float) ($totals?->total_bpjs_kesehatan ?? 0), 2),
            'total_bpjs_ketenagakerjaan' => round((float) ($totals?->total_bpjs_ketenagakerjaan ?? 0), 2),
            'total_bonus' => round((float) ($totals?->total_bonus ?? 0), 2),
            'total_overtime' => round((float) ($totals?->total_overtime ?? 0), 2),
            'total_deduction' => round((float) ($totals?->total_deduction ?? 0), 2),
            'total_thr' => round((float) ($totals?->total_thr ?? 0), 2),
            'total_pph21' => round((float) ($totals?->total_pph21 ?? 0), 2),
            'total_net' => round((float) ($totals?->total_net ?? 0), 2),
        ]);
    }

    private function query(Request $request): QueryBuilder
    {
        return IndexQuery::make(PayrollItem::class, $request)
            ->allowedFilters([
                AllowedFilter::exact('company_id'),
                AllowedFilter::exact('payroll_run_id'),
                AllowedFilter::exact('employee_id'),
                AllowedFilter::exact('employee_position_id'),
                AllowedFilter::exact('payroll_group'),
                AllowedFilter::callback('search', function (Builder $query, mixed $value): void {
                    $escaped = IndexQuery::escapeLike($value);
                    if ($escaped === null) {
                        return;
                    }

                    $query->where(function (Builder $searchQuery) use ($escaped): void {
                        IndexQuery::whereLike($searchQuery, 'bank_account_number', $escaped);
                        $searchQuery->orWhereHas(
                            'employee',
                            fn (Builder $employeeQuery) => IndexQuery::whereLike($employeeQuery, 'name', $escaped)
                        );
                    });
                }),
            ])
            ->allowedSorts(['payroll_group', 'base_salary', 'total_net', 'id'])
            ->allowedIncludes(self::RELATIONS)
            ->defaultSort('payroll_group', 'id');
    }

    /**
     * @param  array<string, mixed>  $attributes
     * @return array<string, mixed>
     */
    private function sanitizeAttributes(array $attributes, bool $forUpdate = false): array
    {
        unset($attributes['total_net'], $attributes['status'], $attributes['finalized_by'], $attributes['finalized_at']);

        foreach (['bank_account_number', 'notes'] as $textField) {
            if (array_key_exists($textField, $attributes)) {
                $attributes[$textField] = $attributes[$textField] !== null
                    ? InputNormalizer::nullableText((string) $attributes[$textField])
                    : null;
            }
        }

        if (! $forUpdate && ! array_key_exists('payroll_group', $attributes)) {
            $attributes['payroll_group'] = PayrollGroup::OFFICE->value;
        }

        foreach (self::MONEY_FIELDS as $field) {
            if (array_key_exists($field, $attributes)) {
                $attributes[$field] = $attributes[$field] !== null
                    ? round((float) $attributes[$field], 2)
                    : 0.0;
            } elseif (! $forUpdate) {
                $attributes[$field] = 0.0;
            }
        }

        return $attributes;
    }

    /**
     * @param  array<string, mixed>  $attributes
     * @return array<string, mixed>
     */
    private function withComputedTotalNet(array $attributes, ?PayrollItem $existing = null): array
    {
        $amounts = [];
        foreach (self::MONEY_FIELDS as $field) {
            $amounts[$field] = array_key_exists($field, $attributes)
                ? round((float) $attributes[$field], 2)
                : round((float) ($existing?->{$field} ?? 0), 2);
        }

        $totalNet = round(
            ($amounts['base_salary'] + $amounts['bonus'] + $amounts['overtime'] + $amounts['thr'])
            - ($amounts['bpjs_kesehatan'] + $amounts['bpjs_ketenagakerjaan'] + $amounts['deduction'] + $amounts['pph21']),
            2
        );

        if ($totalNet < 0) {
            throw ValidationException::withMessages([
                'total_net' => ['The computed total net cannot be negative.'],
            ]);
        }

        if ($totalNet >= 10000000000000000.0) {
            throw ValidationException::withMessages([
                'total_net' => ['The computed total net exceeds the maximum supported decimal(18,2) amount.'],
            ]);
        }

        $attributes['total_net'] = $totalNet;

        return $attributes;
    }

    private function assertActiveCompany(int $companyId): void
    {
        $exists = Company::query()
            ->whereNull('deleted_at')
            ->sharedLock()
            ->whereKey($companyId)
            ->exists();

        if (! $exists) {
            throw ValidationException::withMessages([
                'company_id' => ['The selected company is invalid or has been deleted.'],
            ]);
        }
    }

    private function lockAndAssertMutablePayrollRun(int $payrollRunId, int $companyId): PayrollRun
    {
        $payrollRun = PayrollRun::query()
            ->whereNull('deleted_at')
            ->lockForUpdate()
            ->find($payrollRunId);

        if ($payrollRun === null || (int) $payrollRun->company_id !== $companyId) {
            throw ValidationException::withMessages([
                'payroll_run_id' => ['The selected payroll run does not belong to the specified company.'],
            ]);
        }

        if ($this->isRunLockedStatus($payrollRun)) {
            throw ValidationException::withMessages([
                'payroll_run_id' => ['Cannot modify payroll items when the payroll run is approved or void.'],
            ]);
        }

        return $payrollRun;
    }

    private function assertActiveEmployee(int $employeeId, int $companyId): void
    {
        $exists = Employee::query()
            ->whereNull('deleted_at')
            ->where('company_id', $companyId)
            ->sharedLock()
            ->whereKey($employeeId)
            ->exists();

        if (! $exists) {
            throw ValidationException::withMessages([
                'employee_id' => ['The selected employee does not belong to the specified company.'],
            ]);
        }
    }

    private function assertActivePosition(?int $positionId, int $companyId): void
    {
        if ($positionId === null) {
            return;
        }

        $exists = EmployeePosition::query()
            ->whereNull('deleted_at')
            ->where('company_id', $companyId)
            ->sharedLock()
            ->whereKey($positionId)
            ->exists();

        if (! $exists) {
            throw ValidationException::withMessages([
                'employee_position_id' => ['The selected employee position does not belong to the specified company.'],
            ]);
        }
    }

    private function isRunLockedStatus(PayrollRun $payrollRun): bool
    {
        $status = $payrollRun->status instanceof PayrollRunStatus
            ? $payrollRun->status
            : PayrollRunStatus::tryFrom((string) $payrollRun->status);

        return in_array($status, [PayrollRunStatus::APPROVED, PayrollRunStatus::VOID], true);
    }

    private function isItemFinalized(PayrollItem $payrollItem): bool
    {
        $status = $payrollItem->status instanceof PayrollItemStatus
            ? $payrollItem->status
            : PayrollItemStatus::tryFrom((string) $payrollItem->status);

        return $status === PayrollItemStatus::FINALIZED;
    }

    public static function forgetListCache(): void
    {
        Cache::forget(self::CACHE_KEY_LIST);
    }

    private function forgetCaches(): void
    {
        self::forgetListCache();
        PayrollRunService::forgetListCache();
        Cache::forget(ChoService::CACHE_KEY);
    }
}
