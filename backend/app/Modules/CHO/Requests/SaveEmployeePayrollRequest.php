<?php

namespace App\Modules\CHO\Requests;

use App\Enums\PayrollGroup;
use App\Support\InputNormalizer;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SaveEmployeePayrollRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $normalized = [];

        if ($this->has('period') && is_string($this->input('period'))) {
            $normalized['period'] = InputNormalizer::text($this->input('period'));
        }

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
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $companyId = (int) $this->input('company_id', 0);
        $moneyRules = ['sometimes', 'nullable', 'numeric', 'min:0', 'max:9999999999999999.99', 'decimal:0,2'];

        return [
            'company_id' => [
                'required',
                'integer',
                Rule::exists('companies', 'id')->whereNull('deleted_at'),
            ],
            'employee_id' => [
                'required',
                'integer',
                Rule::exists('employees', 'id')
                    ->whereNull('deleted_at')
                    ->where('company_id', $companyId),
            ],
            'period' => [
                'required',
                'string',
                'regex:/^\d{4}-\d{2}(-\d{2})?$/',
            ],
            'payroll_group' => ['sometimes', 'nullable', 'string', Rule::enum(PayrollGroup::class)],
            'bank_account_number' => ['sometimes', 'nullable', 'string', 'max:50'],
            'bonus' => $moneyRules,
            'overtime' => $moneyRules,
            'deduction' => $moneyRules,
            'thr' => $moneyRules,
            'notes' => ['sometimes', 'nullable', 'string', 'max:500'],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function payload(): array
    {
        $validated = $this->validated();

        $validated['company_id'] = (int) $validated['company_id'];
        $validated['employee_id'] = (int) $validated['employee_id'];
        $validated['period'] = (string) $validated['period'];

        foreach (['bonus', 'overtime', 'deduction', 'thr'] as $moneyField) {
            $validated[$moneyField] = isset($validated[$moneyField])
                ? round((float) $validated[$moneyField], 2)
                : 0.0;
        }

        foreach (['bank_account_number', 'notes'] as $textField) {
            if (array_key_exists($textField, $validated)) {
                $validated[$textField] = $validated[$textField] !== null
                    ? InputNormalizer::nullableText((string) $validated[$textField])
                    : null;
            }
        }

        return $validated;
    }
}
