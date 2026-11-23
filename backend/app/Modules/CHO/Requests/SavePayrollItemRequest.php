<?php

namespace App\Modules\CHO\Requests;

use App\Enums\PayrollGroup;
use App\Enums\PayrollItemStatus;
use App\Enums\PayrollRunStatus;
use App\Models\Employee;
use App\Models\EmployeePosition;
use App\Models\PayrollItem;
use App\Models\PayrollRun;
use App\Support\InputNormalizer;
use App\Support\WriteGuard;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class SavePayrollItemRequest extends FormRequest
{
    private const MAX_DECIMAL_18_2 = 9999999999999999.99;

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

    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $normalized = [];

        foreach (['bank_account_number', 'notes'] as $field) {
            if ($this->has($field) && is_string($this->input($field))) {
                $normalized[$field] = InputNormalizer::nullableText($this->input($field));
            }
        }

        if ($normalized !== []) {
            $this->merge($normalized);
        }
    }

    /**
     * Computed total_net is server-managed and ignored from client input.
     *
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        /** @var PayrollItem|null $routeItem */
        $routeItem = $this->route('payrollItem');
        $companyId = (int) ($this->filled('company_id') ? $this->input('company_id') : ($routeItem?->company_id ?? 0));
        $presence = $this->isMethod('PATCH') ? ['sometimes', 'required'] : ['required'];
        $moneyRules = ['numeric', 'min:0', 'max:9999999999999999.99', 'decimal:0,2'];

        return [
            'company_id' => [
                ...$presence,
                'integer',
                Rule::exists('companies', 'id')->whereNull('deleted_at'),
            ],
            'payroll_run_id' => [
                ...$presence,
                'integer',
                Rule::exists('payroll_runs', 'id')
                    ->whereNull('deleted_at')
                    ->where('company_id', $companyId),
            ],
            'employee_id' => [
                ...$presence,
                'integer',
                Rule::exists('employees', 'id')
                    ->whereNull('deleted_at')
                    ->where('company_id', $companyId),
            ],
            'employee_position_id' => [
                'sometimes',
                'nullable',
                'integer',
                Rule::exists('employee_positions', 'id')
                    ->whereNull('deleted_at'),
            ],
            'payroll_group' => ['sometimes', 'required', 'string', Rule::enum(PayrollGroup::class)],
            'bank_account_number' => ['sometimes', 'nullable', 'string', 'max:50'],
            'base_salary' => [...$presence, ...$moneyRules],
            'bpjs_kesehatan' => ['sometimes', 'nullable', ...$moneyRules],
            'bpjs_ketenagakerjaan' => ['sometimes', 'nullable', ...$moneyRules],
            'bonus' => ['sometimes', 'nullable', ...$moneyRules],
            'overtime' => ['sometimes', 'nullable', ...$moneyRules],
            'deduction' => ['sometimes', 'nullable', ...$moneyRules],
            'thr' => ['sometimes', 'nullable', ...$moneyRules],
            'pph21' => ['sometimes', 'nullable', ...$moneyRules],
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
                /** @var PayrollItem|null $routeItem */
                $routeItem = $this->route('payrollItem');

                if (! $validator->errors()->hasAny(self::MONEY_FIELDS)) {
                    $amounts = [];
                    foreach (self::MONEY_FIELDS as $field) {
                        $amounts[$field] = $this->has($field)
                            ? round((float) ($this->input($field) ?? 0), 2)
                            : round((float) ($routeItem?->{$field} ?? 0), 2);
                    }

                    $totalNet = round(
                        ($amounts['base_salary'] + $amounts['bonus'] + $amounts['overtime'] + $amounts['thr'])
                        - ($amounts['bpjs_kesehatan'] + $amounts['bpjs_ketenagakerjaan'] + $amounts['deduction'] + $amounts['pph21']),
                        2
                    );

                    if ($totalNet < 0) {
                        $validator->errors()->add(
                            'total_net',
                            'The computed total net cannot be negative.'
                        );
                    } elseif ($totalNet >= 10000000000000000.0) {
                        $validator->errors()->add(
                            'total_net',
                            'The computed total net exceeds the maximum supported decimal(18,2) amount.'
                        );
                    }
                }

                if ($validator->errors()->has('company_id')) {
                    return;
                }

                $effectiveCompanyId = $this->filled('company_id')
                    ? (int) $this->input('company_id')
                    : (int) ($routeItem?->company_id ?? 0);

                if ($effectiveCompanyId <= 0) {
                    return;
                }

                $effectiveRunId = $this->filled('payroll_run_id')
                    ? (int) $this->input('payroll_run_id')
                    : (int) ($routeItem?->payroll_run_id ?? 0);

                $effectiveEmployeeId = $this->filled('employee_id')
                    ? (int) $this->input('employee_id')
                    : (int) ($routeItem?->employee_id ?? 0);

                $effectivePositionId = $this->has('employee_position_id')
                    ? ($this->input('employee_position_id') !== null ? (int) $this->input('employee_position_id') : null)
                    : $routeItem?->employee_position_id;

                if ($routeItem instanceof PayrollItem && $routeItem->status === PayrollItemStatus::FINALIZED) {
                    $validator->errors()->add(
                        'payroll_item',
                        'Cannot modify a payroll item that has already been finalized.'
                    );
                }

                if ($routeItem instanceof PayrollItem && ! $validator->errors()->has('payroll_run_id')) {
                    $existingRun = PayrollRun::query()
                        ->whereNull('deleted_at')
                        ->find($routeItem->payroll_run_id);

                    if ($existingRun !== null && in_array($existingRun->status, [PayrollRunStatus::APPROVED, PayrollRunStatus::VOID], true)) {
                        $validator->errors()->add(
                            'payroll_run_id',
                            'Cannot modify payroll items when the payroll run is approved or void.'
                        );
                    }
                }

                if (! $validator->errors()->has('payroll_run_id') && $effectiveRunId > 0) {
                    $targetRun = PayrollRun::query()
                        ->whereNull('deleted_at')
                        ->find($effectiveRunId);

                    if ($targetRun === null || (int) $targetRun->company_id !== $effectiveCompanyId) {
                        $validator->errors()->add(
                            'payroll_run_id',
                            'The selected payroll run does not belong to the specified company.'
                        );
                    } elseif (in_array($targetRun->status, [PayrollRunStatus::APPROVED, PayrollRunStatus::VOID], true)) {
                        $validator->errors()->add(
                            'payroll_run_id',
                            'Cannot modify payroll items when the payroll run is approved or void.'
                        );
                    }
                }

                if (! $validator->errors()->has('employee_id') && $effectiveEmployeeId > 0) {
                    $employeeValid = Employee::query()
                        ->whereNull('deleted_at')
                        ->where('company_id', $effectiveCompanyId)
                        ->whereKey($effectiveEmployeeId)
                        ->exists();

                    if (! $employeeValid) {
                        $validator->errors()->add(
                            'employee_id',
                            'The selected employee does not belong to the specified company.'
                        );
                    }
                }

                if (! $validator->errors()->has('employee_position_id') && $effectivePositionId !== null) {
                    $positionValid = EmployeePosition::query()
                        ->whereNull('deleted_at')
                        ->whereKey((int) $effectivePositionId)
                        ->exists();

                    if (! $positionValid) {
                        $validator->errors()->add(
                            'employee_position_id',
                            'The selected employee position is invalid or has been deleted.'
                        );
                    }
                }

                if (
                    ! $validator->errors()->hasAny(['company_id', 'payroll_run_id', 'employee_id'])
                    && $effectiveRunId > 0
                    && $effectiveEmployeeId > 0
                    && WriteGuard::existsCaseInsensitive(
                        PayrollItem::query(),
                        'employee_id',
                        (string) $effectiveEmployeeId,
                        [
                            'company_id' => $effectiveCompanyId,
                            'payroll_run_id' => $effectiveRunId,
                        ],
                        $routeItem?->getKey()
                    )
                ) {
                    $validator->errors()->add(
                        'employee_id',
                        'Karyawan sudah terdaftar pada payroll run ini.'
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
        $isPatch = $this->isMethod('PATCH');
        /** @var PayrollItem|null $routeItem */
        $routeItem = $this->route('payrollItem');

        foreach (['company_id', 'payroll_run_id', 'employee_id'] as $intField) {
            if (array_key_exists($intField, $validated)) {
                $validated[$intField] = (int) $validated[$intField];
            }
        }

        if (array_key_exists('employee_position_id', $validated)) {
            $validated['employee_position_id'] = $validated['employee_position_id'] !== null
                ? (int) $validated['employee_position_id']
                : null;
        }

        foreach (['bank_account_number', 'notes'] as $textField) {
            if (array_key_exists($textField, $validated)) {
                $validated[$textField] = $validated[$textField] !== null
                    ? InputNormalizer::nullableText((string) $validated[$textField])
                    : null;
            }
        }

        if (! array_key_exists('payroll_group', $validated) && ! $isPatch && ! ($routeItem instanceof PayrollItem)) {
            $validated['payroll_group'] = PayrollGroup::OFFICE->value;
        }

        foreach (self::MONEY_FIELDS as $moneyField) {
            if (array_key_exists($moneyField, $validated)) {
                $validated[$moneyField] = $validated[$moneyField] !== null
                    ? round((float) $validated[$moneyField], 2)
                    : 0.0;
            } elseif (! $isPatch && ! ($routeItem instanceof PayrollItem)) {
                $validated[$moneyField] = 0.0;
            }
        }

        return $validated;
    }
}
