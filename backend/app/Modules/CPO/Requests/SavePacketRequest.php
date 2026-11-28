<?php

namespace App\Modules\CPO\Requests;

use App\Models\Packet;
use App\Support\CompanyOwnerScope;
use App\Support\InputNormalizer;
use App\Support\WriteGuard;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class SavePacketRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        if ($this->has('name') && is_string($this->input('name'))) {
            $this->merge([
                'name' => InputNormalizer::text($this->input('name')),
            ]);
        }
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $presence = $this->isMethod('PATCH') ? ['sometimes', 'required'] : ['required'];

        return [
            'company_owner_id' => [
                'sometimes',
                'nullable',
                'integer',
                Rule::exists('companies', 'id')->whereNull('deleted_at'),
            ],
            'name' => [...$presence, 'string', 'max:150'],
        ];
    }

    /**
     * @return array<int, callable(Validator): void>
     */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                if ($validator->errors()->has('name')) {
                    return;
                }

                /** @var Packet|null $packet */
                $packet = $this->route('packet');
                $companyOwnerId = CompanyOwnerScope::resolveForRequest($this, $packet);

                $effectiveName = $this->has('name')
                    ? InputNormalizer::text((string) $this->input('name'))
                    : $packet?->name;

                if ($effectiveName !== null && $effectiveName !== '' && WriteGuard::existsCaseInsensitive(
                    Packet::query(),
                    'name',
                    $effectiveName,
                    CompanyOwnerScope::scopeFilters($companyOwnerId),
                    $packet?->getKey()
                )) {
                    $validator->errors()->add('name', 'Paket dengan nama yang sama sudah terdaftar.');
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
        /** @var Packet|null $packet */
        $packet = $this->route('packet');

        $companyOwnerId = CompanyOwnerScope::resolveForRequest($this, $packet);
        if ($companyOwnerId !== null && (! $this->isMethod('PATCH') || array_key_exists('company_owner_id', $validated))) {
            $validated['company_owner_id'] = $companyOwnerId;
        }

        if (array_key_exists('name', $validated)) {
            $validated['name'] = InputNormalizer::text((string) $validated['name']) ?? '';
        }

        return $validated;
    }
}
