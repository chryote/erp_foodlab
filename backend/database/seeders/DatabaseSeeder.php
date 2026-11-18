<?php

namespace Database\Seeders;

use App\Models\CapitalCompany;
use App\Models\Company;
use App\Models\LabSample;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        LabSample::factory()->count(15)->create();

        $company = Company::query()->updateOrCreate(
            ['name' => 'PT. Slaras Nusa Foodlab']
        );

        CapitalCompany::query()->updateOrCreate(
            [
                'company_id' => $company->id,
                'stakeholder_name' => 'Rian',
            ],
            ['capital' => 250000000.0]
        );
    }
}

