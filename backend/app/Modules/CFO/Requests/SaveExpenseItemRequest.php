<?php

namespace App\Modules\CFO\Requests;

use App\Models\ExpenseItem;
use App\Models\ExpenseType;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class SaveExpenseItemRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        /** @var ExpenseItem|null $routeItem */
        $routeItem = $this->route('expenseItem');
        $companyId = (int) ($this->input('company_id') ?? $routeItem?->company_id ?? 0);
        $requiredRule = $this->isMethod('PATCH') ? ['sometimes', 'required'] : ['required'];

        return [
            'company_id' => [
                ...$requiredRule,
                'integer',
                Rule::exists('companies', 'id')->whereNull('deleted_at'),
            ],
            'expense_category_id' => [
                'sometimes',
                'nullable',
                'integer',
                Rule::exists('expense_categories', 'id')
                    ->whereNull('deleted_at')
                    ->where('company_id', $companyId),
            ],
            'expense_type_id' => [
                ...$requiredRule,
                'integer',
                Rule::exists('expense_types', 'id')
                    ->whereNull('deleted_at')
                    ->where('company_id', $companyId),
            ],
            'name' => [...$requiredRule, 'string', 'max:150'],
            'amount' => [
                ...$requiredRule,
                'numeric',
                'min:0',
                'max:9999999999999999.99',
                'decimal:0,2',
            ],
            'purchased_on' => [...$requiredRule, 'date_format:Y-m-d'],
            'closing_date' => ['sometimes', 'nullable', 'date_format:Y-m-d'],
            'employee_id' => [
                'sometimes',
                'nullable',
                'integer',
                Rule::exists('employees', 'id')
                    ->whereNull('deleted_at')
                    ->where('company_id', $companyId),
            ],
            'detail' => ['sometimes', 'nullable', 'string', 'max:500'],
        ];
    }

    public function after(): array
    {
        return [
            function (Validator $validator): void {
                /** @var ExpenseItem|null $routeItem */
                $routeItem = $this->route('expenseItem');

                if (
                    ! $validator->errors()->hasAny(['expense_category_id', 'expense_type_id', 'company_id'])
                    && $this->filled('expense_category_id')
                ) {
                    $effectiveTypeId = (int) ($this->input('expense_type_id') ?? $routeItem?->expense_type_id ?? 0);
                    $type = $effectiveTypeId > 0
                        ? ExpenseType::query()->find($effectiveTypeId)
                        : null;

                    if ($type !== null && (int) $type->expense_category_id !== (int) $this->input('expense_category_id')) {
                        $validator->errors()->add(
                            'expense_category_id',
                            'The selected expense category does not match the selected expense type.'
                        );
                    }
                }

                if (
                    ! $validator->errors()->hasAny(['purchased_on', 'closing_date'])
                    && $this->filled('closing_date')
                ) {
                    $purchasedOn = $this->has('purchased_on')
                        ? (string) $this->input('purchased_on')
                        : $routeItem?->purchased_on?->format('Y-m-d');

                    if ($purchasedOn !== null && (string) $this->input('closing_date') < $purchasedOn) {
                        $validator->errors()->add(
                            'closing_date',
                            'The closing date must be on or after the purchase date.'
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

        foreach (['company_id', 'expense_category_id', 'expense_type_id', 'employee_id'] as $intField) {
            if (array_key_exists($intField, $validated) && $validated[$intField] !== null) {
                $validated[$intField] = (int) $validated[$intField];
            }
        }

        if (array_key_exists('name', $validated)) {
            $validated['name'] = (string) $validated['name'];
        }

        if (array_key_exists('amount', $validated)) {
            $validated['amount'] = round((float) $validated['amount'], 2);
        }

        return $validated;
    }
}
