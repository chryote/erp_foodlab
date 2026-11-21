<?php

namespace App\Modules\CFO\Requests;

use App\Models\ExpenseType;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SaveExpenseTypeRequest extends FormRequest
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
        /** @var ExpenseType|null $routeType */
        $routeType = $this->route('expenseType');
        $companyId = (int) ($this->input('company_id') ?? $routeType?->company_id ?? 0);
        $requiredRule = $this->isMethod('PATCH') ? ['sometimes', 'required'] : ['required'];

        return [
            'company_id' => [
                ...$requiredRule,
                'integer',
                Rule::exists('companies', 'id')->whereNull('deleted_at'),
            ],
            'expense_category_id' => [
                ...$requiredRule,
                'integer',
                Rule::exists('expense_categories', 'id')
                    ->whereNull('deleted_at')
                    ->where('company_id', $companyId),
            ],
            'name' => [...$requiredRule, 'string', 'max:150'],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function payload(): array
    {
        $validated = $this->validated();

        if (array_key_exists('company_id', $validated)) {
            $validated['company_id'] = (int) $validated['company_id'];
        }

        if (array_key_exists('expense_category_id', $validated)) {
            $validated['expense_category_id'] = (int) $validated['expense_category_id'];
        }

        if (array_key_exists('name', $validated)) {
            $validated['name'] = (string) $validated['name'];
        }

        return $validated;
    }
}
