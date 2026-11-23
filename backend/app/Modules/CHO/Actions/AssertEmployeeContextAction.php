<?php

namespace App\Modules\CHO\Actions;

use App\Models\Company;
use App\Models\Employee;
use App\Models\EmployeePosition;
use App\Models\EmploymentStatus;
use App\Models\PayrollGrade;
use App\Models\TaxStatus;
use Illuminate\Validation\ValidationException;

/**
 * Validates and shared-locks active parent records and tenant-scoped uniqueness
 * for Employee writes inside an active database transaction.
 */
class AssertEmployeeContextAction
{
    /**
     * @param  array<string, mixed>  $attributes
     */
    public function execute(array $attributes, ?Employee $existing = null): void
    {
        $companyId = (int) ($attributes['company_id'] ?? $existing?->company_id ?? 0);

        if (
            $existing !== null
            && $companyId !== (int) $existing->company_id
            && (
                $existing->employeeAttendances()->exists()
                || $existing->employeeShiftAssignments()->exists()
                || $existing->expenseItems()->exists()
            )
        ) {
            throw ValidationException::withMessages([
                'company_id' => [
                    'Cannot change company for an employee that is still referenced by attendances, shift assignments, or expense items.',
                ],
            ]);
        }

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

        $masterChecks = [
            ['field' => 'employee_position_id', 'model' => EmployeePosition::class],
            ['field' => 'employment_status_id', 'model' => EmploymentStatus::class],
            ['field' => 'payroll_grade_id', 'model' => PayrollGrade::class],
            ['field' => 'tax_status_id', 'model' => TaxStatus::class],
        ];

        foreach ($masterChecks as $check) {
            $field = $check['field'];
            $modelClass = $check['model'];
            $rawId = array_key_exists($field, $attributes)
                ? $attributes[$field]
                : $existing?->{$field};

            if ($rawId === null) {
                continue;
            }

            $exists = $modelClass::query()
                ->whereNull('deleted_at')
                ->sharedLock()
                ->whereKey((int) $rawId)
                ->exists();

            if (! $exists) {
                throw ValidationException::withMessages([
                    $field => ["The selected {$field} is invalid or has been deleted."],
                ]);
            }
        }

        $nikKtp = array_key_exists('nik_ktp', $attributes)
            ? $attributes['nik_ktp']
            : $existing?->nik_ktp;

        if ($nikKtp !== null && $nikKtp !== '') {
            $duplicateNik = Employee::query()
                ->whereNull('deleted_at')
                ->where('company_id', $companyId)
                ->where('nik_ktp', (string) $nikKtp)
                ->when($existing !== null, fn ($query) => $query->whereKeyNot($existing->getKey()))
                ->sharedLock()
                ->exists();

            if ($duplicateNik) {
                throw ValidationException::withMessages([
                    'nik_ktp' => ['NIK KTP sudah terdaftar.'],
                ]);
            }
        }
    }
}
