<?php

namespace Database\Factories;

use App\Models\Company;
use App\Models\Item;
use App\Models\ItemPacket;
use App\Models\Packet;
use App\Models\PacketVendor;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ItemPacket>
 */
class ItemPacketFactory extends Factory
{
    protected $model = ItemPacket::class;

    public function definition(): array
    {
        return [
            'company_owner_id' => Company::factory(),
            'company_id' => fn (array $attributes): mixed => ($attributes['packet_vendor_id'] ?? null) !== null
                ? null
                : Company::factory(),
            'packet_vendor_id' => null,
            'packet_id' => Packet::factory(),
            'item_id' => function (array $attributes): mixed {
                if (($attributes['packet_vendor_id'] ?? null) !== null) {
                    return Item::factory()->create([
                        'company_id' => null,
                        'packet_vendor_id' => $attributes['packet_vendor_id'],
                    ])->id;
                }

                return Item::factory()->create([
                    'company_id' => $attributes['company_id'],
                ])->id;
            },
            'quantity' => 1,
        ];
    }

    public function forPacketVendor(?PacketVendor $packetVendor = null): static
    {
        return $this->state(fn (): array => [
            'company_id' => null,
            'packet_vendor_id' => $packetVendor?->getKey() ?? PacketVendor::factory(),
        ]);
    }
}
