<?php

namespace Database\Factories;

use App\Enums\PacketVendorType;
use App\Models\Company;
use App\Models\PacketVendor;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<PacketVendor>
 */
class PacketVendorFactory extends Factory
{
    protected $model = PacketVendor::class;

    private static int $sequence = 1;

    public function definition(): array
    {
        $seq = self::$sequence++;

        return [
            'company_owner_id' => Company::factory(),
            'name' => 'Vendor '.ucfirst($this->faker->unique()->words(2, true)).' #'.$seq,
            'type' => PacketVendorType::Bahan,
        ];
    }
}
