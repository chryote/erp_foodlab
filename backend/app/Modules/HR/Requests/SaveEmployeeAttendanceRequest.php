<?php

namespace App\Modules\HR\Requests;

use App\Enums\AttendanceStatusEnum;
use App\Models\Employee;
use App\Models\EmployeeAttendance;
use App\Models\EmployeeShift;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class SaveEmployeeAttendanceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $normalized = [];

        if ($this->has('notes') && is_string($this->input('notes'))) {
            $trimmed = trim($this->input('notes'));
            $normalized['notes'] = $trimmed === '' ? null : $trimmed;
        }

        foreach (['attendance_date', 'status'] as $textField) {
            if ($this->has($textField) && is_string($this->input($textField))) {
                $normalized[$textField] = trim($this->input($textField));
            }
        }

        if ($this->has('employee_attendance_code') && is_string($this->input('employee_attendance_code'))) {
            $trimmedCode = trim($this->input('employee_attendance_code'));
            $normalized['employee_attendance_code'] = $trimmedCode === '' ? null : $trimmedCode;

            if ($trimmedCode !== '' && ! $this->filled('employee_id')) {
                $employee = Employee::query()
                    ->where('employee_attendance_code', $trimmedCode)
                    ->when(
                        $this->filled('company_id'),
                        fn ($query) => $query->where('company_id', (int) $this->input('company_id'))
                    )
                    ->first(['id', 'company_id']);

                if ($employee !== null) {
                    $normalized['employee_id'] = $employee->id;

                    if (! $this->filled('company_id')) {
                        $normalized['company_id'] = $employee->company_id;
                    }
                }
            }
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
        $attendance = $this->route('employeeAttendance');
        $companyId = $this->filled('company_id')
            ? (int) $this->input('company_id')
            : ($attendance instanceof EmployeeAttendance ? (int) $attendance->company_id : 0);

        $codeExistsRule = Rule::exists('employees', 'employee_attendance_code')->whereNull('deleted_at');
        if ($this->filled('company_id')) {
            $codeExistsRule->where('company_id', $companyId);
        }

        return [
            'company_id' => [
                ...($this->isMethod('PATCH') ? ['sometimes', 'required'] : ['required_without:employee_attendance_code']),
                'integer',
                Rule::exists('companies', 'id')->whereNull('deleted_at'),
            ],
            'employee_id' => [
                ...($this->isMethod('PATCH') ? ['sometimes', 'required'] : ['required_without:employee_attendance_code']),
                'integer',
                Rule::exists('employees', 'id')
                    ->whereNull('deleted_at')
                    ->where('company_id', $companyId),
            ],
            'employee_attendance_code' => [
                'sometimes',
                'nullable',
                'string',
                'max:255',
                $codeExistsRule,
            ],
            'employee_shift_id' => [
                'sometimes',
                'nullable',
                'integer',
                Rule::exists('employee_shifts', 'id')
                    ->whereNull('deleted_at')
                    ->where('company_id', $companyId),
            ],
            'attendance_date' => [...$presence, 'date_format:Y-m-d'],
            'clock_in_at' => ['sometimes', 'nullable', 'date'],
            'clock_out_at' => ['sometimes', 'nullable', 'date'],
            'late_minutes' => ['sometimes', 'nullable', 'integer', 'min:0', 'max:65535'],
            'overtime_minutes' => ['sometimes', 'nullable', 'integer', 'min:0', 'max:65535'],
            'status' => ['sometimes', Rule::enum(AttendanceStatusEnum::class)],
            'notes' => ['sometimes', 'nullable', 'string', 'max:500'],
        ];
    }

    /**
     * @return array<int, callable(Validator): void>
     */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                /** @var EmployeeAttendance|null $attendance */
                $attendance = $this->route('employeeAttendance');

                if (! $validator->errors()->hasAny(['clock_in_at', 'clock_out_at'])) {
                    $clockInRaw = $this->has('clock_in_at')
                        ? $this->input('clock_in_at')
                        : $attendance?->clock_in_at;
                    $clockOutRaw = $this->has('clock_out_at')
                        ? $this->input('clock_out_at')
                        : $attendance?->clock_out_at;

                    if ($clockInRaw !== null && $clockOutRaw !== null) {
                        $clockIn = CarbonImmutable::parse($clockInRaw);
                        $clockOut = CarbonImmutable::parse($clockOutRaw);

                        if ($clockOut->lessThan($clockIn)) {
                            $validator->errors()->add(
                                'clock_out_at',
                                'Clock-out time must be greater than or equal to clock-in time.'
                            );
                        }
                    }
                }

                $effectiveCompanyId = $this->filled('company_id')
                    ? (int) $this->input('company_id')
                    : ($attendance instanceof EmployeeAttendance ? (int) $attendance->company_id : 0);

                $effectiveEmployeeId = $this->filled('employee_id')
                    ? (int) $this->input('employee_id')
                    : ($attendance instanceof EmployeeAttendance ? (int) $attendance->employee_id : 0);

                $effectiveShiftId = $this->has('employee_shift_id')
                    ? ($this->input('employee_shift_id') !== null ? (int) $this->input('employee_shift_id') : null)
                    : ($attendance instanceof EmployeeAttendance ? $attendance->employee_shift_id : null);

                $effectiveDate = $this->filled('attendance_date')
                    ? (string) $this->input('attendance_date')
                    : ($attendance instanceof EmployeeAttendance ? $attendance->attendance_date?->format('Y-m-d') : null);

                // On PATCH changing company_id without re-sending employee_id or employee_shift_id
                if ($attendance instanceof EmployeeAttendance && $this->filled('company_id') && ! $validator->errors()->has('company_id')) {
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

                    if (! $this->has('employee_shift_id') && $effectiveShiftId !== null) {
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

                // Active duplicate check on (company_id, employee_id, attendance_date)
                if (
                    ! $validator->errors()->hasAny(['company_id', 'employee_id', 'attendance_date'])
                    && $effectiveCompanyId > 0
                    && $effectiveEmployeeId > 0
                    && $effectiveDate !== null
                ) {
                    $duplicateQuery = EmployeeAttendance::query()
                        ->where('company_id', $effectiveCompanyId)
                        ->where('employee_id', $effectiveEmployeeId)
                        ->whereDate('attendance_date', $effectiveDate);

                    if ($attendance instanceof EmployeeAttendance) {
                        $duplicateQuery->whereKeyNot($attendance->getKey());
                    }

                    if ($duplicateQuery->exists()) {
                        $validator->errors()->add(
                            'attendance_date',
                            'An active attendance record already exists for this employee on the specified date.'
                        );
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
        unset($validated['employee_attendance_code']);
        $isPatch = $this->isMethod('PATCH');

        foreach (['company_id', 'employee_id'] as $intFk) {
            if (array_key_exists($intFk, $validated)) {
                $validated[$intFk] = (int) $validated[$intFk];
            }
        }

        if (array_key_exists('employee_shift_id', $validated)) {
            $validated['employee_shift_id'] = $validated['employee_shift_id'] !== null
                ? (int) $validated['employee_shift_id']
                : null;
        }

        foreach (['late_minutes', 'overtime_minutes'] as $intField) {
            if (array_key_exists($intField, $validated)) {
                $validated[$intField] = $validated[$intField] !== null ? (int) $validated[$intField] : 0;
            }
        }

        if (! array_key_exists('status', $validated) && ! $isPatch) {
            $validated['status'] = AttendanceStatusEnum::PRESENT->value;
        }

        if (array_key_exists('notes', $validated)) {
            $notes = $validated['notes'] !== null ? trim((string) $validated['notes']) : null;
            $validated['notes'] = ($notes === null || $notes === '') ? null : $notes;
        }

        return $validated;
    }
}
