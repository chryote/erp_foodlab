<?php

namespace App\Modules\CHO\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SaveTaxStatusRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        if (is_string($this->input('code'))) {
            $this->merge([
                'code' => trim($this->input('code')),
            ]);
        }

        if (is_string($this->input('name'))) {
            $this->merge([
                'name' => trim($this->input('name')),
            ]);
        }
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $presence = $this->isMethod('PATCH') ? ['sometimes', 'required'] : ['required'];
        $taxStatus = $this->route('taxStatus');

        return [
            'company_id' => [
                ...$presence,
                'integer',
                Rule::exists('companies', 'id')->whereNull('deleted_at'),
            ],
            'code' => [
                ...$presence,
                'string',
                'max:20',
                Rule::unique('tax_statuses', 'code')->ignore($taxStatus),
            ],
            'name' => [...$presence, 'string', 'max:100'],
            'description' => ['sometimes', 'nullable', 'string'],
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

        if (array_key_exists('code', $validated)) {
            $validated['code'] = trim((string) $validated['code']);
        }

        if (array_key_exists('name', $validated)) {
            $validated['name'] = trim((string) $validated['name']);
        }

        if (array_key_exists('description', $validated)) {
            $validated['description'] = $validated['description'] !== null
                ? (string) $validated['description']
                : null;
        }

        return $validated;
    }
}
