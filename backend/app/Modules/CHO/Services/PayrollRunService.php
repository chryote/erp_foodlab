<?php

namespace App\Modules\CHO\Services;

use App\Enums\PayrollRunStatus;
use App\Models\Company;
use App\Models\PayrollRun;
use App\Modules\CHO\Requests\SavePayrollRunRequest;
use App\Support\ActiveCompany;
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

class PayrollRunService
{
    public const CACHE_KEY_LIST = 'erp_foodlab:cho:payroll_runs:list';

    /**
     * @var array<int, string>
     */
    private const RELATIONS = ['company', 'approver'];

    /**
     * Rollup columns maintained exclusively by PayrollItem write transactions.
     *
     * @var list<string>
     */
    private const SERVER_MANAGED_TOTALS = [
        'total_base_salary',
        'total_bpjs_kesehatan',
        'total_bpjs_ketenagakerjaan',
        'total_bonus',
        'total_overtime',
        'total_deduction',
        'total_thr',
        'total_pph21',
        'total_net',
    ];

    /**
     * @return LengthAwarePaginator|Collection<int, PayrollRun>
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
    public function createPayrollRun(array $attributes): PayrollRun
    {
        $attributes = $this->sanitizeAttributes($attributes);

        $payrollRun = DB::transaction(function () use ($attributes): PayrollRun {
            $companyId = (int) $attributes['company_id'];
            $periodDate = (string) $attributes['period_date'];
            $code = $attributes['code'] ?? null;
            $name = (string) $attributes['name'];
            $statusValue = (string) ($attributes['status'] ?? PayrollRunStatus::DRAFT->value);
            $status = PayrollRunStatus::tryFrom($statusValue);

            if ($status === null || $status === PayrollRunStatus::VOID) {
                throw ValidationException::withMessages([
                    'status' => ['Invalid initial status for payroll run.'],
                ]);
            }

            $this->assertWriteConstraints($companyId, $periodDate, $code, $name);

            if ($status === PayrollRunStatus::APPROVED) {
                $attributes['approved_by'] ??= auth()->id();
                $attributes['approved_at'] ??= now();
            } else {
                unset($attributes['approved_by'], $attributes['approved_at']);
            }

            $attributes['status'] = $status->value;

            return PayrollRun::query()->create($attributes);
        });

        $this->forgetCaches((int) $payrollRun->company_id);

        return $payrollRun->load(self::RELATIONS);
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    public function updatePayrollRun(PayrollRun $payrollRun, array $attributes): PayrollRun
    {
        $attributes = $this->sanitizeAttributes($attributes);

        $updated = DB::transaction(function () use ($payrollRun, $attributes): PayrollRun {
            $locked = PayrollRun::query()->lockForUpdate()->findOrFail($payrollRun->getKey());

            $targetCompanyId = (int) ($attributes['company_id'] ?? $locked->company_id);
            if ($targetCompanyId !== (int) $locked->company_id && $locked->items()->exists()) {
                throw ValidationException::withMessages([
                    'company_id' => [
                        'Cannot change company for a payroll run that still has active payroll items.',
                    ],
                ]);
            }

            $currentStatus = $locked->status instanceof PayrollRunStatus
                ? $locked->status
                : PayrollRunStatus::from((string) $locked->status);

            if (array_key_exists('status', $attributes)) {
                $targetStatus = PayrollRunStatus::tryFrom((string) $attributes['status']);
                if ($targetStatus === null || ! $currentStatus->canTransitionTo($targetStatus)) {
                    throw ValidationException::withMessages([
                        'status' => [
                            "Cannot transition payroll run status from {$currentStatus->value} to ".($attributes['status'] ?? 'invalid').'.',
                        ],
                    ]);
                }

                if ($targetStatus === PayrollRunStatus::APPROVED && $currentStatus !== PayrollRunStatus::APPROVED) {
                    $attributes['approved_by'] ??= auth()->id();
                    $attributes['approved_at'] ??= now();
                } else {
                    unset($attributes['approved_by'], $attributes['approved_at']);
                }

                $attributes['status'] = $targetStatus->value;
            } else {
                unset($attributes['approved_by'], $attributes['approved_at']);
            }

            $targetPeriodDate = (string) ($attributes['period_date'] ?? $locked->period_date?->format('Y-m-d'));
            $targetCode = array_key_exists('code', $attributes) ? $attributes['code'] : $locked->code;
            $targetName = (string) ($attributes['name'] ?? $locked->name);

            $this->assertWriteConstraints($targetCompanyId, $targetPeriodDate, $targetCode, $targetName, $locked);

            $locked->update($attributes);

            return $locked;
        });

        $this->forgetCaches((int) $payrollRun->company_id);
        $this->forgetCaches((int) $updated->company_id);

        return $updated->refresh()->load(self::RELATIONS);
    }

    public function deletePayrollRun(PayrollRun $payrollRun): void
    {
        $companyId = (int) $payrollRun->company_id;

        DB::transaction(function () use ($payrollRun): void {
            $locked = PayrollRun::query()->lockForUpdate()->findOrFail($payrollRun->getKey());

            $locked->items()->delete();
            $locked->delete();
        });

        $this->forgetCaches($companyId);
    }

    private function query(Request $request): QueryBuilder
    {
        return IndexQuery::make(PayrollRun::class, $request)
            ->allowedFilters([
                AllowedFilter::exact('company_id'),
                AllowedFilter::exact('status'),
                AllowedFilter::callback('period_date', function (Builder $query, mixed $value): void {
                    $raw = trim((string) $value);
                    if ($raw === '') {
                        return;
                    }

                    $normalized = SavePayrollRunRequest::normalizePeriodDate($raw) ?? $raw;
                    $query->whereDate('period_date', $normalized);
                }),
                AllowedFilter::callback('period_from', function (Builder $query, mixed $value): void {
                    $raw = trim((string) $value);
                    if ($raw === '') {
                        return;
                    }

                    $query->whereDate('period_date', '>=', $raw);
                }),
                AllowedFilter::callback('period_to', function (Builder $query, mixed $value): void {
                    $raw = trim((string) $value);
                    if ($raw === '') {
                        return;
                    }

                    $query->whereDate('period_date', '<=', $raw);
                }),
                AllowedFilter::callback('search', function (Builder $query, mixed $value): void {
                    $escaped = IndexQuery::escapeLike($value);
                    if ($escaped === null) {
                        return;
                    }

                    $query->where(function (Builder $searchQuery) use ($escaped): void {
                        IndexQuery::whereLike($searchQuery, 'code', $escaped);
                        IndexQuery::orWhereLike($searchQuery, 'name', $escaped);
                    });
                }),
            ])
            ->allowedSorts(['period_date', 'name', 'status', 'total_net', 'id'])
            ->allowedIncludes(['company', 'approver', 'items'])
            ->defaultSort('-period_date', '-id');
    }

    /**
     * @param  array<string, mixed>  $attributes
     * @return array<string, mixed>
     */
    private function sanitizeAttributes(array $attributes): array
    {
        foreach (self::SERVER_MANAGED_TOTALS as $totalColumn) {
            unset($attributes[$totalColumn]);
        }

        if (array_key_exists('code', $attributes)) {
            $attributes['code'] = $attributes['code'] !== null
                ? InputNormalizer::nullableText((string) $attributes['code'])
                : null;
        }

        if (array_key_exists('name', $attributes)) {
            $attributes['name'] = InputNormalizer::text((string) $attributes['name']) ?? '';
        }

        if (array_key_exists('notes', $attributes)) {
            $attributes['notes'] = $attributes['notes'] !== null
                ? InputNormalizer::nullableText((string) $attributes['notes'])
                : null;
        }

        if (array_key_exists('period_date', $attributes) && is_string($attributes['period_date'])) {
            $attributes['period_date'] = SavePayrollRunRequest::normalizePeriodDate($attributes['period_date'])
                ?? $attributes['period_date'];
        }

        return $attributes;
    }

