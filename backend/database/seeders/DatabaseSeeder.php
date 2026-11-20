<?php

namespace Database\Seeders;

use App\Models\CapitalCompany;
use App\Models\Company;
use App\Models\LabSample;
use App\Models\User;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        User::query()->firstOrCreate(
            ['email' => 'admin@foodlab.test'],
            [
                'name' => 'ERP Administrator',
                'password' => 'password',
                'email_verified_at' => now(),
            ]
        );

        LabSample::factory()->count(15)->create();

        $company = Company::query()->updateOrCreate(
            ['name' => 'PT. Slaras Nusa Foodlab'],
            ['series' => 1]
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
