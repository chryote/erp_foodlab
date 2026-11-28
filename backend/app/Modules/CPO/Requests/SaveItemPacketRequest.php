<?php

namespace App\Modules\CPO\Requests;

use App\Models\Item;
use App\Models\ItemPacket;
use App\Models\Packet;
use App\Support\CompanyOwnerScope;
use App\Support\ExclusiveOwner;
use App\Support\InputNormalizer;
use App\Support\WriteGuard;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class SaveItemPacketRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $normalized = [];

        foreach (['company_id', 'packet_vendor_id', 'packet_id', 'item_id', 'quantity'] as $field) {
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
            'packet_id' => [
                ...$presence,
                'integer',
                Rule::exists('packets', 'id')->whereNull('deleted_at'),
            ],
            'item_id' => [
                ...$presence,
                'integer',
                Rule::exists('items', 'id')->whereNull('deleted_at'),
            ],
            'quantity' => [
                'sometimes',
                'required',
                'integer',
                'min:1',
                'max:4294967295',
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
                /** @var ItemPacket|null $routeItemPacket */
                $routeItemPacket = $this->route('itemPacket');
                $owner = ExclusiveOwner::resolveForRequest($this, $routeItemPacket);

                if ($owner['both_submitted']) {
                    $message = 'Item paket tidak boleh terhubung ke perusahaan dan vendor paket secara bersamaan.';
                    $validator->errors()->add('company_id', $message);
                    $validator->errors()->add('packet_vendor_id', $message);

                    return;
                }

                $effectiveCompanyId = $owner['company_id'];
                $effectiveVendorId = $owner['packet_vendor_id'];

                if (! $validator->errors()->hasAny(['company_id', 'packet_vendor_id']) && ($effectiveCompanyId === null) === ($effectiveVendorId === null)) {
                    $message = 'Item paket harus terhubung ke tepat satu: perusahaan atau vendor paket.';
                    $validator->errors()->add('company_id', $message);
                    $validator->errors()->add('packet_vendor_id', $message);

                    return;
                }

                $effectivePacketId = $this->filled('packet_id')
                    ? (int) $this->input('packet_id')
                    : (int) ($routeItemPacket?->packet_id ?? 0);

                $effectiveItemId = $this->filled('item_id')
                    ? (int) $this->input('item_id')
                    : (int) ($routeItemPacket?->item_id ?? 0);

                if (! $validator->errors()->has('packet_id') && $effectivePacketId > 0) {
                    $packetExists = Packet::query()
                        ->whereNull('deleted_at')
                        ->whereKey($effectivePacketId)
                        ->exists();

                    if (! $packetExists) {
                        $validator->errors()->add(
                            'packet_id',
                            'The selected packet is invalid or has been deleted.'
                        );
                    }
                }

                if (! $validator->errors()->has('item_id') && $effectiveItemId > 0) {
                    $item = Item::query()
                        ->whereNull('deleted_at')
                        ->find($effectiveItemId);

                    if ($item === null) {
                        $validator->errors()->add(
                            'item_id',
                            'The selected item is invalid or has been deleted.'
                        );
                    } elseif (! $validator->errors()->hasAny(['company_id', 'packet_vendor_id'])) {
                        $itemCompanyId = $item->company_id !== null ? (int) $item->company_id : null;
                        $itemVendorId = $item->packet_vendor_id !== null ? (int) $item->packet_vendor_id : null;

                        if ($effectiveCompanyId !== null && ($itemCompanyId !== $effectiveCompanyId || $itemVendorId !== null)) {
                            $validator->errors()->add(
                                'item_id',
                                'The selected item does not belong to the selected company.'
                            );
                        } elseif ($effectiveVendorId !== null && ($itemVendorId !== $effectiveVendorId || $itemCompanyId !== null)) {
                            $validator->errors()->add(
                                'item_id',
                                'The selected item does not belong to the selected packet vendor.'
                            );
                        }
                    }
                }

                $companyOwnerId = CompanyOwnerScope::resolveForRequest($this, $routeItemPacket) ?? $effectiveCompanyId;

                if (
                    ! $validator->errors()->hasAny(['company_id', 'packet_vendor_id', 'packet_id', 'item_id'])
                    && ($effectiveCompanyId !== null || $effectiveVendorId !== null)
                    && $effectivePacketId > 0
                    && $effectiveItemId > 0
                    && WriteGuard::existsCaseInsensitive(
                        ItemPacket::query(),
                        'item_id',
                        (string) $effectiveItemId,
                        [
                            ...CompanyOwnerScope::scopeFilters($companyOwnerId),
                            ...ExclusiveOwner::scopeFilters($effectiveCompanyId, $effectiveVendorId),
                            'packet_id' => $effectivePacketId,
                        ],
                        $routeItemPacket?->getKey()
                    )
                ) {
                    $ownerLabel = $effectiveCompanyId !== null ? 'perusahaan' : 'vendor paket';
                    $validator->errors()->add(
                        'item_id',
                        "Item sudah terdaftar pada paket ini untuk {$ownerLabel} ini."
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
        $isPatch = $this->isMethod('PATCH');
        /** @var ItemPacket|null $routeItemPacket */
        $routeItemPacket = $this->route('itemPacket');

        $companyOwnerId = CompanyOwnerScope::resolveForRequest($this, $routeItemPacket)
            ?? (isset($validated['company_id']) && $validated['company_id'] !== null ? (int) $validated['company_id'] : null);
        if ($companyOwnerId !== null && (! $isPatch || array_key_exists('company_owner_id', $validated))) {
            $validated['company_owner_id'] = $companyOwnerId;
        }

        foreach (['packet_id', 'item_id', 'quantity'] as $intField) {
            if (array_key_exists($intField, $validated)) {
                $validated[$intField] = (int) $validated[$intField];
            }
        }

        if (! array_key_exists('quantity', $validated) && ! $isPatch && ! ($routeItemPacket instanceof ItemPacket)) {
            $validated['quantity'] = 1;
        }

        return $validated;
    }
}
