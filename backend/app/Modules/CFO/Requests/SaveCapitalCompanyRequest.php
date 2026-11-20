<?php

namespace App\Modules\CFO\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SaveCapitalCompanyRequest extends FormRequest
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
        return [
            'company_id' => [
                'required',
                'integer',
                Rule::exists('companies', 'id')->whereNull('deleted_at'),
            ],
            'stakeholder_name' => ['required', 'string', 'max:150'],
            'capital' => ['required', 'numeric', 'min:0'],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function payload(): array
    {
        $validated = $this->validated();
        $validated['company_id'] = (int) $validated['company_id'];
        $validated['stakeholder_name'] = (string) $validated['stakeholder_name'];
        $validated['capital'] = (float) $validated['capital'];

        return $validated;
    }
}
