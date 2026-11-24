<?php

namespace App\Modules\CPO\Requests;

use App\Models\DefaultPackage;
use App\Models\ItemPacket;
use App\Models\PacketCategory;
use App\Models\PacketName;
use App\Models\PacketVendor;
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

        foreach (['packet_name_id', 'packet_vendor_id', 'packet_category_id', 'item_packet_id', 'price'] as $field) {
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
            'brand_name' => [...$presence, 'string', 'max:150'],
            'packet_name_id' => [
                ...$presence,
                'integer',
                Rule::exists('packet_names', 'id')->whereNull('deleted_at'),
            ],
            'packet_vendor_id' => [
                ...$presence,
                'integer',
                Rule::exists('packet_vendors', 'id')->whereNull('deleted_at'),
            ],
            'packet_category_id' => [
                ...$presence,
                'integer',
                Rule::exists('packet_categories', 'id')->whereNull('deleted_at'),
            ],
            'item_packet_id' => [
                ...$presence,
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

                $effectiveBrandName = $this->has('brand_name')
                    ? InputNormalizer::text((string) $this->input('brand_name'))
                    : $routeDefaultPackage?->brand_name;

                $effectivePacketNameId = $this->filled('packet_name_id')
                    ? (int) $this->input('packet_name_id')
                    : (int) ($routeDefaultPackage?->packet_name_id ?? 0);

                $effectivePacketVendorId = $this->filled('packet_vendor_id')
                    ? (int) $this->input('packet_vendor_id')
                    : (int) ($routeDefaultPackage?->packet_vendor_id ?? 0);

                $effectivePacketCategoryId = $this->filled('packet_category_id')
                    ? (int) $this->input('packet_category_id')
                    : (int) ($routeDefaultPackage?->packet_category_id ?? 0);

                $effectiveItemPacketId = $this->filled('item_packet_id')
                    ? (int) $this->input('item_packet_id')
                    : (int) ($routeDefaultPackage?->item_packet_id ?? 0);

                $parentChecks = [
                    'packet_name_id' => [PacketName::class, $effectivePacketNameId, 'The selected packet name is invalid or has been deleted.'],
                    'packet_vendor_id' => [PacketVendor::class, $effectivePacketVendorId, 'The selected packet vendor is invalid or has been deleted.'],
                    'packet_category_id' => [PacketCategory::class, $effectivePacketCategoryId, 'The selected packet category is invalid or has been deleted.'],
                    'item_packet_id' => [ItemPacket::class, $effectiveItemPacketId, 'The selected item packet is invalid or has been deleted.'],
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
                        'packet_vendor_id',
                        'packet_category_id',
                        'item_packet_id',
                    ])
                    && $effectiveBrandName !== null
                    && $effectiveBrandName !== ''
                    && $effectivePacketNameId > 0
                    && $effectivePacketVendorId > 0
                    && $effectivePacketCategoryId > 0
                    && $effectiveItemPacketId > 0
                    && WriteGuard::existsCaseInsensitive(
                        DefaultPackage::query(),
                        'brand_name',
                        $effectiveBrandName,
                        [
                            'packet_name_id' => $effectivePacketNameId,
                            'packet_vendor_id' => $effectivePacketVendorId,
                            'packet_category_id' => $effectivePacketCategoryId,
                            'item_packet_id' => $effectiveItemPacketId,
                        ],
                        $routeDefaultPackage?->getKey()
                    )
                ) {
                    $validator->errors()->add(
                        'brand_name',
                        'Paket default dengan kombinasi merek, nama paket, vendor, kategori, dan item paket yang sama sudah terdaftar.'
                    );
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
        /** @var DefaultPackage|null $routeDefaultPackage */
        $routeDefaultPackage = $this->route('defaultPackage');

        if (array_key_exists('brand_name', $validated)) {
            $validated['brand_name'] = InputNormalizer::text((string) $validated['brand_name']) ?? '';
        }

        foreach (['packet_name_id', 'packet_vendor_id', 'packet_category_id', 'item_packet_id'] as $intField) {
            if (array_key_exists($intField, $validated)) {
                $validated[$intField] = (int) $validated[$intField];
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
