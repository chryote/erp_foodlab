<?php

namespace Database\Factories;

use App\Enums\ItemType;
use App\Models\Company;
use App\Models\Item;
use App\Models\PacketVendor;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Item>
 */
class ItemFactory extends Factory
{
    protected $model = Item::class;

    private static int $sequence = 1;

    public function definition(): array
    {
        $seq = self::$sequence++;

        return [
            'company_id' => fn (array $attributes): mixed => ($attributes['packet_vendor_id'] ?? null) !== null
                ? null
                : Company::factory(),
            'packet_vendor_id' => null,
            'code' => sprintf('ITM-%04d', $seq),
            'name' => ucfirst($this->faker->unique()->words(2, true)).' #'.$seq,
            'type' => ItemType::Bahan,
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
