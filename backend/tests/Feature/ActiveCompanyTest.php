<?php

use App\Enums\Agama;
use App\Enums\GolonganDarah;
use App\Enums\JenisDokumen;
use App\Enums\JenisKelamin;
use App\Models\Company;
use App\Models\Employee;
use App\Support\ActiveCompany;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Context;
use Illuminate\Support\Facades\Storage;

describe('Active Company global context & CHO enums/upload', function () {
    beforeEach(function () {
        Cache::flush();
        ActiveCompany::clear();
        Storage::fake('public');
        actingAsErpUser();
    });

    it('stores the active clicked company globally across backend requests via endpoint and header', function () {
        $companyA = Company::factory()->create(['name' => 'PT. Foodlab Alpha']);
        $companyB = Company::factory()->create(['name' => 'PT. Foodlab Beta']);

        $employeeA = Employee::factory()->create(['company_id' => $companyA->id, 'name' => 'Karyawan Alpha']);
        $employeeB = Employee::factory()->create(['company_id' => $companyB->id, 'name' => 'Karyawan Beta']);

        // Initially no active company
        $this->getJson('/api/v1/active-company')
            ->assertOk()
            ->assertJsonPath('data', null);

        $this->getJson('/api/v1/modules/cho/employees?active_company=1')
            ->assertOk()
            ->assertJsonCount(0, 'data');

        // Persist active company via endpoint (called when clicking secondary tab)
        $this->postJson('/api/v1/active-company', ['company_id' => $companyA->id])
            ->assertOk()
            ->assertJsonPath('data.id', $companyA->id)
            ->assertJsonPath('data.name', 'PT. Foodlab Alpha');

        // Global helpers & globals reflect active company
        expect(active_company()?->id)->toBe($companyA->id)
            ->and(active_company_id())->toBe($companyA->id)
            ->and(Context::get('active_company_id'))->toBe($companyA->id)
            ->and(config('erp.active_company_id'))->toBe($companyA->id)
            ->and($GLOBALS['active_company_id'])->toBe($companyA->id);

        // Subsequent request without header resolves from persisted cache
        $this->getJson('/api/v1/active-company')
            ->assertOk()
            ->assertJsonPath('data.id', $companyA->id);

        $this->getJson('/api/v1/modules/cho/employees?active_company=1')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $employeeA->id);

        // X-Active-Company-Id header overrides for the request
        $this->withHeaders(['X-Active-Company-Id' => (string) $companyB->id])
            ->getJson('/api/v1/modules/cho/employees?active_company=1')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $employeeB->id);

        // Clearing active company resets global state
        $this->postJson('/api/v1/active-company', ['company_id' => null])
            ->assertOk()
            ->assertJsonPath('data', null);

        expect(active_company())->toBeNull()
            ->and(active_company_id())->toBeNull();
    });

    it('validates company_id when updating active company', function () {
        $deleted = Company::factory()->create();
        $deleted->delete();

        $this->postJson('/api/v1/active-company', ['company_id' => $deleted->id])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['company_id']);
    });

    it('exposes CHO enum options for Agama, GolonganDarah, JenisKelamin, and JenisDokumen', function () {
        $this->getJson('/api/v1/modules/cho/enums')
            ->assertOk()
            ->assertJsonPath('data.agama', Agama::options())
            ->assertJsonPath('data.golongan_darah', GolonganDarah::options())
            ->assertJsonPath('data.jenis_kelamin', JenisKelamin::options())
            ->assertJsonPath('data.jenis_dokumen', JenisDokumen::options());
    });

    it('uploads employee documents using DocumentService and JenisDokumen validation', function () {
        $pdf = UploadedFile::fake()->create('ktp.pdf', 120, 'application/pdf');

        $response = $this->post('/api/v1/modules/cho/employees/upload-document', [
            'document_type' => JenisDokumen::KTP->value,
            'document' => $pdf,
        ], ['Accept' => 'application/json']);

        $response->assertCreated()
            ->assertJsonStructure(['path', 'disk', 'original_name', 'mime_type', 'size', 'url'])
            ->assertJsonPath('disk', 'public')
            ->assertJsonPath('original_name', 'ktp.pdf');

        $path = $response->json('path');
        expect($path)->toStartWith('employees/documents/ktp/');
        Storage::disk('public')->assertExists($path);

        // PAS_FOTO rejects PDF files
        $this->post('/api/v1/modules/cho/employees/upload-document', [
            'document_type' => JenisDokumen::PAS_FOTO->value,
            'document' => UploadedFile::fake()->create('avatar.pdf', 30, 'application/pdf'),
        ], ['Accept' => 'application/json'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['document']);
    });
});