    private function assertWriteConstraints(
        int $companyId,
        string $periodDate,
        mixed $code,
        string $name,
        ?PayrollRun $existing = null,
    ): void {
        $companyExists = Company::query()
            ->whereNull('deleted_at')
            ->sharedLock()
            ->whereKey($companyId)
            ->exists();

        if (! $companyExists) {
            throw ValidationException::withMessages([
                'company_id' => ['The selected company is invalid or has been deleted.'],
            ]);
        }

        $duplicatePeriod = PayrollRun::query()
            ->whereNull('deleted_at')
            ->where('company_id', $companyId)
            ->whereDate('period_date', $periodDate)
            ->when($existing !== null, fn ($q) => $q->whereKeyNot($existing->getKey()))
            ->sharedLock()
            ->exists();

        if ($duplicatePeriod) {
            throw ValidationException::withMessages([
                'period_date' => ['Periode payroll untuk perusahaan ini sudah terdaftar.'],
            ]);
        }

        WriteGuard::assertCompanyCodeAndNameUnique(
            PayrollRun::class,
            $companyId,
            $code !== null ? (string) $code : null,
            $name,
            'Nama payroll run sudah terdaftar pada perusahaan ini.',
            $existing?->getKey()
        );
    }

    private function forgetCaches(int $companyId): void
    {
        Cache::forget(self::CACHE_KEY_LIST);
        Cache::forget(PayrollItemService::CACHE_KEY_LIST);
        Cache::forget(ChoService::CACHE_KEY);
        ActiveCompany::forgetCompanyCache($companyId);
    }
}
