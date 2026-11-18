<?php

namespace Database\Seeders;

use App\Models\LabSample;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        LabSample::factory()->count(15)->create();
    }
}
