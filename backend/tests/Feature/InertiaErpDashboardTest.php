<?php

use App\Models\CapitalCompany;
use App\Models\Company;
use Illuminate\Support\Facades\Cache;
use Inertia\Testing\AssertableInertia as Assert;

describe('Inertia ERP Dashboard & CFO CRUD Routes', function () {
    beforeEach(function () {
        Cache::flush();
    });

    it('renders the Dashboard Inertia page with modules, companies, and capitalCompanies props', function () {
        $company = Company::factory()->create([
            'name' => 'PT. Slaras Nusa Foodlab',
        ]);
        CapitalCompany::factory()->create([
            'company_id' => $company->id,
            'stakeholder_name' => 'Rian',
            'capital' => 250000000,
        ]);

        $response = $this->get('/');

        $response->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Dashboard', false)
                ->has('modules', 5)
                ->where('modules.0.code', 'CFO')
                ->has('companies', 1)
                ->where('companies.0.name', 'PT. Slaras Nusa Foodlab')
                ->has('capitalCompanies', 1)
                ->where('capitalCompanies.0.stakeholder_name', 'Rian')
            );
    });

    it('creates, updates, and deletes companies and capital companies via Inertia web routes', function () {
        $storeCompanyRes = $this->from('/')->post('/cfo/companies', [
            'name' => 'PT. Slaras Nusa Foodlab',
        ]);
        $storeCompanyRes->assertRedirect('/');

        $company = Company::query()->where('name', 'PT. Slaras Nusa Foodlab')->firstOrFail();

        $updateCompanyRes = $this->from('/')->put("/cfo/companies/{$company->id}", [
            'name' => 'PT. Slaras Nusa Foodlab Baru',
        ]);
        $updateCompanyRes->assertRedirect('/');
        $this->assertDatabaseHas('companies', [
            'id' => $company->id,
            'name' => 'PT. Slaras Nusa Foodlab Baru',
        ]);

        $storeCapRes = $this->from('/')->post('/cfo/capital-companies', [
            'company_id' => $company->id,
            'stakeholder_name' => 'Budi Santoso',
            'capital' => 300000000.5,
        ]);
        $storeCapRes->assertRedirect('/');

        $cap = CapitalCompany::query()->where('company_id', $company->id)->firstOrFail();
        expect((float) $cap->capital)->toBe(300000000.5);

        $updateCapRes = $this->from('/')->put("/cfo/capital-companies/{$cap->id}", [
            'company_id' => $company->id,
            'stakeholder_name' => 'Budi Santoso Revisi',
            'capital' => 450000000,
        ]);
        $updateCapRes->assertRedirect('/');
        $this->assertDatabaseHas('capital_companies', [
            'id' => $cap->id,
            'stakeholder_name' => 'Budi Santoso Revisi',
        ]);

        $deleteCapRes = $this->from('/')->delete("/cfo/capital-companies/{$cap->id}");
        $deleteCapRes->assertRedirect('/');
        $this->assertSoftDeleted('capital_companies', ['id' => $cap->id]);

        $deleteCompanyRes = $this->from('/')->delete("/cfo/companies/{$company->id}");
        $deleteCompanyRes->assertRedirect('/');
        $this->assertSoftDeleted('companies', ['id' => $company->id]);
    });
});
