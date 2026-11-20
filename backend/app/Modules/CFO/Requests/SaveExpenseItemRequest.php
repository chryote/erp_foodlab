<?php

namespace App\Modules\CFO\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

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
        $companyId = (int) $this->input('company_id');

        return [
            'company_id' => [
                'required',
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
                'required',
                'integer',
                Rule::exists('expense_types', 'id')
                    ->whereNull('deleted_at')
                    ->where('company_id', $companyId),
            ],
            'name' => ['required', 'string', 'max:150'],
            'amount' => ['required', 'numeric', 'min:0'],
            'purchased_on' => ['required', 'date_format:Y-m-d'],
            'closing_date' => ['sometimes', 'nullable', 'date_format:Y-m-d'],
            'employee_id' => ['sometimes', 'nullable', 'integer', 'min:1'],
            'detail' => ['sometimes', 'nullable', 'string', 'max:500'],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function payload(): array
    {
        $validated = $this->validated();
        $validated['name'] = (string) $validated['name'];
        $validated['amount'] = (float) $validated['amount'];

        return $validated;
    }
}
