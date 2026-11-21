<?php

namespace App\Modules\HR\Requests;

use App\Enums\AttendanceStatusEnum;
use App\Models\Employee;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class ScanEmployeeAttendanceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $normalized = [];

        if ($this->has('employee_attendance_code') && is_string($this->input('employee_attendance_code'))) {
            $normalized['employee_attendance_code'] = trim($this->input('employee_attendance_code'));
        }

        if ($this->has('notes') && is_string($this->input('notes'))) {
            $trimmed = trim($this->input('notes'));
            $normalized['notes'] = $trimmed === '' ? null : $trimmed;
        }

        foreach (['attendance_date', 'scanned_at', 'status'] as $textField) {
            if ($this->has($textField) && is_string($this->input($textField))) {
                $normalized[$textField] = trim($this->input($textField));
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
        $companyId = $this->filled('company_id')
            ? (int) $this->input('company_id')
            : $this->resolveEmployeeCompanyId();

        return [
            'employee_attendance_code' => [
                'required',
                'string',
                'max:255',
                Rule::exists('employees', 'employee_attendance_code')->whereNull('deleted_at'),
            ],
            'company_id' => [
                'sometimes',
                'nullable',
                'integer',
                Rule::exists('companies', 'id')->whereNull('deleted_at'),
            ],
            'employee_shift_id' => [
                'sometimes',
                'nullable',
                'integer',
                Rule::exists('employee_shifts', 'id')
                    ->whereNull('deleted_at')
                    ->where('company_id', $companyId ?? 0),
            ],
            'attendance_date' => ['sometimes', 'nullable', 'date_format:Y-m-d'],
            'scanned_at' => ['sometimes', 'nullable', 'date'],
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
                if (
                    $validator->errors()->hasAny(['company_id', 'employee_attendance_code'])
                    || ! $this->filled('company_id')
                    || ! $this->filled('employee_attendance_code')
                ) {
                    return;
                }

                $matchesCompany = Employee::query()
                    ->where('employee_attendance_code', (string) $this->input('employee_attendance_code'))
                    ->where('company_id', (int) $this->input('company_id'))
                    ->exists();

                if (! $matchesCompany) {
                    $validator->errors()->add(
                        'employee_attendance_code',
                        'The employee attendance code does not belong to the specified company.'
                    );
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

        foreach (['company_id', 'employee_shift_id'] as $intKey) {
            if (array_key_exists($intKey, $validated)) {
                $validated[$intKey] = $validated[$intKey] !== null ? (int) $validated[$intKey] : null;
            }
        }

        if (array_key_exists('notes', $validated)) {
            $notes = $validated['notes'] !== null ? trim((string) $validated['notes']) : null;
            $validated['notes'] = ($notes === null || $notes === '') ? null : $notes;
        }

        return $validated;
    }

    private function resolveEmployeeCompanyId(): ?int
    {
        if (! $this->filled('employee_attendance_code')) {
            return null;
        }

        $companyId = Employee::query()
            ->where('employee_attendance_code', trim((string) $this->input('employee_attendance_code')))
            ->value('company_id');

        return $companyId !== null ? (int) $companyId : null;
    }
}
