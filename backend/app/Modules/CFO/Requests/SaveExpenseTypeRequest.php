<?php

namespace App\Modules\CFO\Requests;

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
        $companyId = (int) $this->input('company_id');

        return [
            'company_id' => [
                'required',
                'integer',
                Rule::exists('companies', 'id')->whereNull('deleted_at'),
            ],
            'expense_category_id' => [
                'required',
                'integer',
                Rule::exists('expense_categories', 'id')
                    ->whereNull('deleted_at')
                    ->where('company_id', $companyId),
            ],
            'name' => ['required', 'string', 'max:150'],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function payload(): array
    {
        $validated = $this->validated();
        $validated['company_id'] = (int) $validated['company_id'];
        $validated['expense_category_id'] = (int) $validated['expense_category_id'];
        $validated['name'] = (string) $validated['name'];

        return $validated;
    }
}
