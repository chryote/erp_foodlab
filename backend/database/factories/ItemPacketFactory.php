<?php

namespace Database\Factories;

use App\Models\Item;
use App\Models\ItemPacket;
use App\Models\Packet;
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
            'packet_id' => Packet::factory(),
            'item_id' => Item::factory(),
            'quantity' => 1,
        ];
    }
}
