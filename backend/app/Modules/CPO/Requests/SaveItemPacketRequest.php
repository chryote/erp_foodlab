<?php

namespace App\Modules\CPO\Requests;

use App\Models\Item;
use App\Models\ItemPacket;
use App\Models\Packet;
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

        foreach (['packet_id', 'item_id', 'quantity'] as $field) {
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
                    $itemExists = Item::query()
                        ->whereNull('deleted_at')
                        ->whereKey($effectiveItemId)
                        ->exists();

                    if (! $itemExists) {
                        $validator->errors()->add(
                            'item_id',
                            'The selected item is invalid or has been deleted.'
                        );
                    }
                }

                if (
                    ! $validator->errors()->hasAny(['packet_id', 'item_id'])
                    && $effectivePacketId > 0
                    && $effectiveItemId > 0
                    && WriteGuard::existsCaseInsensitive(
                        ItemPacket::query(),
                        'item_id',
                        (string) $effectiveItemId,
                        ['packet_id' => $effectivePacketId],
                        $routeItemPacket?->getKey()
                    )
                ) {
                    $validator->errors()->add(
                        'item_id',
                        'Item sudah terdaftar pada paket ini.'
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
        /** @var ItemPacket|null $routeItemPacket */
        $routeItemPacket = $this->route('itemPacket');

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
