<?php

namespace Database\Seeders;

use App\Models\Company;
use App\Models\LabSample;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        LabSample::factory()->count(15)->create();

        Company::query()->firstOrCreate([
            'name' => 'PT. Slaras Nusa Foodlab',
        ]);
    }
}
