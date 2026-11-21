<?php

namespace Database\Seeders;

use App\Enums\Agama;
use App\Enums\GolonganDarah;
use App\Enums\JenisDokumen;
use App\Enums\JenisKelamin;
use App\Enums\ShiftStatusEnum;
use App\Models\CapitalCompany;
use App\Models\Company;
use App\Models\CompanyAsset;
use App\Models\Employee;
use App\Models\EmployeeDocument;
use App\Models\EmployeePosition;
use App\Models\EmployeeShift;
use App\Models\EmploymentStatus;
use App\Models\ExpenseCategory;
use App\Models\ExpenseItem;
use App\Models\ExpenseType;
use App\Models\LabSample;
use App\Models\PayrollGrade;
use App\Models\TaxStatus;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        DB::transaction(function (): void {
            $this->seedAdminUser();
            $this->seedLabSamples();

            $company = $this->seedCompany();

            $this->seedCapital($company);
            $this->seedCfoOperations($company);
            $this->seedCfoAssets($company);
            $this->seedChoModule($company);
            $this->seedEmployeeShifts();
        });

        Cache::flush();
    }

    private function seedAdminUser(): void
    {
        $user = User::query()->firstOrNew(['email' => 'admin@foodlab.test']);
        $user->name = 'ERP Administrator';

        if (! $user->exists) {
            $user->password = 'password';
        }

        $user->email_verified_at ??= now();
        $user->save();
    }

    private function seedLabSamples(): void
    {
        if (LabSample::query()->withTrashed()->count() === 0) {
            LabSample::factory()->count(15)->create();
        }
    }

    private function seedCompany(): Company
    {
        $company = Company::query()->withTrashed()->firstOrNew([
            'name' => 'PT. Slaras Nusa Foodlab',
        ]);
        $company->series = 1;
        $company->deleted_at = null;
        $company->save();

        return $company;
    }

    private function seedCapital(Company $company): void
    {
        CapitalCompany::query()->updateOrCreate(
            [
                'company_id' => $company->id,
                'stakeholder_name' => 'Rian',
            ],
            ['capital' => 250000000.0]
        );
    }

    private function seedCfoOperations(Company $company): void
    {
        $labCategory = ExpenseCategory::query()->updateOrCreate(
            ['company_id' => $company->id, 'name' => 'Operasional Laboratorium'],
            []
        );
        $utilityCategory = ExpenseCategory::query()->updateOrCreate(
            ['company_id' => $company->id, 'name' => 'Utilitas & Fasilitas'],
            []
        );

        $reagentType = ExpenseType::query()->updateOrCreate(
            [
                'company_id' => $company->id,
                'expense_category_id' => $labCategory->id,
                'name' => 'Reagen & Bahan Kimia',
            ],
            []
        );
        $calibrationType = ExpenseType::query()->updateOrCreate(
            [
                'company_id' => $company->id,
                'expense_category_id' => $labCategory->id,
                'name' => 'Kalibrasi Peralatan',
            ],
            []
        );
        $electricType = ExpenseType::query()->updateOrCreate(
            [
                'company_id' => $company->id,
                'expense_category_id' => $utilityCategory->id,
                'name' => 'Listrik & Air',
            ],
            []
        );

        $items = [
            [
                'expense_category_id' => $labCategory->id,
                'expense_type_id' => $reagentType->id,
                'name' => 'Media Agar Mikrobiologi 500g',
                'amount' => 3500000.0,
                'purchased_on' => '2026-11-05',
                'closing_date' => '2026-11-30',
                'detail' => 'Pengadaan media kultur uji pangan batch November',
            ],
            [
                'expense_category_id' => $labCategory->id,
                'expense_type_id' => $calibrationType->id,
                'name' => 'Kalibrasi pH Meter & Neraca Analitik',
                'amount' => 4250000.0,
                'purchased_on' => '2026-11-10',
                'closing_date' => '2026-11-30',
                'detail' => 'Kalibrasi berkala ISO 17025',
            ],
            [
                'expense_category_id' => $utilityCategory->id,
                'expense_type_id' => $electricType->id,
                'name' => 'Tagihan Listrik Lab & Cold Storage',
                'amount' => 6800000.0,
                'purchased_on' => '2026-11-15',
                'closing_date' => '2026-11-30',
                'detail' => 'Pemakaian daya laboratorium dan ruang pendingin',
            ],
        ];

        foreach ($items as $item) {
            ExpenseItem::query()->updateOrCreate(
                [
                    'company_id' => $company->id,
                    'expense_type_id' => $item['expense_type_id'],
                    'name' => $item['name'],
                ],
                [
                    'expense_category_id' => $item['expense_category_id'],
                    'amount' => $item['amount'],
                    'purchased_on' => $item['purchased_on'],
                    'closing_date' => $item['closing_date'],
                    'employee_id' => null,
                    'detail' => $item['detail'],
                ]
            );
        }
    }

    private function seedCfoAssets(Company $company): void
    {
        $assets = [
            [
                'name' => 'Spektrofotometer UV-Vis',
                'asset_date' => '2026-01-15',
                'amount' => 1,
                'price_per_unit' => 45000000.0,
            ],
            [
                'name' => 'Autoclave Digital 50L',
                'asset_date' => '2026-03-10',
                'amount' => 2,
                'price_per_unit' => 18500000.0,
            ],
            [
                'name' => 'Laptop Analis QC',
                'asset_date' => '2026-06-01',
                'amount' => 4,
                'price_per_unit' => 9500000.0,
            ],
        ];

        foreach ($assets as $asset) {
            CompanyAsset::query()->updateOrCreate(
                [
                    'company_id' => $company->id,
                    'name' => $asset['name'],
                ],
                [
                    'asset_date' => $asset['asset_date'],
                    'amount' => $asset['amount'],
                    'price_per_unit' => $asset['price_per_unit'],
                    'total_price' => (float) $asset['amount'] * (float) $asset['price_per_unit'],
                ]
            );
        }
    }

    private function seedChoModule(Company $company): void
    {
        $analystPosition = $this->upsertByCode(EmployeePosition::class, [
            'company_id' => $company->id,
            'code' => 'STF-A',
            'name' => 'STAFF A',
            'description' => 'Deskripsi Pekerjaan',
        ]);
        $qaPosition = $this->upsertByCode(EmployeePosition::class, [
            'company_id' => $company->id,
            'code' => 'STF-B',
            'name' => 'STAFF B',
            'description' => 'Deskripsi Pekerjaan',
        ]);

        $permanentStatus = $this->upsertByCode(EmploymentStatus::class, [
            'company_id' => $company->id,
            'code' => 'PKWTT',
            'name' => 'Karyawan Tetap',
            'description' => 'Perjanjian Kerja Waktu Tidak Tertentu',
        ]);
        $contractStatus = $this->upsertByCode(EmploymentStatus::class, [
            'company_id' => $company->id,
            'code' => 'PKWT',
            'name' => 'Karyawan Kontrak',
            'description' => 'Perjanjian Kerja Waktu Tertentu',
        ]);

        $staffGrade = $this->upsertPayrollGrade($company->id, 1, 'A', 'staff, spv', 5500000.0, 500000.0);
        $spvGrade = $this->upsertPayrollGrade($company->id, 2, 'A', 'supervisor', 8500000.0, 1500000.0);

        $tk0Tax = $this->upsertByCode(TaxStatus::class, [
            'company_id' => $company->id,
            'code' => 'TK/0',
            'name' => 'Tidak Kawin / 0 Tanggungan',
            'description' => 'PTKP Wajib Pajak Orang Pribadi tidak kawin tanpa tanggungan',
        ]);
        $k1Tax = $this->upsertByCode(TaxStatus::class, [
            'company_id' => $company->id,
            'code' => 'K/1',
            'name' => 'Kawin / 1 Tanggungan',
            'description' => 'PTKP Wajib Pajak kawin dengan 1 tanggungan',
        ]);

        $employees = [
            [
                'nik_ktp' => '3273011504960001',
                'employee_position_id' => $analystPosition->id,
                'employment_status_id' => $permanentStatus->id,
                'payroll_grade_id' => $staffGrade->id,
                'tax_status_id' => $tk0Tax->id,
                'name' => 'Nadia Putri Pratiwi',
                'email' => 'nadia.putri@foodlab.test',
                'phone' => '081234567801',
                'nickname' => 'Nadia',
                'birth_place' => 'Bandung',
                'birth_date' => '1996-04-15',
                'gender' => JenisKelamin::PEREMPUAN,
                'religion' => Agama::ISLAM,
                'blood_type' => GolonganDarah::O,
                'mother_name' => 'Siti Aminah',
                'ktp_address' => 'Jl. Sukajadi No. 45, Bandung',
                'domicile_address' => 'Jl. Dago Asri No. 12, Bandung',
                'whatsapp_number' => '081234567801',
                'emergency_phone_number' => '081234567899',
                'bpjs_ketenagakerjaan' => '19001234567',
                'bpjs_kesehatan' => '0001234567801',
                'npwp_number' => '9123456789012000',
            ],
            [
                'nik_ktp' => '3273012208920002',
                'employee_position_id' => $qaPosition->id,
                'employment_status_id' => $contractStatus->id,
                'payroll_grade_id' => $spvGrade->id,
                'tax_status_id' => $k1Tax->id,
                'name' => 'Budi Santoso',
                'email' => 'budi.santoso@foodlab.test',
                'phone' => '081234567802',
                'nickname' => 'Budi',
                'birth_place' => 'Surabaya',
                'birth_date' => '1992-08-22',
                'gender' => JenisKelamin::LAKI_LAKI,
                'religion' => Agama::ISLAM,
                'blood_type' => GolonganDarah::A,
                'mother_name' => 'Sri Wahyuni',
                'ktp_address' => 'Jl. Ahmad Yani No. 88, Surabaya',
                'domicile_address' => 'Jl. Setiabudi No. 21, Bandung',
                'whatsapp_number' => '081234567802',
                'emergency_phone_number' => '081234567888',
                'bpjs_ketenagakerjaan' => '19001234568',
                'bpjs_kesehatan' => '0001234567802',
                'npwp_number' => '9123456789012001',
            ],
        ];

        foreach ($employees as $payload) {
            $employee = Employee::query()->withTrashed()->firstOrNew([
                'nik_ktp' => $payload['nik_ktp'],
            ]);
            $employee->fill($payload);
            $employee->company_id = $company->id;
            $employee->deleted_at = null;
            $employee->save();

            EmployeeDocument::query()->updateOrCreate(
                [
                    'employee_id' => $employee->id,
                    'document_type' => JenisDokumen::KTP,
                ],
                [
                    'file_url' => '/storage/employees/'.$employee->id.'/ktp.pdf',
                ]
            );
        }
    }

    /**
     * @template TModel of EmployeePosition|EmploymentStatus|TaxStatus
     *
     * @param  class-string<TModel>  $modelClass
     * @param  array<string, mixed>  $attributes
     * @return TModel
     */
    private function upsertByCode(string $modelClass, array $attributes): EmployeePosition|EmploymentStatus|TaxStatus
    {
        $record = $modelClass::query()->withTrashed()->firstOrNew([
            'code' => $attributes['code'],
        ]);
        $record->fill($attributes);
        $record->deleted_at = null;
        $record->save();

        return $record;
    }

    private function upsertPayrollGrade(
        int $companyId,
        int $grade,
        string $subGrade,
        string $levelLabel,
        float $baseSalary,
        float $positionAllowance
    ): PayrollGrade {
        $totalGross = $baseSalary + $positionAllowance;
        $bpjsKesCompany = (float) round($totalGross * 0.04);
        $bpjsKesEmployee = (float) round($totalGross * 0.01);
        $bpjsTkCompany = (float) round($totalGross * 0.0394);
        $bpjsTkEmployee = (float) round($totalGross * 0.02);

        return PayrollGrade::query()->updateOrCreate(
            [
                'grade' => $grade,
                'sub_grade' => $subGrade,
            ],
            [
                'company_id' => $companyId,
                'level_label' => $levelLabel,
                'base_salary' => $baseSalary,
                'position_allowance' => $positionAllowance,
                'total_gross' => $totalGross,
                'bpjs_kesehatan_company' => $bpjsKesCompany,
                'bpjs_kesehatan_employee' => $bpjsKesEmployee,
                'bpjs_ketenagakerjaan_company' => $bpjsTkCompany,
                'bpjs_ketenagakerjaan_employee' => $bpjsTkEmployee,
                'net_employee_received' => $totalGross - $bpjsKesEmployee - $bpjsTkEmployee,
                'total_company_cost' => $totalGross + $bpjsKesCompany + $bpjsTkCompany,
            ]
        );
    }

    private function seedEmployeeShifts(): void
    {
        $shifts = [
            [
                'code' => 'SHIFT-PAGI',
                'name' => 'Shift Pagi',
                'start_time' => '07:00:00',
                'end_time' => '15:00:00',
                'break_minutes' => 60,
                'grace_period_minutes' => 15,
                'is_overnight' => false,
                'status' => ShiftStatusEnum::ACTIVE,
                'description' => 'Shift kerja pagi laboratorium dan operasional',
            ],
            [
                'code' => 'SHIFT-SIANG',
                'name' => 'Shift Siang',
                'start_time' => '15:00:00',
                'end_time' => '23:00:00',
                'break_minutes' => 60,
                'grace_period_minutes' => 15,
                'is_overnight' => false,
                'status' => ShiftStatusEnum::ACTIVE,
                'description' => 'Shift kerja siang operasional dan produksi',
            ],
            [
                'code' => 'SHIFT-MALAM',
                'name' => 'Shift Malam',
                'start_time' => '23:00:00',
                'end_time' => '07:00:00',
                'break_minutes' => 60,
                'grace_period_minutes' => 15,
                'is_overnight' => true,
                'status' => ShiftStatusEnum::ACTIVE,
                'description' => 'Shift kerja malam lintas hari',
            ],
        ];

        foreach (Company::query()->get() as $company) {
            foreach ($shifts as $payload) {
                $shift = EmployeeShift::query()
                    ->withTrashed()
                    ->where('company_id', $company->id)
                    ->where('code', $payload['code'])
                    ->orderByRaw('deleted_at IS NOT NULL')
                    ->first() ?? new EmployeeShift();

                $shift->fill($payload);
                $shift->company_id = $company->id;
                $shift->deleted_at = null;
                $shift->save();
            }
        }
    }
}
