<?php

namespace App\Modules\CHO\Requests;

use App\Models\TaxStatus;
use App\Support\InputNormalizer;
use App\Support\WriteGuard;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class SaveTaxStatusRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $normalized = [];

        if ($this->has('code') && is_string($this->input('code'))) {
            $normalized['code'] = InputNormalizer::nullableText($this->input('code'));
        }

        if ($this->has('name') && is_string($this->input('name'))) {
            $normalized['name'] = InputNormalizer::text($this->input('name'));
        }

        if ($this->has('description') && is_string($this->input('description'))) {
            $normalized['description'] = InputNormalizer::nullableText($this->input('description'));
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
        $taxStatus = $this->route('taxStatus');
        $companyId = $this->filled('company_id')
            ? (int) $this->input('company_id')
            : ($taxStatus instanceof TaxStatus ? (int) $taxStatus->company_id : 0);

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
                'max:20',
                Rule::unique('tax_statuses', 'code')
                    ->where('company_id', $companyId)
                    ->whereNull('deleted_at')
                    ->ignore($taxStatus),
            ],
            'name' => [...$presence, 'string', 'max:100'],
            'description' => ['sometimes', 'nullable', 'string'],
        ];
    }

    /**
     * @return array<int, callable(Validator): void>
     */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                if ($validator->errors()->hasAny(['company_id', 'code', 'name'])) {
                    return;
                }

                /** @var TaxStatus|null $taxStatus */
                $taxStatus = $this->route('taxStatus');
                $effectiveCompanyId = $this->filled('company_id')
                    ? (int) $this->input('company_id')
                    : (int) ($taxStatus?->company_id ?? 0);

                if ($effectiveCompanyId <= 0) {
                    return;
                }

                $effectiveCode = $this->has('code')
                    ? ($this->input('code') !== null ? InputNormalizer::nullableText((string) $this->input('code')) : null)
                    : $taxStatus?->code;
                $effectiveName = $this->has('name')
                    ? InputNormalizer::text((string) $this->input('name'))
                    : $taxStatus?->name;

                $errors = WriteGuard::findCompanyCodeAndNameDuplicateErrors(
                    TaxStatus::class,
                    $effectiveCompanyId,
                    $effectiveCode,
                    $effectiveName,
                    'Status pajak dengan nama yang sama sudah terdaftar pada perusahaan ini.',
                    $taxStatus?->getKey()
                );

                foreach ($errors as $field => $message) {
                    $validator->errors()->add($field, $message);
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

        if (array_key_exists('company_id', $validated)) {
            $validated['company_id'] = (int) $validated['company_id'];
        }

        if (array_key_exists('code', $validated)) {
            $validated['code'] = $validated['code'] !== null
                ? InputNormalizer::nullableText((string) $validated['code'])
                : null;
        }

        if (array_key_exists('name', $validated)) {
            $validated['name'] = InputNormalizer::text((string) $validated['name']);
        }

        if (array_key_exists('description', $validated)) {
            $validated['description'] = $validated['description'] !== null
                ? InputNormalizer::nullableText((string) $validated['description'])
                : null;
        }

        return $validated;
    }
}
