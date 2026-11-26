<?php

namespace Database\Factories;

use App\Models\PacketName;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<PacketName>
 */
class PacketNameFactory extends Factory
{
    protected $model = PacketName::class;

    private static int $sequence = 1;

    public function definition(): array
    {
        $seq = self::$sequence++;

        return [
            'name' => 'Paket '.ucfirst($this->faker->unique()->words(2, true)).' #'.$seq,
        ];
    }
}
