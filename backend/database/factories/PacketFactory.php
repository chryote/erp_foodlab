<?php

namespace Database\Factories;

use App\Models\Company;
use App\Models\Packet;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Packet>
 */
class PacketFactory extends Factory
{
    protected $model = Packet::class;

    private static int $sequence = 1;

    public function definition(): array
    {
        $seq = self::$sequence++;

        return [
            'company_owner_id' => Company::factory(),
            'name' => 'Paket '.ucfirst($this->faker->unique()->words(2, true)).' #'.$seq,
        ];
    }
}
