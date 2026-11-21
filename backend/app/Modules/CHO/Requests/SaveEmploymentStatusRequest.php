<?php

namespace App\Modules\CHO\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SaveEmploymentStatusRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $normalized = [];

        if ($this->has('code') && is_string($this->input('code'))) {
            $trimmed = trim($this->input('code'));
            $normalized['code'] = $trimmed === '' ? null : $trimmed;
        }

        if ($this->has('name') && is_string($this->input('name'))) {
            $normalized['name'] = trim($this->input('name'));
        }

        if ($this->has('description') && is_string($this->input('description'))) {
            $trimmed = trim($this->input('description'));
            $normalized['description'] = $trimmed === '' ? null : $trimmed;
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
        $employmentStatus = $this->route('employmentStatus');

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
                Rule::unique('employment_statuses', 'code')->ignore($employmentStatus),
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
            $code = $validated['code'] !== null ? trim((string) $validated['code']) : null;
            $validated['code'] = ($code === null || $code === '') ? null : $code;
        }

        if (array_key_exists('name', $validated)) {
            $validated['name'] = trim((string) $validated['name']);
        }

        if (array_key_exists('description', $validated)) {
            $description = $validated['description'] !== null ? trim((string) $validated['description']) : null;
            $validated['description'] = ($description === null || $description === '') ? null : $description;
        }

        return $validated;
    }
}
