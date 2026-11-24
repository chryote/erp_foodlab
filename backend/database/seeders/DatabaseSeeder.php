<?php

namespace Database\Seeders;

use App\Enums\Agama;
use App\Enums\AttendanceStatusEnum;
use App\Enums\GolonganDarah;
use App\Enums\ItemType;
use App\Enums\JenisDokumen;
use App\Enums\JenisKelamin;
use App\Enums\PayrollGroup;
use App\Enums\PayrollRunStatus;
use App\Enums\ShiftStatusEnum;
use App\Models\CapitalCompany;
use App\Models\Company;
use App\Models\CompanyAsset;
use App\Models\Employee;
use App\Models\EmployeeAttendance;
use App\Models\EmployeeDocument;
use App\Models\EmployeePosition;
use App\Models\EmployeeShift;
use App\Models\EmployeeShiftAssignment;
use App\Models\EmploymentStatus;
use App\Models\ExpenseCategory;
use App\Models\ExpenseItem;
use App\Models\ExpenseType;
use App\Models\Item;
use App\Models\ItemPacket;
use App\Models\LabSample;
use App\Models\Packet;
use App\Models\PayrollGrade;
use App\Models\PayrollItem;
use App\Models\PayrollRun;
use App\Models\TaxStatus;
use App\Models\User;
use App\Modules\CHO\Services\PayrollItemService;
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
            $this->seedPayrollRuns($company);
            $this->seedPayrollItems($company);
            $this->seedEmployeeShifts();
            $this->seedEmployeeShiftAssignments();
            $this->seedEmployeeAttendances();
            $this->seedCpoItems($company);
            $this->seedCpoPackets();
            $this->seedCpoItemPackets($company);
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
            'code' => 'STF-A',
            'name' => 'STAFF A',
            'description' => 'Deskripsi Pekerjaan',
        ]);
        $qaPosition = $this->upsertByCode(EmployeePosition::class, [
            'code' => 'STF-B',
            'name' => 'STAFF B',
            'description' => 'Deskripsi Pekerjaan',
        ]);

        $permanentStatus = $this->upsertByCode(EmploymentStatus::class, [
            'code' => 'PKWTT',
            'name' => 'Karyawan Tetap',
            'description' => 'Perjanjian Kerja Waktu Tidak Tertentu',
        ]);
        $contractStatus = $this->upsertByCode(EmploymentStatus::class, [
            'code' => 'PKWT',
            'name' => 'Karyawan Kontrak',
            'description' => 'Perjanjian Kerja Waktu Tertentu',
        ]);

        $staffGrade = $this->upsertPayrollGrade(1, 'A', 'staff, spv', 5500000.0, 500000.0);
        $spvGrade = $this->upsertPayrollGrade(2, 'A', 'supervisor', 8500000.0, 1500000.0);

        $tk0Tax = $this->upsertByCode(TaxStatus::class, [
            'code' => 'TK/0',
            'name' => 'Tidak Kawin / 0 Tanggungan',
            'description' => 'PTKP Wajib Pajak Orang Pribadi tidak kawin tanpa tanggungan',
        ]);
        $k1Tax = $this->upsertByCode(TaxStatus::class, [
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
            $employee->syncAttendanceCode();

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

    private function seedEmployeeShiftAssignments(): void
    {
        $employees = Employee::query()->orderBy('id')->get();

        foreach ($employees as $employee) {
            $shift = EmployeeShift::query()
                ->where('company_id', $employee->company_id)
                ->where('code', 'SHIFT-PAGI')
                ->first()
                ?? EmployeeShift::query()
                    ->where('company_id', $employee->company_id)
                    ->orderBy('id')
                    ->first();

            if ($shift === null) {
                continue;
            }

            $effectiveDate = '2026-11-01';

            $assignment = EmployeeShiftAssignment::query()
                ->withTrashed()
                ->where('company_id', $employee->company_id)
                ->where('employee_id', $employee->id)
                ->whereDate('effective_date', $effectiveDate)
                ->orderByRaw('deleted_at IS NOT NULL')
                ->first() ?? new EmployeeShiftAssignment();

            $assignment->company_id = $employee->company_id;
            $assignment->employee_id = $employee->id;
            $assignment->employee_shift_id = $shift->id;
            $assignment->effective_date = $effectiveDate;
            $assignment->end_date = null;
            $assignment->notes = 'Penugasan shift awal karyawan';
            $assignment->deleted_at = null;
            $assignment->save();
        }
    }

    private function seedEmployeeAttendances(): void
    {
        $employees = Employee::query()->orderBy('id')->get();

        foreach ($employees as $index => $employee) {
            $morningShift = EmployeeShift::query()
                ->where('company_id', $employee->company_id)
                ->where('code', 'SHIFT-PAGI')
                ->first();

            $afternoonShift = EmployeeShift::query()
                ->where('company_id', $employee->company_id)
                ->where('code', 'SHIFT-SIANG')
                ->first();

            $samples = $index % 2 === 0
                ? [
                    [
                        'employee_shift_id' => $morningShift?->id,
                        'attendance_date' => '2026-11-20',
                        'clock_in_at' => '2026-11-20 06:55:00',
                        'clock_out_at' => '2026-11-20 15:30:00',
                        'late_minutes' => 0,
                        'overtime_minutes' => 30,
                        'status' => AttendanceStatusEnum::PRESENT,
                        'notes' => 'Hadir tepat waktu dengan lembur analisis sampel',
                    ],
                    [
                        'employee_shift_id' => $morningShift?->id,
                        'attendance_date' => '2026-11-21',
                        'clock_in_at' => '2026-11-21 07:05:00',
                        'clock_out_at' => '2026-11-21 15:00:00',
                        'late_minutes' => 0,
                        'overtime_minutes' => 0,
                        'status' => AttendanceStatusEnum::PRESENT,
                        'notes' => 'Hadir dalam masa toleransi shift pagi',
                    ],
                ]
                : [
                    [
                        'employee_shift_id' => $morningShift?->id,
                        'attendance_date' => '2026-11-20',
                        'clock_in_at' => '2026-11-20 07:25:00',
                        'clock_out_at' => '2026-11-20 15:00:00',
                        'late_minutes' => 10,
                        'overtime_minutes' => 0,
                        'status' => AttendanceStatusEnum::LATE,
                        'notes' => 'Terlambat 10 menit melewati masa toleransi',
                    ],
                    [
                        'employee_shift_id' => $afternoonShift?->id,
                        'attendance_date' => '2026-11-21',
                        'clock_in_at' => null,
                        'clock_out_at' => null,
                        'late_minutes' => 0,
                        'overtime_minutes' => 0,
                        'status' => AttendanceStatusEnum::LEAVE,
                        'notes' => 'Cuti tahunan disetujui',
                    ],
                ];

            foreach ($samples as $payload) {
                $attendance = EmployeeAttendance::query()
                    ->withTrashed()
                    ->where('company_id', $employee->company_id)
                    ->where('employee_id', $employee->id)
                    ->whereDate('attendance_date', $payload['attendance_date'])
                    ->orderByRaw('deleted_at IS NOT NULL')
                    ->first() ?? new EmployeeAttendance();

                $attendance->fill($payload);
                $attendance->company_id = $employee->company_id;
                $attendance->employee_id = $employee->id;
                $attendance->deleted_at = null;
                $attendance->save();
            }
        }
    }

    private function seedPayrollRuns(Company $company): void
    {
        $adminId = User::query()->where('email', 'admin@foodlab.test')->value('id');
        $periodDate = '2025-12-01';

        $payrollRun = PayrollRun::query()
            ->withTrashed()
            ->where('company_id', $company->id)
            ->whereDate('period_date', $periodDate)
            ->orderByRaw('deleted_at IS NOT NULL')
            ->first() ?? new PayrollRun();

        $payrollRun->company_id = $company->id;
        $payrollRun->code = 'PR-2025-12';
        $payrollRun->name = 'Payroll Desember 2025';
        $payrollRun->period_date = $periodDate;
        $payrollRun->status = PayrollRunStatus::APPROVED;
        $payrollRun->notes = 'Payroll periode Desember 2025';
        $payrollRun->approved_by ??= $adminId;
        $payrollRun->approved_at ??= now();
        $payrollRun->deleted_at = null;
        $payrollRun->save();
    }

    private function seedPayrollItems(Company $company): void
    {
        $positions = [];
        foreach ([
            ['code' => 'KPA', 'name' => 'Kepala Area', 'description' => 'Kepala Area Operasional'],
            ['code' => 'SPV', 'name' => 'SPV', 'description' => 'Supervisor Operasional'],
            ['code' => 'LKS', 'name' => 'Lokasi', 'description' => 'Koordinator Lokasi'],
            ['code' => 'OTL', 'name' => 'Outlet', 'description' => 'Staf Outlet'],
        ] as $posData) {
            $position = EmployeePosition::query()
                ->withTrashed()
                ->where('name', $posData['name'])
                ->orderByRaw('deleted_at IS NOT NULL')
                ->first() ?? new EmployeePosition();
            $position->fill($posData);
            $position->deleted_at = null;
            $position->save();

            $positions[$posData['name']] = $position;
        }

        $payrollRun = PayrollRun::query()
            ->where('company_id', $company->id)
            ->whereDate('period_date', '2025-12-01')
            ->firstOrFail();

        $sampleRows = [
            [
                'nik_ktp' => '3273021001900001',
                'name' => 'Raka Pratama',
                'position' => 'Kepala Area',
                'payroll_group' => PayrollGroup::OFFICE,
                'bank_account_number' => '1310004500112',
                'base_salary' => 7500000.00,
                'bpjs_kesehatan' => 75000.00,
                'bpjs_ketenagakerjaan' => 150000.00,
                'bonus' => 1000000.00,
                'overtime' => 0.00,
                'deduction' => 200000.00,
                'thr' => 0.00,
                'pph21' => 325000.00,
                'notes' => 'Office Kepala Area (KS, KT, Bonus, Potongan, PPH 21)',
            ],
            [
                'nik_ktp' => '3273021001900002',
                'name' => 'Sinta Dewi',
                'position' => 'SPV',
                'payroll_group' => PayrollGroup::OFFICE,
                'bank_account_number' => '1310004500223',
                'base_salary' => 5500000.00,
                'bpjs_kesehatan' => 55000.00,
                'bpjs_ketenagakerjaan' => 110000.00,
                'bonus' => 500000.00,
                'overtime' => 0.00,
                'deduction' => 100000.00,
                'thr' => 0.00,
                'pph21' => 150000.00,
                'notes' => 'Office SPV (KS, KT, Bonus, Potongan, PPH 21)',
            ],
            [
                'nik_ktp' => '3273021001900003',
                'name' => 'Dimas Nugroho',
                'position' => 'Lokasi',
                'payroll_group' => PayrollGroup::OFFICE,
                'bank_account_number' => '1310004500334',
                'base_salary' => 4500000.00,
                'bpjs_kesehatan' => 45000.00,
                'bpjs_ketenagakerjaan' => 90000.00,
                'bonus' => 250000.00,
                'overtime' => 0.00,
                'deduction' => 50000.00,
                'thr' => 0.00,
                'pph21' => 75000.00,
                'notes' => 'Office Lokasi (KS, KT, Bonus, Potongan, PPH 21)',
            ],
            [
                'nik_ktp' => '3273021001900004',
                'name' => 'Larasati Wulandari',
                'position' => 'Outlet',
                'payroll_group' => PayrollGroup::OUTLET,
                'bank_account_number' => '1310004500445',
                'base_salary' => 3200000.00,
                'bpjs_kesehatan' => 0.00,
                'bpjs_ketenagakerjaan' => 0.00,
                'bonus' => 0.00,
                'overtime' => 0.00,
                'deduction' => 0.00,
                'thr' => 0.00,
                'pph21' => 0.00,
                'notes' => 'Outlet gaji pokok saja',
            ],
            [
                'nik_ktp' => '3273021001900005',
                'name' => 'Bagus Setiawan',
                'position' => 'Outlet',
                'payroll_group' => PayrollGroup::OUTLET,
                'bank_account_number' => null,
                'base_salary' => 3000000.00,
                'bpjs_kesehatan' => 0.00,
                'bpjs_ketenagakerjaan' => 0.00,
                'bonus' => 0.00,
                'overtime' => 0.00,
                'deduction' => 0.00,
                'thr' => 0.00,
                'pph21' => 0.00,
                'notes' => 'Outlet gaji pokok saja (rekening ???)',
            ],
        ];

        foreach ($sampleRows as $row) {
            $position = $positions[$row['position']];

            $employee = Employee::query()
                ->withTrashed()
                ->where('company_id', $company->id)
                ->where('nik_ktp', $row['nik_ktp'])
                ->orderByRaw('deleted_at IS NOT NULL')
                ->first() ?? new Employee();
            $employee->company_id = $company->id;
            $employee->employee_position_id = $position->id;
            $employee->name = $row['name'];
            $employee->nik_ktp = $row['nik_ktp'];
            $employee->deleted_at = null;
            $employee->save();
            $employee->syncAttendanceCode();

            $totalNet = round(
                ($row['base_salary'] + $row['bonus'] + $row['overtime'] + $row['thr'])
                - ($row['bpjs_kesehatan'] + $row['bpjs_ketenagakerjaan'] + $row['deduction'] + $row['pph21']),
                2
            );

            $item = PayrollItem::query()
                ->withTrashed()
                ->where('company_id', $company->id)
                ->where('payroll_run_id', $payrollRun->id)
                ->where('employee_id', $employee->id)
                ->orderByRaw('deleted_at IS NOT NULL')
                ->first() ?? new PayrollItem();

            $item->company_id = $company->id;
            $item->payroll_run_id = $payrollRun->id;
            $item->employee_id = $employee->id;
            $item->employee_position_id = $position->id;
            $item->payroll_group = $row['payroll_group'];
            $item->bank_account_number = $row['bank_account_number'];
            $item->base_salary = $row['base_salary'];
            $item->bpjs_kesehatan = $row['bpjs_kesehatan'];
            $item->bpjs_ketenagakerjaan = $row['bpjs_ketenagakerjaan'];
            $item->bonus = $row['bonus'];
            $item->overtime = $row['overtime'];
            $item->deduction = $row['deduction'];
            $item->thr = $row['thr'];
            $item->pph21 = $row['pph21'];
            $item->total_net = $totalNet;
            $item->notes = $row['notes'];
            $item->deleted_at = null;
            $item->save();
        }

        PayrollItemService::syncPayrollRunTotals($payrollRun);
    }

    private function seedCpoItems(Company $company): void
    {
        $items = [
            ['code' => 'ITM-001', 'name' => 'Apple', 'type' => ItemType::Bahan],
            ['code' => 'ITM-002', 'name' => 'Banana', 'type' => ItemType::Bahan],
            ['code' => 'ITM-003', 'name' => 'Orange', 'type' => ItemType::Bahan],
            ['code' => 'ITM-004', 'name' => 'Jackfruit', 'type' => ItemType::Bahan],
            ['code' => 'ITM-005', 'name' => 'Blender Lab', 'type' => ItemType::Peralatan],
            ['code' => 'ITM-006', 'name' => 'Timbangan Digital', 'type' => ItemType::Peralatan],
        ];

        foreach ($items as $entry) {
            $item = Item::query()
                ->withTrashed()
                ->where('company_id', $company->id)
                ->where(function ($query) use ($entry): void {
                    $query->where('code', $entry['code'])
                        ->orWhere('name', $entry['name']);
                })
                ->orderByRaw('deleted_at IS NOT NULL')
                ->first() ?? new Item();

            $item->company_id = $company->id;
            $item->code = $entry['code'];
            $item->name = $entry['name'];
            $item->type = $entry['type'];
            $item->deleted_at = null;
            $item->save();
        }
    }

    private function seedCpoPackets(): void
    {
        foreach (['Paket A', 'Paket B'] as $name) {
            $packet = Packet::query()
                ->withTrashed()
                ->where('name', $name)
                ->orderByRaw('deleted_at IS NOT NULL')
                ->first() ?? new Packet();

            $packet->name = $name;
            $packet->deleted_at = null;
            $packet->save();
        }
    }

    private function seedCpoItemPackets(Company $company): void
    {
        $packets = Packet::query()
            ->whereIn('name', ['Paket A', 'Paket B'])
            ->get()
            ->keyBy('name');

        $items = Item::query()
            ->where('company_id', $company->id)
            ->whereIn('name', ['Apple', 'Banana', 'Orange', 'Jackfruit', 'Blender Lab'])
            ->get()
            ->keyBy('name');

        $mappings = [
            'Paket A' => [
                ['item' => 'Apple', 'quantity' => 1],
                ['item' => 'Banana', 'quantity' => 1],
                ['item' => 'Orange', 'quantity' => 1],
            ],
            'Paket B' => [
                ['item' => 'Apple', 'quantity' => 1],
                ['item' => 'Jackfruit', 'quantity' => 1],
                ['item' => 'Blender Lab', 'quantity' => 1],
            ],
        ];

        foreach ($mappings as $packetName => $entries) {
            $packet = $packets->get($packetName);
            if ($packet === null) {
                continue;
            }

            foreach ($entries as $entry) {
                $item = $items->get($entry['item']);
                if ($item === null) {
                    continue;
                }

                $itemPacket = ItemPacket::query()
                    ->withTrashed()
                    ->where('company_id', $company->id)
                    ->where('packet_id', $packet->id)
                    ->where('item_id', $item->id)
                    ->orderByRaw('deleted_at IS NOT NULL')
                    ->first() ?? new ItemPacket();

                $itemPacket->company_id = $company->id;
                $itemPacket->packet_id = $packet->id;
                $itemPacket->item_id = $item->id;
                $itemPacket->quantity = $entry['quantity'];
                $itemPacket->deleted_at = null;
                $itemPacket->save();
            }
        }
    }
}
