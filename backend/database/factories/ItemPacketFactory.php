<?php

namespace Database\Factories;

use App\Models\Company;
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
            'company_id' => Company::factory(),
            'packet_id' => Packet::factory(),
            'item_id' => fn (array $attributes): mixed => Item::factory()->create([
                'company_id' => $attributes['company_id'],
            ])->id,
            'quantity' => 1,
        ];
    }
}
