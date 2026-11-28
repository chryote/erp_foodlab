<?php

namespace App\Modules\CPO\Requests;

use App\Enums\PacketVendorType;
use App\Models\PacketVendor;
use App\Support\CompanyOwnerScope;
use App\Support\InputNormalizer;
use App\Support\WriteGuard;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class SavePacketVendorRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $normalized = [];

        foreach (['name', 'type'] as $field) {
            if ($this->has($field) && is_string($this->input($field))) {
                $normalized[$field] = InputNormalizer::text($this->input($field));
            }
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

        return [
            'company_owner_id' => [
                'sometimes',
                'nullable',
                'integer',
                Rule::exists('companies', 'id')->whereNull('deleted_at'),
            ],
            'name' => [...$presence, 'string', 'max:150'],
            'type' => ['sometimes', 'required', 'string', Rule::enum(PacketVendorType::class)],
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

                /** @var PacketVendor|null $packetVendor */
                $packetVendor = $this->route('packetVendor');
                $companyOwnerId = CompanyOwnerScope::resolveForRequest($this, $packetVendor);

                $effectiveName = $this->has('name')
                    ? InputNormalizer::text((string) $this->input('name'))
                    : $packetVendor?->name;

                if ($effectiveName !== null && $effectiveName !== '' && WriteGuard::existsCaseInsensitive(
                    PacketVendor::query(),
                    'name',
                    $effectiveName,
                    CompanyOwnerScope::scopeFilters($companyOwnerId),
                    $packetVendor?->getKey()
                )) {
                    $validator->errors()->add('name', 'Nama vendor paket yang sama sudah terdaftar.');
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
        $isPatch = $this->isMethod('PATCH');
        /** @var PacketVendor|null $routePacketVendor */
        $routePacketVendor = $this->route('packetVendor');

        $companyOwnerId = CompanyOwnerScope::resolveForRequest($this, $routePacketVendor);
        if ($companyOwnerId !== null && (! $isPatch || array_key_exists('company_owner_id', $validated))) {
            $validated['company_owner_id'] = $companyOwnerId;
        }

        if (array_key_exists('name', $validated)) {
            $validated['name'] = InputNormalizer::text((string) $validated['name']) ?? '';
        }

        if (! array_key_exists('type', $validated) && ! $isPatch && ! ($routePacketVendor instanceof PacketVendor)) {
            $validated['type'] = PacketVendorType::Bahan->value;
        }

        return $validated;
    }
}
