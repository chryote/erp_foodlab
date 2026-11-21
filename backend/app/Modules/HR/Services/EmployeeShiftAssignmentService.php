<?php

namespace App\Modules\HR\Services;

use App\Models\EmployeeShiftAssignment;
use App\Support\IndexQuery;
use Carbon\CarbonImmutable;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Spatie\QueryBuilder\AllowedFilter;
use Spatie\QueryBuilder\QueryBuilder;

class EmployeeShiftAssignmentService
{
    public const CACHE_KEY_LIST = 'erp_foodlab:hr:employee_shift_assignments:list';

    /**
     * @var array<int, string>
     */
    private const RELATIONS = ['company', 'employee', 'employeeShift'];

    /**
     * @return LengthAwarePaginator|Collection<int, EmployeeShiftAssignment>
     */
    public function list(Request $request): LengthAwarePaginator|Collection
    {
        $query = IndexQuery::withDefaultRelations($this->query($request), $request, self::RELATIONS);

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
    public function createEmployeeShiftAssignment(array $attributes): EmployeeShiftAssignment
    {
        $assignment = DB::transaction(function () use ($attributes): EmployeeShiftAssignment {
            $this->assertNoActiveOverlapOrDuplicate(
                (int) $attributes['company_id'],
                (int) $attributes['employee_id'],
                (string) $attributes['effective_date'],
                isset($attributes['end_date']) ? (string) $attributes['end_date'] : null,
            );

            return EmployeeShiftAssignment::query()->create($attributes);
        });

        Cache::forget(self::CACHE_KEY_LIST);

        return $assignment->load(self::RELATIONS);
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    public function updateEmployeeShiftAssignment(
        EmployeeShiftAssignment $employeeShiftAssignment,
        array $attributes
    ): EmployeeShiftAssignment {
        $updated = DB::transaction(function () use ($employeeShiftAssignment, $attributes): EmployeeShiftAssignment {
            $locked = EmployeeShiftAssignment::query()
                ->lockForUpdate()
                ->findOrFail($employeeShiftAssignment->getKey());

            $companyId = (int) ($attributes['company_id'] ?? $locked->company_id);
            $employeeId = (int) ($attributes['employee_id'] ?? $locked->employee_id);
            $effectiveDate = (string) ($attributes['effective_date'] ?? $locked->effective_date?->format('Y-m-d'));
            $endDate = array_key_exists('end_date', $attributes)
                ? ($attributes['end_date'] !== null ? (string) $attributes['end_date'] : null)
                : $locked->end_date?->format('Y-m-d');

            $this->assertNoActiveOverlapOrDuplicate(
                $companyId,
                $employeeId,
                $effectiveDate,
                $endDate,
                $locked->getKey(),
            );

            $locked->update($attributes);

            return $locked;
        });

        Cache::forget(self::CACHE_KEY_LIST);

        return $updated->refresh()->load(self::RELATIONS);
    }

    public function deleteEmployeeShiftAssignment(EmployeeShiftAssignment $employeeShiftAssignment): void
    {
        DB::transaction(function () use ($employeeShiftAssignment): void {
            $locked = EmployeeShiftAssignment::query()
                ->lockForUpdate()
                ->findOrFail($employeeShiftAssignment->getKey());
            $locked->delete();
        });

        Cache::forget(self::CACHE_KEY_LIST);
    }

    /**
     * Locks the employee's active shift assignments inside the current transaction
     * and rejects exact duplicates or overlapping date ranges.
     */
    private function assertNoActiveOverlapOrDuplicate(
        int $companyId,
        int $employeeId,
        string $effectiveDate,
        ?string $endDate,
        ?int $excludeId = null
    ): void {
        $effectiveDateStr = CarbonImmutable::parse($effectiveDate)->format('Y-m-d');
        $endDateStr = $endDate !== null ? CarbonImmutable::parse($endDate)->format('Y-m-d') : null;

        if ($endDateStr !== null && $endDateStr < $effectiveDateStr) {
            throw ValidationException::withMessages([
                'end_date' => [
                    'End date must be greater than or equal to effective date.',
                ],
            ]);
        }

        $activeAssignments = EmployeeShiftAssignment::query()
            ->where('employee_id', $employeeId)
            ->lockForUpdate()
            ->get();

        foreach ($activeAssignments as $existing) {
            if ($excludeId !== null && (int) $existing->getKey() === $excludeId) {
                continue;
            }

            $existingStart = $existing->effective_date?->format('Y-m-d');
            $existingEnd = $existing->end_date?->format('Y-m-d');

            if ((int) $existing->company_id === $companyId && $existingStart === $effectiveDateStr) {
                throw ValidationException::withMessages([
                    'effective_date' => [
                        'An active shift assignment already exists for this employee on the specified effective date.',
                    ],
                ]);
            }

            $overlaps = ($existingEnd === null || $effectiveDateStr <= $existingEnd)
                && ($endDateStr === null || ($existingStart !== null && $existingStart <= $endDateStr));

            if ($overlaps) {
                throw ValidationException::withMessages([
                    'effective_date' => [
                        'The shift assignment date range overlaps with an existing active assignment for this employee.',
                    ],
                ]);
            }
        }
    }

    private function query(Request $request): QueryBuilder
    {
        return IndexQuery::make(EmployeeShiftAssignment::class, $request)
            ->allowedFilters([
                AllowedFilter::exact('company_id'),
                AllowedFilter::exact('employee_id'),
                AllowedFilter::exact('employee_shift_id'),
                AllowedFilter::callback('effective_date', function (Builder $query, mixed $value): void {
                    $query->whereDate('effective_date', (string) $value);
                }),
                AllowedFilter::callback('end_date', function (Builder $query, mixed $value): void {
                    $query->whereDate('end_date', (string) $value);
                }),
            ])
            ->allowedSorts(['effective_date', 'end_date', 'created_at'])
            ->allowedIncludes(self::RELATIONS)
            ->defaultSort('-effective_date', '-id');
    }
}
