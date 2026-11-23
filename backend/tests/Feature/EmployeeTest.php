<?php

use App\Enums\Agama;
use App\Enums\GolonganDarah;
use App\Enums\JenisDokumen;
use App\Enums\JenisKelamin;
use App\Models\Company;
use App\Models\Employee;
use App\Models\EmployeeDocument;
use App\Models\EmployeePosition;
use App\Models\EmploymentStatus;
use App\Models\PayrollGrade;
use App\Models\TaxStatus;
use App\Modules\CHO\Services\EmployeeService;
use Illuminate\Support\Facades\Cache;

describe('Employee CHO module', function () {
    beforeEach(function () {
        Cache::flush();
        actingAsErpUser();
    });

    it('supports CRUD, nested documents sync, QueryBuilder filtering/sorting/includes, caching, and JsonResource structure', function () {
        $company = Company::factory()->create(['name' => 'PT. Foodlab Nusantara']);
        $otherCompany = Company::factory()->create(['name' => 'PT. Foodlab Cabang']);

        $position = EmployeePosition::factory()->create(['company_id' => $company->id, 'name' => 'Analis Kimia']);
        $status = EmploymentStatus::factory()->create(['company_id' => $company->id, 'name' => 'Karyawan Tetap']);
        $grade = PayrollGrade::factory()->create(['company_id' => $company->id, 'grade' => 3, 'sub_grade' => 'A']);
        $taxStatus = TaxStatus::factory()->create(['company_id' => $company->id, 'code' => 'TK/0', 'name' => 'Tidak Kawin 0']);

        // Create via FormRequest + CreateEmployeeAction + DB::transaction
        $createRes = $this->postJson('/api/v1/modules/cho/employees', [
            'company_id' => $company->id,
            'employee_position_id' => $position->id,
            'employment_status_id' => $status->id,
            'payroll_grade_id' => $grade->id,
            'tax_status_id' => $taxStatus->id,
            'name' => 'Budi Santoso',
            'email' => 'budi.santoso@foodlab.test',
            'phone' => '081234567890',
            'photo_url' => 'https://cdn.foodlab.test/photos/budi.jpg',
            'nik_ktp' => '3201010101900001',
            'nickname' => 'Budi',
            'birth_place' => 'Bandung',
            'birth_date' => '1990-01-01',
            'gender' => JenisKelamin::LAKI_LAKI->value,
            'religion' => Agama::ISLAM->value,
            'blood_type' => GolonganDarah::O->value,
            'mother_name' => 'Siti Aminah',
            'ktp_address' => 'Jl. Merdeka No. 1, Bandung',
            'domicile_address' => 'Jl. Sudirman No. 10, Jakarta',
            'whatsapp_number' => '081234567890',
            'emergency_phone_number' => '081299998888',
            'instagram' => '@budisantoso',
            'tiktok' => '@buditiktok',
            'bpjs_ketenagakerjaan' => '11223344556',
            'bpjs_kesehatan' => '0001122334455',
            'npwp_number' => '123456789012345',
            'documents' => [
                [
                    'document_type' => JenisDokumen::KTP->value,
                    'file_url' => 'https://cdn.foodlab.test/docs/budi-ktp.pdf',
                ],
                [
                    'document_type' => JenisDokumen::NPWP->value,
                    'file_url' => 'https://cdn.foodlab.test/docs/budi-npwp.pdf',
                ],
            ],
        ]);

        $createRes->assertCreated()
            ->assertJsonStructure([
                'data' => [
                    'id',
                    'company_id',
                    'employee_position_id',
                    'employment_status_id',
                    'payroll_grade_id',
                    'tax_status_id',
                    'employee_attendance_code',
                    'name',
                    'email',
                    'phone',
                    'photo_url',
                    'nik_ktp',
                    'nickname',
                    'birth_place',
                    'birth_date',
                    'gender',
                    'religion',
                    'blood_type',
                    'mother_name',
                    'ktp_address',
                    'domicile_address',
                    'whatsapp_number',
                    'emergency_phone_number',
                    'instagram',
                    'tiktok',
                    'bpjs_ketenagakerjaan',
                    'bpjs_kesehatan',
                    'npwp_number',
                    'company',
                    'employee_position',
                    'employment_status',
                    'payroll_grade',
                    'tax_status',
                    'documents' => [
                        '*' => [
                            'id',
                            'employee_id',
                            'document_type',
                            'file_url',
                            'created_at',
                            'updated_at',
                            'deleted_at',
                        ],
                    ],
                    'created_at',
                    'updated_at',
                    'deleted_at',
                ],
            ])
            ->assertJsonPath('data.company_id', $company->id)
            ->assertJsonPath('data.name', 'Budi Santoso')
            ->assertJsonPath('data.nik_ktp', '3201010101900001')
            ->assertJsonPath('data.birth_date', '1990-01-01')
            ->assertJsonPath('data.gender', 'laki_laki')
            ->assertJsonPath('data.religion', 'islam')
            ->assertJsonPath('data.blood_type', 'o')
            ->assertJsonCount(2, 'data.documents');

        $budiId = $createRes->json('data.id');
        expect($createRes->json('data.employee_attendance_code'))->toBe('BudiAnalisKimia'.$budiId);
        $budiModel = Employee::query()->with('documents')->findOrFail($budiId);
        expect($budiModel->gender)->toBe(JenisKelamin::LAKI_LAKI)
            ->and($budiModel->employee_attendance_code)->toBe('BudiAnalisKimia'.$budiId)
            ->and($budiModel->religion)->toBe(Agama::ISLAM)
            ->and($budiModel->blood_type)->toBe(GolonganDarah::O)
            ->and($budiModel->documents)->toHaveCount(2)
            ->and($budiModel->documents->first()->document_type)->toBeInstanceOf(JenisDokumen::class)
            ->and($company->employees()->whereKey($budiId)->exists())->toBeTrue();

        $ktpDocId = $budiModel->documents->firstWhere('document_type', JenisDokumen::KTP)->id;
        $npwpDocId = $budiModel->documents->firstWhere('document_type', JenisDokumen::NPWP)->id;

        // Second employee (for sorting/filtering) with same name to verify defaultSort('name', '-id')
        $budiSecond = Employee::factory()->create([
            'company_id' => $company->id,
            'employee_position_id' => $position->id,
            'employment_status_id' => $status->id,
            'payroll_grade_id' => $grade->id,
            'tax_status_id' => $taxStatus->id,
            'name' => 'Budi Santoso',
            'nickname' => 'Budi Jr',
            'nik_ktp' => '3201010101920002',
            'email' => 'budi.jr@foodlab.test',
            'phone' => '081300001111',
            'birth_date' => '1992-05-10',
            'gender' => JenisKelamin::LAKI_LAKI->value,
            'religion' => Agama::KRISTEN->value,
            'blood_type' => GolonganDarah::A->value,
        ]);

        // Third employee in another company
        $andi = Employee::factory()->create([
            'company_id' => $otherCompany->id,
            'employee_position_id' => null,
            'employment_status_id' => null,
            'payroll_grade_id' => null,
            'tax_status_id' => null,
            'name' => 'Andi Wijaya',
            'nickname' => 'Andi',
            'nik_ktp' => '3171010101880003',
            'email' => 'andi@foodlab.test',
            'phone' => '081500002222',
            'birth_date' => '1988-03-15',
            'gender' => JenisKelamin::PEREMPUAN->value,
            'religion' => Agama::KATOLIK->value,
            'blood_type' => GolonganDarah::AB->value,
        ]);

        // Unfiltered list populates cache and uses defaultSort('name', '-id')
        expect(Cache::has(EmployeeService::CACHE_KEY_LIST))->toBeFalse();

        $this->getJson('/api/v1/modules/cho/employees')
            ->assertOk()
            ->assertJsonCount(3, 'data')
            ->assertJsonPath('meta.cache_key', EmployeeService::CACHE_KEY_LIST)
            ->assertJsonPath('data.0.id', $andi->id) // Andi Wijaya < Budi Santoso
            ->assertJsonPath('data.1.id', $budiSecond->id) // Same name, higher id first (-id)
            ->assertJsonPath('data.2.id', $budiId);

        expect(Cache::has(EmployeeService::CACHE_KEY_LIST))->toBeTrue();

        // Exact filters
        $this->getJson("/api/v1/modules/cho/employees?filter[company_id]={$company->id}&filter[religion]=islam&filter[blood_type]=o&filter[gender]=laki_laki")
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $budiId);

        $this->getJson("/api/v1/modules/cho/employees?filter[employee_position_id]={$position->id}&filter[employment_status_id]={$status->id}&filter[payroll_grade_id]={$grade->id}&filter[tax_status_id]={$taxStatus->id}")
            ->assertOk()
            ->assertJsonCount(2, 'data');

        $this->getJson('/api/v1/modules/cho/employees?filter[employee_attendance_code]='.urlencode('BudiAnalisKimia'.$budiId))
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $budiId);

        // Search filter across name, nickname, nik_ktp, employee_attendance_code, email, phone
        foreach (['Andi Wijaya', 'Budi Jr', '3201010101900001', 'BudiAnalisKimia'.$budiId, 'andi@foodlab.test', '081300001111'] as $term) {
            $this->getJson('/api/v1/modules/cho/employees?filter[search]='.urlencode($term))
                ->assertOk()
                ->assertJsonCount(1, 'data');
        }

        // Sorting & Pagination
        $this->getJson('/api/v1/modules/cho/employees?sort=birth_date&per_page=2&page=1')
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('meta.total', 3)
            ->assertJsonPath('data.0.id', $andi->id) // 1988-03-15
            ->assertJsonPath('data.1.id', $budiId); // 1990-01-01

        $this->getJson('/api/v1/modules/cho/employees?sort=-nik_ktp')
            ->assertOk()
            ->assertJsonPath('data.0.id', $budiSecond->id); // 3201010101920002

        // Explicit includes omit unrequested relations
        $this->getJson("/api/v1/modules/cho/employees?filter[company_id]={$otherCompany->id}&include=company,documents")
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.company.name', 'PT. Foodlab Cabang')
            ->assertJsonMissingPath('data.0.employee_position')
            ->assertJsonMissingPath('data.0.tax_status');

        // Show single employee
        $this->getJson("/api/v1/modules/cho/employees/{$budiId}")
            ->assertOk()
            ->assertJsonPath('data.id', $budiId)
            ->assertJsonPath('data.company.name', 'PT. Foodlab Nusantara')
            ->assertJsonPath('data.employee_position.name', 'Analis Kimia')
            ->assertJsonPath('data.employment_status.name', 'Karyawan Tetap')
            ->assertJsonPath('data.payroll_grade.grade', 3)
            ->assertJsonPath('data.tax_status.code', 'TK/0')
            ->assertJsonCount(2, 'data.documents');

        // PUT update keeping same nik_ktp, updating KTP file_url, removing NPWP, adding KK -> invalidates cache
        $this->putJson("/api/v1/modules/cho/employees/{$budiId}", [
            'company_id' => $company->id,
            'employee_position_id' => $position->id,
            'employment_status_id' => $status->id,
            'payroll_grade_id' => $grade->id,
            'tax_status_id' => $taxStatus->id,
            'name' => 'Budi Santoso, S.Si.',
            'email' => 'budi.santoso@foodlab.test',
            'phone' => '081234567890',
            'photo_url' => 'https://cdn.foodlab.test/photos/budi.jpg',
            'nik_ktp' => '3201010101900001',
            'nickname' => 'Budi',
            'birth_place' => 'Bandung',
            'birth_date' => '1990-01-01',
            'gender' => JenisKelamin::LAKI_LAKI->value,
            'religion' => Agama::ISLAM->value,
            'blood_type' => GolonganDarah::AB->value,
            'mother_name' => 'Siti Aminah',
            'ktp_address' => 'Jl. Merdeka No. 1, Bandung',
            'domicile_address' => 'Jl. Sudirman No. 10, Jakarta',
            'whatsapp_number' => '081234567890',
            'emergency_phone_number' => '081299998888',
            'instagram' => '@budisantoso',
            'tiktok' => '@buditiktok',
            'bpjs_ketenagakerjaan' => '11223344556',
            'bpjs_kesehatan' => '0001122334455',
            'npwp_number' => '123456789012345',
            'documents' => [
                [
                    'document_type' => JenisDokumen::KTP->value,
                    'file_url' => 'https://cdn.foodlab.test/docs/budi-ktp-v2.pdf',
                ],
                [
                    'document_type' => JenisDokumen::KK->value,
                    'file_url' => 'https://cdn.foodlab.test/docs/budi-kk.pdf',
                ],
            ],
        ])->assertOk()
            ->assertJsonPath('data.name', 'Budi Santoso, S.Si.')
            ->assertJsonPath('data.blood_type', 'ab')
            ->assertJsonCount(2, 'data.documents');

        expect(Cache::has(EmployeeService::CACHE_KEY_LIST))->toBeFalse();
        $this->assertSoftDeleted('employee_documents', ['id' => $npwpDocId]);
        expect(EmployeeDocument::query()->findOrFail($ktpDocId)->file_url)
            ->toBe('https://cdn.foodlab.test/docs/budi-ktp-v2.pdf');

        // PATCH partial update without documents preserves existing documents
        $this->patchJson("/api/v1/modules/cho/employees/{$budiId}", [
            'nickname' => 'Pak Budi',
        ])->assertOk()
            ->assertJsonPath('data.nickname', 'Pak Budi')
            ->assertJsonPath('data.name', 'Budi Santoso, S.Si.')
            ->assertJsonCount(2, 'data.documents');

        // Soft delete employee + active documents
        $this->deleteJson("/api/v1/modules/cho/employees/{$budiId}")
            ->assertOk()
            ->assertJsonStructure(['message']);

        $this->assertSoftDeleted('employees', ['id' => $budiId]);
        $this->assertSoftDeleted('employee_documents', ['id' => $ktpDocId]);
        $this->getJson("/api/v1/modules/cho/employees/{$budiId}")->assertNotFound();
    });

    it('returns 422 on deleted company, soft-deleted master FKs, invalid enums, duplicate nik_ktp, bad birth_date, and duplicate document_type', function () {
        $company = Company::factory()->create();
        $deletedCompany = Company::factory()->create();
        $deletedCompany->delete();

        $deletedPosition = EmployeePosition::factory()->create(['company_id' => $company->id]);
        $deletedPosition->delete();

        $deletedStatus = EmploymentStatus::factory()->create(['company_id' => $company->id]);
        $deletedStatus->delete();

        $deletedGrade = PayrollGrade::factory()->create(['company_id' => $company->id]);
        $deletedGrade->delete();

        $deletedTaxStatus = TaxStatus::factory()->create(['company_id' => $company->id]);
        $deletedTaxStatus->delete();

        $existing = Employee::factory()->create([
            'company_id' => $company->id,
            'nik_ktp' => '3201010101909999',
        ]);

        // Soft-deleted company, soft-deleted master FKs, invalid enums, bad birth_date, duplicate document_type
        $this->postJson('/api/v1/modules/cho/employees', [
            'company_id' => $deletedCompany->id,
            'employee_position_id' => $deletedPosition->id,
            'employment_status_id' => $deletedStatus->id,
            'payroll_grade_id' => $deletedGrade->id,
            'tax_status_id' => $deletedTaxStatus->id,
            'name' => 'Invalid Employee',
            'email' => 'not-an-email',
            'nik_ktp' => '3201010101909999',
            'birth_date' => now()->addDay()->format('Y-m-d'),
            'gender' => 'unknown_gender',
            'religion' => 'unknown_religion',
            'blood_type' => 'z',
            'documents' => [
                [
                    'document_type' => JenisDokumen::KTP->value,
                    'file_url' => 'https://cdn.foodlab.test/docs/ktp-1.pdf',
                ],
                [
                    'document_type' => JenisDokumen::KTP->value,
                    'file_url' => 'https://cdn.foodlab.test/docs/ktp-2.pdf',
                ],
            ],
        ])->assertUnprocessable()
            ->assertJsonValidationErrors([
                'company_id',
                'employee_position_id',
                'employment_status_id',
                'payroll_grade_id',
                'tax_status_id',
                'email',
                'birth_date',
                'gender',
                'religion',
                'blood_type',
                'documents.0.document_type',
                'documents.1.document_type',
            ]);

        // Duplicate nik_ktp within the same active company returns 422
        $this->postJson('/api/v1/modules/cho/employees', [
            'company_id' => $company->id,
            'name' => 'Duplicate NIK Employee',
            'nik_ktp' => $existing->nik_ktp,
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['nik_ktp']);

        // Invalid document_type enum, non-16-digit nik_ktp, invalid birth_date format, missing name
        $this->postJson('/api/v1/modules/cho/employees', [
            'company_id' => $company->id,
            'name' => '',
            'nik_ktp' => '12345',
            'birth_date' => '20-01-1990',
            'documents' => [
                [
                    'document_type' => 'sim_c',
                    'file_url' => 'https://cdn.foodlab.test/docs/sim.pdf',
                ],
            ],
        ])->assertUnprocessable()
            ->assertJsonValidationErrors([
                'name',
                'nik_ktp',
                'birth_date',
                'documents.0.document_type',
            ]);

        // Duplicate nik_ktp on update to another employee's nik_ktp
        $other = Employee::factory()->create([
            'company_id' => $company->id,
            'nik_ktp' => '3201010101908888',
        ]);

        $this->patchJson("/api/v1/modules/cho/employees/{$other->id}", [
            'nik_ktp' => $existing->nik_ktp,
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['nik_ktp']);
    });

    it('enforces strict required validation for all employee fields and minimum 1 document on create and update', function () {
        $company = Company::factory()->create();
        $otherCompany = Company::factory()->create();

        $position = EmployeePosition::factory()->create(['company_id' => $company->id]);
        $status = EmploymentStatus::factory()->create(['company_id' => $company->id]);
        $grade = PayrollGrade::factory()->create(['company_id' => $company->id]);
        $taxStatus = TaxStatus::factory()->create(['company_id' => $company->id]);

        $otherPosition = EmployeePosition::factory()->create(['company_id' => $otherCompany->id]);

        $allRequiredFields = [
            'company_id',
            'employee_position_id',
            'employment_status_id',
            'payroll_grade_id',
            'tax_status_id',
            'name',
            'email',
            'phone',
            'photo_url',
            'nik_ktp',
            'nickname',
            'birth_place',
            'birth_date',
            'gender',
            'religion',
            'blood_type',
            'mother_name',
            'ktp_address',
            'domicile_address',
            'whatsapp_number',
            'emergency_phone_number',
            'instagram',
            'tiktok',
            'bpjs_ketenagakerjaan',
            'bpjs_kesehatan',
            'npwp_number',
            'documents',
        ];

        // Empty POST payload rejects all required fields and documents
        $this->postJson('/api/v1/modules/cho/employees', [])
            ->assertUnprocessable()
            ->assertJsonValidationErrors($allRequiredFields);

        // Whitespace-only values and empty documents array return 422
        $this->postJson('/api/v1/modules/cho/employees', [
            'company_id' => $company->id,
            'employee_position_id' => $position->id,
            'employment_status_id' => $status->id,
            'payroll_grade_id' => $grade->id,
            'tax_status_id' => $taxStatus->id,
            'name' => '   ',
            'email' => 'valid@foodlab.test',
            'phone' => '   ',
            'photo_url' => '   ',
            'nik_ktp' => '3201010101900010',
            'nickname' => '   ',
            'birth_place' => '   ',
            'birth_date' => '1995-05-05',
            'gender' => JenisKelamin::PEREMPUAN->value,
            'religion' => Agama::ISLAM->value,
            'blood_type' => GolonganDarah::A->value,
            'mother_name' => '   ',
            'ktp_address' => '   ',
            'domicile_address' => '   ',
            'whatsapp_number' => '   ',
            'emergency_phone_number' => '   ',
            'instagram' => '   ',
            'tiktok' => '   ',
            'bpjs_ketenagakerjaan' => '   ',
            'bpjs_kesehatan' => '   ',
            'npwp_number' => '   ',
            'documents' => [],
        ])->assertUnprocessable()
            ->assertJsonValidationErrors([
                'name',
                'phone',
                'photo_url',
                'nickname',
                'birth_place',
                'mother_name',
                'ktp_address',
                'domicile_address',
                'whatsapp_number',
                'emergency_phone_number',
                'instagram',
                'tiktok',
                'bpjs_ketenagakerjaan',
                'bpjs_kesehatan',
                'npwp_number',
                'documents',
            ]);

        // Document entry with whitespace-only file_url and cross-company position return 422
        $this->postJson('/api/v1/modules/cho/employees', [
            'company_id' => $company->id,
            'employee_position_id' => $otherPosition->id,
            'employment_status_id' => $status->id,
            'payroll_grade_id' => $grade->id,
            'tax_status_id' => $taxStatus->id,
            'name' => 'Sari Indah',
            'email' => 'sari@foodlab.test',
            'phone' => '081234567891',
            'photo_url' => 'https://cdn.foodlab.test/photos/sari.jpg',
            'nik_ktp' => '3201010101900011',
            'nickname' => 'Sari',
            'birth_place' => 'Surabaya',
            'birth_date' => '1995-05-05',
            'gender' => JenisKelamin::PEREMPUAN->value,
            'religion' => Agama::ISLAM->value,
            'blood_type' => GolonganDarah::B->value,
            'mother_name' => 'Aminah',
            'ktp_address' => 'Jl. KTP No. 1',
            'domicile_address' => 'Jl. Domisili No. 2',
            'whatsapp_number' => '081234567891',
            'emergency_phone_number' => '081234567892',
            'instagram' => '@sari',
            'tiktok' => '@saritiktok',
            'bpjs_ketenagakerjaan' => '1122334455',
            'bpjs_kesehatan' => '00011223344',
            'npwp_number' => '123456789012345',
            'documents' => [
                [
                    'document_type' => JenisDokumen::KTP->value,
                    'file_url' => '   ',
                ],
            ],
        ])->assertUnprocessable()
            ->assertJsonValidationErrors([
                'employee_position_id',
                'documents.0.file_url',
            ]);

        // PUT with missing fields or empty documents returns 422
        $employee = Employee::factory()->create([
            'company_id' => $company->id,
            'employee_position_id' => $position->id,
            'employment_status_id' => $status->id,
            'payroll_grade_id' => $grade->id,
            'tax_status_id' => $taxStatus->id,
        ]);

        $this->putJson("/api/v1/modules/cho/employees/{$employee->id}", [
            'company_id' => $company->id,
            'name' => 'Updated Only Name',
            'documents' => [],
        ])->assertUnprocessable()
            ->assertJsonValidationErrors([
                'employee_position_id',
                'employment_status_id',
                'payroll_grade_id',
                'tax_status_id',
                'email',
                'phone',
                'photo_url',
                'nik_ktp',
                'nickname',
                'birth_place',
                'birth_date',
                'gender',
                'religion',
                'blood_type',
                'mother_name',
                'ktp_address',
                'domicile_address',
                'whatsapp_number',
                'emergency_phone_number',
                'instagram',
                'tiktok',
                'bpjs_ketenagakerjaan',
                'bpjs_kesehatan',
                'npwp_number',
                'documents',
            ]);

        // PATCH cannot clear required fields or documents to empty
        $this->patchJson("/api/v1/modules/cho/employees/{$employee->id}", [
            'nickname' => null,
            'documents' => [],
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['nickname', 'documents']);
    });

    it('allows nik_ktp reuse across companies or after soft-delete and re-syncing soft-deleted document types', function () {
        $companyA = Company::factory()->create();
        $companyB = Company::factory()->create();

        $posA = EmployeePosition::factory()->create(['company_id' => $companyA->id]);
        $statusA = EmploymentStatus::factory()->create(['company_id' => $companyA->id]);
        $gradeA = PayrollGrade::factory()->create(['company_id' => $companyA->id]);
        $taxA = TaxStatus::factory()->create(['company_id' => $companyA->id]);

        $posB = EmployeePosition::factory()->create(['company_id' => $companyB->id]);
        $statusB = EmploymentStatus::factory()->create(['company_id' => $companyB->id]);
        $gradeB = PayrollGrade::factory()->create(['company_id' => $companyB->id]);
        $taxB = TaxStatus::factory()->create(['company_id' => $companyB->id]);

        $nik = '3201010101907777';

        $employeeA = Employee::factory()->create([
            'company_id' => $companyA->id,
            'employee_position_id' => $posA->id,
            'employment_status_id' => $statusA->id,
            'payroll_grade_id' => $gradeA->id,
            'tax_status_id' => $taxA->id,
            'nik_ktp' => $nik,
        ]);

        // Re-syncing a previously soft-deleted document_type succeeds
        $this->patchJson("/api/v1/modules/cho/employees/{$employeeA->id}", [
            'documents' => [
                ['document_type' => JenisDokumen::KTP->value, 'file_url' => 'https://cdn.foodlab.test/docs/ktp-1.pdf'],
                ['document_type' => JenisDokumen::NPWP->value, 'file_url' => 'https://cdn.foodlab.test/docs/npwp-1.pdf'],
            ],
        ])->assertOk();

        $this->patchJson("/api/v1/modules/cho/employees/{$employeeA->id}", [
            'documents' => [
                ['document_type' => JenisDokumen::KTP->value, 'file_url' => 'https://cdn.foodlab.test/docs/ktp-1.pdf'],
            ],
        ])->assertOk();

        $this->patchJson("/api/v1/modules/cho/employees/{$employeeA->id}", [
            'documents' => [
                ['document_type' => JenisDokumen::KTP->value, 'file_url' => 'https://cdn.foodlab.test/docs/ktp-1.pdf'],
                ['document_type' => JenisDokumen::NPWP->value, 'file_url' => 'https://cdn.foodlab.test/docs/npwp-2.pdf'],
            ],
        ])->assertOk();

        $basePayloadB = [
            'company_id' => $companyB->id,
            'employee_position_id' => $posB->id,
            'employment_status_id' => $statusB->id,
            'payroll_grade_id' => $gradeB->id,
            'tax_status_id' => $taxB->id,
            'name' => 'Cross Company Employee',
            'email' => 'cross@foodlab.test',
            'phone' => '08123456789',
            'photo_url' => 'https://cdn.foodlab.test/photos/cross.jpg',
            'nik_ktp' => $nik,
            'nickname' => 'Cross',
            'birth_place' => 'Bandung',
            'birth_date' => '1991-02-02',
            'gender' => 'laki_laki',
            'religion' => 'islam',
            'blood_type' => GolonganDarah::O->value,
            'mother_name' => 'Siti',
            'ktp_address' => 'Jl. KTP',
            'domicile_address' => 'Jl. Domisili',
            'whatsapp_number' => '08123456789',
            'emergency_phone_number' => '08123456780',
            'instagram' => '@cross',
            'tiktok' => '@crosstt',
            'bpjs_ketenagakerjaan' => '1111111111',
            'bpjs_kesehatan' => '2222222222',
            'npwp_number' => '333333333333333',
            'documents' => [
                ['document_type' => JenisDokumen::KTP->value, 'file_url' => 'https://cdn.foodlab.test/docs/ktp-b.pdf'],
            ],
        ];

        // Same nik_ktp in another company succeeds
        $this->postJson('/api/v1/modules/cho/employees', $basePayloadB)->assertCreated();

        // Soft-deleting employeeA allows reusing nik_ktp in companyA
        $this->deleteJson("/api/v1/modules/cho/employees/{$employeeA->id}")->assertOk();

        $this->postJson('/api/v1/modules/cho/employees', [
            ...$basePayloadB,
            'company_id' => $companyA->id,
            'employee_position_id' => $posA->id,
            'employment_status_id' => $statusA->id,
            'payroll_grade_id' => $gradeA->id,
            'tax_status_id' => $taxA->id,
            'email' => 'reborn@foodlab.test',
        ])->assertCreated();
    });

    it('auto-generates and updates employee_attendance_code barcode payload across create, update, and position rename', function () {
        $company = Company::factory()->create();
        $positionA = EmployeePosition::factory()->create([
            'company_id' => $company->id,
            'name' => 'QA / QC - Lab #1',
        ]);
        $positionB = EmployeePosition::factory()->create([
            'company_id' => $company->id,
            'name' => 'R&D (Senior)',
        ]);
        $status = EmploymentStatus::factory()->create(['company_id' => $company->id]);
        $grade = PayrollGrade::factory()->create(['company_id' => $company->id]);
        $taxStatus = TaxStatus::factory()->create(['company_id' => $company->id]);

        // Create via API with hyphenated/symbol first token and symbol-heavy position name
        $createRes = $this->postJson('/api/v1/modules/cho/employees', [
            'company_id' => $company->id,
            'employee_position_id' => $positionA->id,
            'employment_status_id' => $status->id,
            'payroll_grade_id' => $grade->id,
            'tax_status_id' => $taxStatus->id,
            'name' => 'Siti-Nurhaliza Putri, S.Si.',
            'email' => 'siti@foodlab.test',
            'phone' => '081234567890',
            'photo_url' => 'https://cdn.foodlab.test/photos/siti.jpg',
            'nik_ktp' => '3201010101900111',
            'nickname' => 'Siti',
            'birth_place' => 'Bandung',
            'birth_date' => '1994-03-10',
            'gender' => JenisKelamin::PEREMPUAN->value,
            'religion' => Agama::ISLAM->value,
            'blood_type' => GolonganDarah::A->value,
            'mother_name' => 'Aminah',
            'ktp_address' => 'Jl. Merdeka No. 1',
            'domicile_address' => 'Jl. Merdeka No. 1',
            'whatsapp_number' => '081234567890',
            'emergency_phone_number' => '081299998888',
            'instagram' => '@siti',
            'tiktok' => '@sititt',
            'bpjs_ketenagakerjaan' => '11223344556',
            'bpjs_kesehatan' => '0001122334455',
            'npwp_number' => '123456789012345',
            'documents' => [
                [
                    'document_type' => JenisDokumen::KTP->value,
                    'file_url' => 'https://cdn.foodlab.test/docs/siti-ktp.pdf',
                ],
            ],
        ])->assertCreated();

        $employeeId = $createRes->json('data.id');
        expect($createRes->json('data.employee_attendance_code'))
            ->toBe('SitiNurhalizaQAQCLab1'.$employeeId);

        // PATCH updating employee name regenerates employee_attendance_code
        $this->patchJson("/api/v1/modules/cho/employees/{$employeeId}", [
            'name' => 'Rahmat Hidayat',
        ])->assertOk()
            ->assertJsonPath('data.employee_attendance_code', 'RahmatQAQCLab1'.$employeeId);

        // PATCH changing employee_position_id regenerates employee_attendance_code
        $this->patchJson("/api/v1/modules/cho/employees/{$employeeId}", [
            'employee_position_id' => $positionB->id,
        ])->assertOk()
            ->assertJsonPath('data.employee_attendance_code', 'RahmatRDSenior'.$employeeId);

        // Renaming EmployeePosition updates linked employees' employee_attendance_code
        $this->putJson("/api/v1/modules/cho/employee-positions/{$positionB->id}", [
            'company_id' => $company->id,
            'name' => 'Lead Chem!',
        ])->assertOk();

        $this->getJson("/api/v1/modules/cho/employees/{$employeeId}")
            ->assertOk()
            ->assertJsonPath('data.employee_attendance_code', 'RahmatLeadChem'.$employeeId);

        // Employee without position omits position part cleanly
        $noPositionEmployee = Employee::factory()->create([
            'company_id' => $company->id,
            'employee_position_id' => null,
            'name' => 'Andi.Pratama Wijaya',
        ]);
        expect($noPositionEmployee->employee_attendance_code)
            ->toBe('AndiPratama'.$noPositionEmployee->id);
    });
});
