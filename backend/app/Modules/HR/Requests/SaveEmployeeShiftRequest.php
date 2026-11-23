<?php

namespace App\Modules\HR\Requests;

use App\Enums\ShiftStatusEnum;
use App\Models\EmployeeShift;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class SaveEmployeeShiftRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $normalized = [];

        foreach (['code', 'description'] as $nullableTextField) {
            if ($this->has($nullableTextField) && is_string($this->input($nullableTextField))) {
                $trimmed = trim($this->input($nullableTextField));
                $normalized[$nullableTextField] = $trimmed === '' ? null : $trimmed;
            }
        }

        foreach (['name', 'start_time', 'end_time'] as $textField) {
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
        $presence = $this->isMethod('PATCH') ? ['sometimes', 'required'] : ['required'];
        $employeeShift = $this->route('employeeShift');
        $companyId = $this->filled('company_id')
            ? (int) $this->input('company_id')
            : ($employeeShift instanceof EmployeeShift ? (int) $employeeShift->company_id : 0);

        $timeFormatRule = 'regex:/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/';

        return [
            'company_id' => [
                ...$presence,
                'integer',
                Rule::exists('companies', 'id')->whereNull('deleted_at'),
            ],
            'code' => [
                'sometimes',
                'nullable',
                'string',
                'max:50',
                Rule::unique('employee_shifts', 'code')
                    ->where('company_id', $companyId)
                    ->whereNull('deleted_at')
                    ->ignore($employeeShift),
            ],
            'name' => [...$presence, 'string', 'max:150'],
            'start_time' => [...$presence, 'string', $timeFormatRule],
            'end_time' => [...$presence, 'string', $timeFormatRule],
            'break_minutes' => ['sometimes', 'nullable', 'integer', 'min:0', 'max:1440'],
            'grace_period_minutes' => ['sometimes', 'nullable', 'integer', 'min:0', 'max:1440'],
            'is_overnight' => ['sometimes', 'boolean'],
            'status' => ['sometimes', Rule::enum(ShiftStatusEnum::class)],
            'description' => ['sometimes', 'nullable', 'string'],
        ];
    }

    /**
     * @return array<int, callable(Validator): void>
     */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                /** @var EmployeeShift|null $employeeShift */
                $employeeShift = $this->route('employeeShift');

                if (! $validator->errors()->hasAny(['start_time', 'end_time', 'is_overnight'])) {
                    $startRaw = $this->has('start_time')
                        ? $this->input('start_time')
                        : $employeeShift?->start_time;
                    $endRaw = $this->has('end_time')
                        ? $this->input('end_time')
                        : $employeeShift?->end_time;
                    $isOvernight = $this->has('is_overnight')
                        ? filter_var($this->input('is_overnight'), FILTER_VALIDATE_BOOLEAN)
                        : (bool) ($employeeShift?->is_overnight ?? false);

                    if (is_string($startRaw) && is_string($endRaw)) {
                        $startTime = $this->normalizeTime($startRaw);
                        $endTime = $this->normalizeTime($endRaw);

                        if (! $isOvernight && $endTime <= $startTime) {
                            $validator->errors()->add(
                                'end_time',
                                'End time must be after start time unless the shift is overnight.'
                            );
                        }
                    }
                }

                // On PATCH changing company_id without re-sending code, re-check existing code uniqueness
                if (
                    $employeeShift instanceof EmployeeShift
                    && $this->filled('company_id')
                    && ! $this->has('code')
                    && $employeeShift->code !== null
                    && ! $validator->errors()->has('company_id')
                ) {
                    $duplicate = EmployeeShift::query()
                        ->where('company_id', (int) $this->input('company_id'))
                        ->where('code', $employeeShift->code)
                        ->whereKeyNot($employeeShift->getKey())
                        ->exists();

                    if ($duplicate) {
                        $validator->errors()->add(
                            'code',
                            'The shift code has already been taken for the selected company.'
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
        $isPatch = $this->isMethod('PATCH');

        if (array_key_exists('company_id', $validated)) {
            $validated['company_id'] = (int) $validated['company_id'];
        }

        if (array_key_exists('code', $validated)) {
            $code = $validated['code'] !== null ? trim((string) $validated['code']) : null;
            $validated['code'] = ($code === null || $code === '') ? null : $code;
        }

        if (array_key_exists('name', $validated)) {
            $validated['name'] = trim((string) $validated['name']);
        }

        if (array_key_exists('start_time', $validated)) {
            $validated['start_time'] = $this->normalizeTime((string) $validated['start_time']);
        }

        if (array_key_exists('end_time', $validated)) {
            $validated['end_time'] = $this->normalizeTime((string) $validated['end_time']);
        }

        foreach (['break_minutes', 'grace_period_minutes'] as $intField) {
            if (array_key_exists($intField, $validated)) {
                $validated[$intField] = $validated[$intField] !== null ? (int) $validated[$intField] : 0;
            } elseif (! $isPatch) {
                $validated[$intField] = 0;
            }
        }

        if (array_key_exists('is_overnight', $validated)) {
            $validated['is_overnight'] = (bool) $validated['is_overnight'];
        } elseif (! $isPatch) {
            $validated['is_overnight'] = false;
        }

        if (! array_key_exists('status', $validated) && ! $isPatch) {
            $validated['status'] = ShiftStatusEnum::ACTIVE->value;
        }

        if (array_key_exists('description', $validated)) {
            $description = $validated['description'] !== null ? trim((string) $validated['description']) : null;
            $validated['description'] = ($description === null || $description === '') ? null : $description;
        }

        return $validated;
    }

    private function normalizeTime(string $time): string
    {
        $trimmed = trim($time);

        return strlen($trimmed) === 5 ? $trimmed.':00' : $trimmed;
    }
}
