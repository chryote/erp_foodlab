<?php

namespace Database\Factories;

use App\Models\DefaultPackage;
use App\Models\ItemPacket;
use App\Models\PacketCategory;
use App\Models\PacketName;
use App\Models\PacketVendor;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<DefaultPackage>
 */
class DefaultPackageFactory extends Factory
{
    protected $model = DefaultPackage::class;

    private static int $sequence = 1;

    public function definition(): array
    {
        $seq = self::$sequence++;

        return [
            'brand_name' => 'Brand '.ucfirst($this->faker->unique()->word()).' #'.$seq,
            'packet_name_id' => PacketName::factory(),
            'packet_vendor_id' => PacketVendor::factory(),
            'packet_category_id' => PacketCategory::factory(),
            'item_packet_id' => ItemPacket::factory(),
            'price' => round($this->faker->randomFloat(2, 1000, 100000), 2),
        ];
    }
}
