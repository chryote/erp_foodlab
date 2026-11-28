<?php

namespace App\Modules\CPO\Requests;

use App\Models\DefaultPackage;
use App\Models\Item;
use App\Models\Packet;
use App\Models\PacketCategory;
use App\Models\PacketName;
use App\Support\ExclusiveOwner;
use App\Support\InputNormalizer;
use App\Support\WriteGuard;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class SaveDefaultPackageWizardRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $normalized = [];

        foreach (['packet_name', 'packet_category', 'brand_name', 'company_id', 'packet_vendor_id'] as $field) {
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
        return [
            'packet_name' => ['required', 'string', 'max:150'],
            'packet_category' => ['required', 'string', 'max:150'],
            'brand_name' => ['required', 'string', 'max:150'],
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
            'price' => [
                'required',
                'numeric',
                'min:0',
                'max:9999999999999999.99',
                'decimal:0,2',
            ],
            'items' => ['required', 'array', 'min:1', 'max:100'],
            'items.*.item_id' => [
                'required',
                'integer',
                'distinct',
                Rule::exists('items', 'id')->whereNull('deleted_at'),
            ],
            'items.*.quantity' => ['required', 'integer', 'min:1', 'max:4294967295'],
            'items.*.price' => [
                'sometimes',
                'nullable',
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
                $owner = ExclusiveOwner::resolveForRequest($this);

                if ($owner['both_submitted']) {
                    $message = 'Paket default tidak boleh terhubung ke perusahaan dan vendor paket secara bersamaan.';
                    $validator->errors()->add('company_id', $message);
                    $validator->errors()->add('packet_vendor_id', $message);

                    return;
                }

                $companyId = $owner['company_id'];
                $vendorId = $owner['packet_vendor_id'];

                if (
                    ! $validator->errors()->hasAny(['company_id', 'packet_vendor_id'])
                    && ($companyId === null) === ($vendorId === null)
                ) {
                    $message = 'Paket default harus terhubung ke tepat satu: perusahaan atau vendor paket.';
                    $validator->errors()->add('company_id', $message);
                    $validator->errors()->add('packet_vendor_id', $message);

                    return;
                }

                $itemsInput = $this->input('items');
                if (is_array($itemsInput) && $itemsInput !== []) {
                    $itemIds = array_values(array_unique(array_filter(array_map(
                        static fn (mixed $row): int => is_array($row) && isset($row['item_id']) && is_numeric($row['item_id'])
                            ? (int) $row['item_id']
                            : 0,
                        $itemsInput
                    ), static fn (int $id): bool => $id > 0)));

                    $itemsById = $itemIds !== []
                        ? Item::query()->whereNull('deleted_at')->whereIn('id', $itemIds)->get()->keyBy('id')
                        : collect();

                    foreach ($itemsInput as $index => $row) {
                        if (! is_array($row)) {
                            continue;
                        }

                        if ($validator->errors()->hasAny(['company_id', 'packet_vendor_id', "items.{$index}.item_id"])) {
                            continue;
                        }

                        $itemId = isset($row['item_id']) ? (int) $row['item_id'] : 0;
                        /** @var Item|null $item */
                        $item = $itemsById->get($itemId);

                        if ($item === null) {
                            $validator->errors()->add("items.{$index}.item_id", 'The selected item is invalid or has been deleted.');

                            continue;
                        }

                        $itemCompanyId = $item->company_id !== null ? (int) $item->company_id : null;
                        $itemVendorId = $item->packet_vendor_id !== null ? (int) $item->packet_vendor_id : null;

                        if ($companyId !== null && ($itemCompanyId !== $companyId || $itemVendorId !== null)) {
                            $validator->errors()->add(
                                "items.{$index}.item_id",
                                'Item yang dipilih tidak dimiliki oleh perusahaan yang dipilih.'
                            );
                        } elseif ($vendorId !== null && ($itemVendorId !== $vendorId || $itemCompanyId !== null)) {
                            $validator->errors()->add(
                                "items.{$index}.item_id",
                                'Item yang dipilih tidak dimiliki oleh vendor paket yang dipilih.'
                            );
                        }
                    }
                }

                if ($validator->errors()->isNotEmpty()) {
                    return;
                }

                $packetNameText = InputNormalizer::text((string) $this->input('packet_name')) ?? '';
                $packetCategoryText = InputNormalizer::text((string) $this->input('packet_category')) ?? '';
                $brandNameText = InputNormalizer::text((string) $this->input('brand_name')) ?? '';

                /** @var DefaultPackage|null $routeDefaultPackage */
                $routeDefaultPackage = $this->route('defaultPackage');

                $existingNameId = $this->findActiveIdByName(PacketName::query(), $packetNameText);
                $existingCategoryId = $this->findActiveIdByName(PacketCategory::query(), $packetCategoryText);
                $existingPacketId = $this->findActiveIdByName(Packet::query(), $packetNameText);

                if (
                    $existingNameId !== null
                    && $existingCategoryId !== null
                    && $existingPacketId !== null
                    && WriteGuard::existsCaseInsensitive(
                        DefaultPackage::query(),
                        'brand_name',
                        $brandNameText,
                        [
                            'packet_name_id' => $existingNameId,
                            ...ExclusiveOwner::scopeFilters($companyId, $vendorId),
                            'packet_category_id' => $existingCategoryId,
                            'packet_id' => $existingPacketId,
                        ],
                        $routeDefaultPackage?->getKey()
                    )
                ) {
                    $validator->errors()->add(
                        'brand_name',
                        'Paket default dengan kombinasi merek, nama paket, pemilik, kategori, dan paket yang sama sudah terdaftar.'
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
        $validated = ExclusiveOwner::applyToPayload($this->validated());

        foreach (['packet_name', 'packet_category', 'brand_name'] as $textField) {
            $validated[$textField] = InputNormalizer::text((string) $validated[$textField]) ?? '';
        }

        $validated['price'] = round((float) $validated['price'], 2);

        $validated['items'] = array_map(
            static fn (array $row): array => [
                'item_id' => (int) $row['item_id'],
                'quantity' => (int) $row['quantity'],
                'price' => isset($row['price']) ? round((float) $row['price'], 2) : 0.0,
            ],
            $validated['items']
        );

        return $validated;
    }

    /**
     * @param  \Illuminate\Database\Eloquent\Builder<\Illuminate\Database\Eloquent\Model>  $query
     */
    private function findActiveIdByName($query, string $name): ?int
    {
        $wrapped = $query->getGrammar()->wrap('name');
        $id = $query->whereNull('deleted_at')
            ->whereRaw("LOWER({$wrapped}) = ?", [mb_strtolower($name, 'UTF-8')])
            ->value('id');

        return $id !== null ? (int) $id : null;
    }
}
