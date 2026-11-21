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
        $requiredRule = $this->isMethod('PATCH') ? ['sometimes', 'required'] : ['required'];

        return [
            'company_id' => [
                ...$requiredRule,
                'integer',
                Rule::exists('companies', 'id')->whereNull('deleted_at'),
            ],
            'stakeholder_name' => [...$requiredRule, 'string', 'max:150'],
            'capital' => [
                ...$requiredRule,
                'numeric',
                'min:0',
                'max:9999999999999999.99',
                'decimal:0,2',
            ],
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

        if (array_key_exists('stakeholder_name', $validated)) {
            $validated['stakeholder_name'] = (string) $validated['stakeholder_name'];
        }

        if (array_key_exists('capital', $validated)) {
            $validated['capital'] = round((float) $validated['capital'], 2);
        }

        return $validated;
    }
}
