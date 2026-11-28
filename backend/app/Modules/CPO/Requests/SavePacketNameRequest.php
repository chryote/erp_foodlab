<?php

namespace App\Modules\CPO\Requests;

use App\Models\PacketName;
use App\Support\CompanyOwnerScope;
use App\Support\InputNormalizer;
use App\Support\WriteGuard;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class SavePacketNameRequest extends FormRequest
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

                /** @var PacketName|null $packetName */
                $packetName = $this->route('packetName');
                $companyOwnerId = CompanyOwnerScope::resolveForRequest($this, $packetName);

                $effectiveName = $this->has('name')
                    ? InputNormalizer::text((string) $this->input('name'))
                    : $packetName?->name;

                if ($effectiveName !== null && $effectiveName !== '' && WriteGuard::existsCaseInsensitive(
                    PacketName::query(),
                    'name',
                    $effectiveName,
                    CompanyOwnerScope::scopeFilters($companyOwnerId),
                    $packetName?->getKey()
                )) {
                    $validator->errors()->add('name', 'Nama paket yang sama sudah terdaftar.');
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
        /** @var PacketName|null $packetName */
        $packetName = $this->route('packetName');

        $companyOwnerId = CompanyOwnerScope::resolveForRequest($this, $packetName);
        if ($companyOwnerId !== null && (! $this->isMethod('PATCH') || array_key_exists('company_owner_id', $validated))) {
            $validated['company_owner_id'] = $companyOwnerId;
        }

        if (array_key_exists('name', $validated)) {
            $validated['name'] = InputNormalizer::text((string) $validated['name']) ?? '';
        }

        return $validated;
    }
}
