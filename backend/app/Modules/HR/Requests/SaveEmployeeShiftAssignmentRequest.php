<?php

namespace App\Modules\HR\Requests;

use App\Models\Employee;
use App\Models\EmployeeShift;
use App\Models\EmployeeShiftAssignment;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class SaveEmployeeShiftAssignmentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $normalized = [];

        foreach (['end_date', 'notes'] as $nullableField) {
            if ($this->has($nullableField) && is_string($this->input($nullableField))) {
                $trimmed = trim($this->input($nullableField));
                $normalized[$nullableField] = $trimmed === '' ? null : $trimmed;
            }
        }

        if ($this->has('effective_date') && is_string($this->input('effective_date'))) {
            $normalized['effective_date'] = trim($this->input('effective_date'));
        }

        if ($normalized !== []) {
            $this->merge($normalized);
        }
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $presence = $this->isMethod('PATCH') ? ['sometimes', 'required'] : ['required'];
        $assignment = $this->route('employeeShiftAssignment');
        $companyId = $this->filled('company_id')
            ? (int) $this->input('company_id')
            : ($assignment instanceof EmployeeShiftAssignment ? (int) $assignment->company_id : 0);

        return [
            'company_id' => [
                ...$presence,
                'integer',
                Rule::exists('companies', 'id')->whereNull('deleted_at'),
            ],
            'employee_id' => [
                ...$presence,
                'integer',
                Rule::exists('employees', 'id')
                    ->whereNull('deleted_at')
                    ->where('company_id', $companyId),
            ],
            'employee_shift_id' => [
                ...$presence,
                'integer',
                Rule::exists('employee_shifts', 'id')
                    ->whereNull('deleted_at')
                    ->where('company_id', $companyId),
            ],
            'effective_date' => [...$presence, 'date_format:Y-m-d'],
            'end_date' => ['sometimes', 'nullable', 'date_format:Y-m-d'],
            'notes' => ['sometimes', 'nullable', 'string', 'max:255'],
        ];
    }

    /**
     * @return array<int, callable(Validator): void>
     */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                /** @var EmployeeShiftAssignment|null $assignment */
                $assignment = $this->route('employeeShiftAssignment');

                $effectiveCompanyId = $this->filled('company_id')
                    ? (int) $this->input('company_id')
                    : ($assignment instanceof EmployeeShiftAssignment ? (int) $assignment->company_id : 0);

                $effectiveEmployeeId = $this->filled('employee_id')
                    ? (int) $this->input('employee_id')
                    : ($assignment instanceof EmployeeShiftAssignment ? (int) $assignment->employee_id : 0);

                $effectiveShiftId = $this->filled('employee_shift_id')
                    ? (int) $this->input('employee_shift_id')
                    : ($assignment instanceof EmployeeShiftAssignment ? (int) $assignment->employee_shift_id : 0);

                $effectiveStartDate = $this->filled('effective_date')
                    ? (string) $this->input('effective_date')
                    : ($assignment instanceof EmployeeShiftAssignment ? $assignment->effective_date?->format('Y-m-d') : null);

                $effectiveEndDate = $this->has('end_date')
                    ? ($this->input('end_date') !== null ? (string) $this->input('end_date') : null)
                    : ($assignment instanceof EmployeeShiftAssignment ? $assignment->end_date?->format('Y-m-d') : null);

                if (
                    ! $validator->errors()->hasAny(['effective_date', 'end_date'])
                    && $effectiveStartDate !== null
                    && $effectiveEndDate !== null
                    && $effectiveEndDate < $effectiveStartDate
                ) {
                    $validator->errors()->add(
                        'end_date',
                        'End date must be greater than or equal to effective date.'
                    );
                }

                // On PATCH changing company_id without re-sending employee_id or employee_shift_id
                if ($assignment instanceof EmployeeShiftAssignment && $this->filled('company_id') && ! $validator->errors()->has('company_id')) {
                    if (! $this->has('employee_id') && $effectiveEmployeeId > 0) {
                        $employeeMatches = Employee::query()
                            ->whereKey($effectiveEmployeeId)
                            ->where('company_id', $effectiveCompanyId)
                            ->exists();

                        if (! $employeeMatches) {
                            $validator->errors()->add(
                                'employee_id',
                                'The selected employee does not belong to the specified company.'
                            );
                        }
                    }

                    if (! $this->has('employee_shift_id') && $effectiveShiftId > 0) {
                        $shiftMatches = EmployeeShift::query()
                            ->whereKey($effectiveShiftId)
                            ->where('company_id', $effectiveCompanyId)
                            ->exists();

                        if (! $shiftMatches) {
                            $validator->errors()->add(
                                'employee_shift_id',
                                'The selected employee shift does not belong to the specified company.'
                            );
                        }
                    }
                }
            },
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function payload(): array
    {
        $validated = $this->validated();

        foreach (['company_id', 'employee_id', 'employee_shift_id'] as $intFk) {
            if (array_key_exists($intFk, $validated)) {
                $validated[$intFk] = (int) $validated[$intFk];
            }
        }

        if (array_key_exists('notes', $validated)) {
            $notes = $validated['notes'] !== null ? trim((string) $validated['notes']) : null;
            $validated['notes'] = ($notes === null || $notes === '') ? null : $notes;
        }

        return $validated;
    }
}
