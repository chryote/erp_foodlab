<?php

namespace App\Modules\CPO\Requests;

use App\Models\DefaultPackage;
use App\Models\ItemPacket;
use App\Models\Packet;
use App\Models\PacketCategory;
use App\Models\PacketName;
use App\Support\CompanyOwnerScope;
use App\Support\ExclusiveOwner;
use App\Support\InputNormalizer;
use App\Support\WriteGuard;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class SaveDefaultPackageRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $normalized = [];

        if ($this->has('brand_name') && is_string($this->input('brand_name'))) {
            $normalized['brand_name'] = InputNormalizer::text($this->input('brand_name'));
        }

        foreach (['packet_name_id', 'company_id', 'packet_vendor_id', 'packet_category_id', 'packet_id', 'item_packet_id', 'price'] as $field) {
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
            'brand_name' => [...$presence, 'string', 'max:150'],
            'packet_name_id' => [
                ...$presence,
                'integer',
                Rule::exists('packet_names', 'id')->whereNull('deleted_at'),
            ],
            'company_id' => [
                'sometimes',
                'nullable',
                'integer',
                Rule::exists('companies', 'id')->whereNull('deleted_at'),
            ],
            'packet_vendor_id' => [
                'sometimes',
                'nullable',
                'integer',
                Rule::exists('packet_vendors', 'id')->whereNull('deleted_at'),
            ],
            'packet_category_id' => [
                ...$presence,
                'integer',
                Rule::exists('packet_categories', 'id')->whereNull('deleted_at'),
            ],
            'packet_id' => [
                'sometimes',
                'nullable',
                'integer',
                Rule::exists('packets', 'id')->whereNull('deleted_at'),
            ],
            'item_packet_id' => [
                'sometimes',
                'nullable',
                'integer',
                Rule::exists('item_packet', 'id')->whereNull('deleted_at'),
            ],
            'price' => [
                'sometimes',
                'required',
                'numeric',
                'min:0',
                'max:9999999999999999.99',
                'decimal:0,2',
            ],
        ];
    }

    /**
     * @return array<int, callable(Validator): void>
     */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                /** @var DefaultPackage|null $routeDefaultPackage */
                $routeDefaultPackage = $this->route('defaultPackage');
                $owner = ExclusiveOwner::resolveForRequest($this, $routeDefaultPackage);

                if ($owner['both_submitted']) {
                    $message = 'Paket default tidak boleh terhubung ke perusahaan dan vendor paket secara bersamaan.';
                    $validator->errors()->add('company_id', $message);
                    $validator->errors()->add('packet_vendor_id', $message);

                    return;
                }

                $effectiveCompanyId = $owner['company_id'];
                $effectiveVendorId = $owner['packet_vendor_id'];

                if (
                    ! $validator->errors()->hasAny(['company_id', 'packet_vendor_id'])
                    && ($effectiveCompanyId === null) === ($effectiveVendorId === null)
                ) {
                    $message = 'Paket default harus terhubung ke tepat satu: perusahaan atau vendor paket.';
                    $validator->errors()->add('company_id', $message);
                    $validator->errors()->add('packet_vendor_id', $message);
                }

                $effectiveBrandName = $this->has('brand_name')
                    ? InputNormalizer::text((string) $this->input('brand_name'))
                    : $routeDefaultPackage?->brand_name;

                $effectivePacketNameId = $this->filled('packet_name_id')
                    ? (int) $this->input('packet_name_id')
                    : (int) ($routeDefaultPackage?->packet_name_id ?? 0);

                $effectivePacketCategoryId = $this->filled('packet_category_id')
                    ? (int) $this->input('packet_category_id')
                    : (int) ($routeDefaultPackage?->packet_category_id ?? 0);

                $effectivePacketId = $this->has('packet_id')
                    ? ($this->input('packet_id') !== null ? (int) $this->input('packet_id') : null)
                    : ($routeDefaultPackage?->packet_id !== null ? (int) $routeDefaultPackage->packet_id : null);

                $effectiveItemPacketId = $this->has('item_packet_id')
                    ? ($this->input('item_packet_id') !== null ? (int) $this->input('item_packet_id') : null)
                    : ($routeDefaultPackage?->item_packet_id !== null ? (int) $routeDefaultPackage->item_packet_id : null);

                if (
                    ! $validator->errors()->hasAny(['packet_id', 'item_packet_id'])
                    && $effectivePacketId === null
                    && $effectiveItemPacketId === null
                ) {
                    $validator->errors()->add(
                        'item_packet_id',
                        'Paket atau item paket wajib dipilih.'
                    );
                }

                $parentChecks = [
                    'packet_name_id' => [PacketName::class, $effectivePacketNameId, 'The selected packet name is invalid or has been deleted.'],
                    'packet_category_id' => [PacketCategory::class, $effectivePacketCategoryId, 'The selected packet category is invalid or has been deleted.'],
                    'packet_id' => [Packet::class, $effectivePacketId ?? 0, 'The selected packet is invalid or has been deleted.'],
                    'item_packet_id' => [ItemPacket::class, $effectiveItemPacketId ?? 0, 'The selected item packet is invalid or has been deleted.'],
                ];

                foreach ($parentChecks as $field => [$modelClass, $parentId, $message]) {
                    if (! $validator->errors()->has($field) && $parentId > 0) {
                        $exists = $modelClass::query()
                            ->whereNull('deleted_at')
                            ->whereKey($parentId)
                            ->exists();

                        if (! $exists) {
                            $validator->errors()->add($field, $message);
                        }
                    }
                }

                if (
                    ! $validator->errors()->hasAny([
                        'brand_name',
                        'packet_name_id',
                        'company_id',
                        'packet_vendor_id',
                        'packet_category_id',
                        'packet_id',
                        'item_packet_id',
                    ])
                    && $effectiveBrandName !== null
                    && $effectiveBrandName !== ''
                    && $effectivePacketNameId > 0
                    && ($effectiveCompanyId !== null || $effectiveVendorId !== null)
                    && $effectivePacketCategoryId > 0
                ) {
                    $derivedPacketId = $effectivePacketId;
                    if ($derivedPacketId === null && $effectiveItemPacketId !== null) {
                        $derivedPacketId = ItemPacket::query()
                            ->whereNull('deleted_at')
                            ->whereKey($effectiveItemPacketId)
                            ->value('packet_id');
                        $derivedPacketId = $derivedPacketId !== null ? (int) $derivedPacketId : null;
                    }

                    $companyOwnerId = CompanyOwnerScope::resolveForRequest($this, $routeDefaultPackage) ?? $effectiveCompanyId;
                    $ownerScope = ExclusiveOwner::scopeFilters($effectiveCompanyId, $effectiveVendorId);
                    $baseScope = [
                        ...CompanyOwnerScope::scopeFilters($companyOwnerId),
                        'packet_name_id' => $effectivePacketNameId,
                        ...$ownerScope,
                        'packet_category_id' => $effectivePacketCategoryId,
                    ];

                    $duplicateByItemPacket = $effectiveItemPacketId !== null && WriteGuard::existsCaseInsensitive(
                        DefaultPackage::query(),
                        'brand_name',
                        $effectiveBrandName,
                        [...$baseScope, 'item_packet_id' => $effectiveItemPacketId],
                        $routeDefaultPackage?->getKey()
                    );

                    $duplicateByPacket = $derivedPacketId !== null && WriteGuard::existsCaseInsensitive(
                        DefaultPackage::query(),
                        'brand_name',
                        $effectiveBrandName,
                        [...$baseScope, 'packet_id' => $derivedPacketId],
                        $routeDefaultPackage?->getKey()
                    );

                    if ($duplicateByItemPacket || $duplicateByPacket) {
                        $validator->errors()->add(
                            'brand_name',
                            'Paket default dengan kombinasi merek, nama paket, pemilik, kategori, dan item paket yang sama sudah terdaftar.'
                        );
                    }
                }
            },
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function payload(): array
    {
        $validated = ExclusiveOwner::applyToPayload($this->validated());
        $isPatch = $this->isMethod('PATCH');
        /** @var DefaultPackage|null $routeDefaultPackage */
        $routeDefaultPackage = $this->route('defaultPackage');

        $companyOwnerId = CompanyOwnerScope::resolveForRequest($this, $routeDefaultPackage)
            ?? (isset($validated['company_id']) && $validated['company_id'] !== null ? (int) $validated['company_id'] : null);
        if ($companyOwnerId !== null && (! $isPatch || array_key_exists('company_owner_id', $validated))) {
            $validated['company_owner_id'] = $companyOwnerId;
        }

        if (array_key_exists('brand_name', $validated)) {
            $validated['brand_name'] = InputNormalizer::text((string) $validated['brand_name']) ?? '';
        }

        foreach (['packet_name_id', 'packet_category_id'] as $intField) {
            if (array_key_exists($intField, $validated)) {
                $validated[$intField] = (int) $validated[$intField];
            }
        }

        foreach (['packet_id', 'item_packet_id'] as $nullableIntField) {
            if (array_key_exists($nullableIntField, $validated)) {
                $validated[$nullableIntField] = $validated[$nullableIntField] !== null
                    ? (int) $validated[$nullableIntField]
                    : null;
            }
        }

        if (array_key_exists('price', $validated)) {
            $validated['price'] = round((float) $validated['price'], 2);
        } elseif (! $isPatch && ! ($routeDefaultPackage instanceof DefaultPackage)) {
            $validated['price'] = 0.0;
        }

        return $validated;
    }
}
