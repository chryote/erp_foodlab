<?php

namespace Database\Seeders;

use App\Enums\Agama;
use App\Enums\AttendanceStatusEnum;
use App\Enums\CompanyType;
use App\Enums\GolonganDarah;
use App\Enums\ItemType;
use App\Enums\JenisDokumen;
use App\Enums\JenisKelamin;
use App\Enums\LabSampleStatus;
use App\Enums\PacketVendorType;
use App\Enums\PayrollGroup;
use App\Enums\PayrollItemStatus;
use App\Enums\PayrollRunStatus;
use App\Enums\ShiftStatusEnum;
use App\Models\CapitalCompany;
use App\Models\Company;
use App\Models\CompanyAsset;
use App\Models\DefaultPackage;
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
use App\Models\Ingredient;
use App\Models\Item;
use App\Models\ItemPacket;
use App\Models\LabSample;
use App\Models\Packet;
use App\Models\PacketCategory;
use App\Models\PacketName;
use App\Models\PacketVendor;
use App\Models\PayrollGrade;
use App\Models\PayrollItem;
use App\Models\PayrollRun;
use App\Models\TaxStatus;
use App\Models\User;
use App\Modules\CHO\Services\PayrollItemService;
use Illuminate\Database\Eloquent\Collection as EloquentCollection;
use Illuminate\Database\Seeder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public const MIN_SEED_ROWS = 1;

    public function run(): void
    {
        DB::transaction(function (): void {
            $users = $this->seedUsers();
            $this->seedLabSamples();

            $companies = $this->seedCompanies();
            $primaryCompany = $companies->firstOrFail();

            $this->seedCapital($companies);
            $this->seedCfoAssets($companies);

            $employees = $this->seedChoModule($companies);

            $this->seedCfoOperations($companies, $employees);

            $runsByCompanyAndPeriod = $this->seedPayrollRuns($companies, $users);
            $this->seedPayrollItems($primaryCompany, $employees, $runsByCompanyAndPeriod, $users);

            $shiftsByCompany = $this->seedEmployeeShifts($companies);
            $this->seedEmployeeShiftAssignments($employees, $shiftsByCompany);
            $this->seedEmployeeAttendances($employees, $shiftsByCompany);

            $packetVendors = $this->seedCpoPacketVendors($primaryCompany);
            $items = $this->seedCpoItems($companies, $packetVendors);
            $packets = $this->seedCpoPackets($primaryCompany);
            $packetNames = $this->seedCpoPacketNames($primaryCompany);
            $packetCategories = $this->seedCpoPacketCategories($primaryCompany);
            $itemPackets = $this->seedCpoItemPackets($primaryCompany, $items, $packets);
            $defaultPackages = $this->seedCpoDefaultPackages($primaryCompany, $packetNames, $packetVendors, $packetCategories, $itemPackets);
            $this->seedCpoIngredients($primaryCompany, $defaultPackages, $items);
        });

        Cache::flush();
    }

    /**
     * @return EloquentCollection<int, User>
     */
    private function seedUsers(): EloquentCollection
    {
        $existingByEmail = User::query()->get()->keyBy('email');
        $hashedPassword = Hash::make('password');
        $verifiedAt = now();

        $admin = $existingByEmail->get('admin@foodlab.test') ?? new User(['email' => 'admin@foodlab.test']);
        $admin->name = 'ERP Administrator';
        if (! $admin->exists) {
            $admin->password = $hashedPassword;
        }
        $admin->email_verified_at ??= $verifiedAt;
        $admin->save();

        $users = new EloquentCollection([$admin]);

        for ($i = 2; $i <= self::MIN_SEED_ROWS; $i++) {
            $email = sprintf('staff%03d@foodlab.test', $i);
            /** @var User $user */
            $user = $existingByEmail->get($email) ?? new User(['email' => $email]);
            $user->name = sprintf('FoodLab Staff %03d', $i);
            if (! $user->exists) {
                $user->password = $hashedPassword;
            }
            $user->email_verified_at ??= $verifiedAt;
            $user->save();
            $users->push($user);
        }

        return $users;
    }

    private function seedLabSamples(): void
    {
        $existingByCode = LabSample::query()->withTrashed()->get()->keyBy('batch_code');
        $products = [
            'Organic Almond Milk',
            'Fermented Kimchi Batch A',
            'Cold-Pressed Olive Oil',
            'Greek Yogurt Plain',
            'Artisanal Sourdough Crumb',
        ];
        $categories = ['Dairy', 'Beverage', 'Fermented', 'Bakery', 'Oils'];
        $statuses = LabSampleStatus::cases();

        for ($i = 1; $i <= self::MIN_SEED_ROWS; $i++) {
            $batchCode = sprintf('FL-SEED-%04d', $i);
            /** @var LabSample $sample */
            $sample = $existingByCode->get($batchCode) ?? new LabSample(['batch_code' => $batchCode]);
            $sample->product_name = $products[($i - 1) % count($products)].' #'.str_pad((string) $i, 3, '0', STR_PAD_LEFT);
            $sample->category = $categories[($i - 1) % count($categories)];
            $sample->ph_level = round(3.8 + (($i % 32) * 0.1), 2);
            $sample->moisture_percent = round(15.0 + (($i % 70) * 1.0), 2);
            $sample->status = $statuses[($i - 1) % count($statuses)];
            $sample->deleted_at = null;
            $sample->save();
        }
    }

    /**
     * @return EloquentCollection<int, Company>
     */
    private function seedCompanies(): EloquentCollection
    {
        $existingByKey = Company::query()
            ->withTrashed()
            ->get()
            ->keyBy(fn (Company $company): string => $company->name.'|'.$company->series);

        $companies = new EloquentCollection;

        $primary = $existingByKey->get('PT. Slaras Nusa Foodlab|1') ?? new Company([
            'name' => 'PT. Slaras Nusa Foodlab',
            'series' => 1,
        ]);
        $primary->type = CompanyType::Utama;
        $primary->deleted_at = null;
        $primary->save();
        $companies->push($primary);

        $companyTypes = CompanyType::cases();
        for ($i = 2; $i <= self::MIN_SEED_ROWS; $i++) {
            $name = sprintf('PT. Slaras Nusa Foodlab Unit %03d', $i);
            $series = (($i - 1) % 5) + 1;
            /** @var Company $company */
            $company = $existingByKey->get($name.'|'.$series) ?? new Company([
                'name' => $name,
                'series' => $series,
            ]);
            $company->type = $companyTypes[($i - 1) % count($companyTypes)];
            $company->deleted_at = null;
            $company->save();
            $companies->push($company);
        }

        return $companies;
    }

    /**
     * @param  EloquentCollection<int, Company>  $companies
     */
    private function seedCapital(EloquentCollection $companies): void
    {
        $existingByKey = CapitalCompany::query()
            ->withTrashed()
            ->get()
            ->keyBy(fn (CapitalCompany $row): string => $row->company_id.'|'.$row->stakeholder_name);

        foreach ($companies as $index => $company) {
            foreach (range(0, self::MIN_SEED_ROWS) as $i) {
                $stakeholderName = $i === 0 ? 'Rian' : sprintf('Pemegang Saham %03d', $i + 1);
                $capital = $index === 0 ? 250000000.0 : 100000000.0 + (($i + 1) * 2500000.0);

                /** @var CapitalCompany $record */
                $record = $existingByKey->get($company->id.'|'.$stakeholderName) ?? new CapitalCompany([
                    'company_id' => $company->id,
                    'stakeholder_name' => $stakeholderName,
                ]);
                $record->capital = $capital;
                $record->deleted_at = null;
                $record->save();
            }

        }
    }

    /**
     * @param  EloquentCollection<int, Company>  $companies
     * @param  EloquentCollection<int, Employee>  $employees
     */
    private function seedCfoOperations(EloquentCollection $companies, EloquentCollection $employees): void
    {
        $primaryCompany = $companies->firstOrFail();

        $existingCategories = ExpenseCategory::query()
            ->withTrashed()
            ->get()
            ->keyBy(fn (ExpenseCategory $cat): string => $cat->company_id.'|'.$cat->name);

        $existingTypes = ExpenseType::query()
            ->withTrashed()
            ->get()
            ->keyBy(fn (ExpenseType $type): string => $type->company_id.'|'.$type->expense_category_id.'|'.$type->name);

        $existingItems = ExpenseItem::query()
            ->withTrashed()
            ->get()
            ->keyBy(fn (ExpenseItem $item): string => $item->company_id.'|'.$item->expense_type_id.'|'.$item->name);

        $employeesByCompany = $employees->groupBy('company_id');

        $labCategory = $this->upsertExpenseCategory($existingCategories, $primaryCompany->id, 'Operasional Laboratorium');
        $utilityCategory = $this->upsertExpenseCategory($existingCategories, $primaryCompany->id, 'Utilitas & Fasilitas');

        $reagentType = $this->upsertExpenseType($existingTypes, $primaryCompany->id, $labCategory->id, 'Reagen & Bahan Kimia');
        $calibrationType = $this->upsertExpenseType($existingTypes, $primaryCompany->id, $labCategory->id, 'Kalibrasi Peralatan');
        $electricType = $this->upsertExpenseType($existingTypes, $primaryCompany->id, $utilityCategory->id, 'Listrik & Air');

        $canonicalItems = [
            [
                'expense_category_id' => $labCategory->id,
                'expense_type_id' => $reagentType->id,
                'name' => 'Media Agar Mikrobiologi 500g',
                'amount' => 3500000.0,
                'purchased_on' => '2026-11-05',
                'closing_date' => '2026-11-30',
                'employee_id' => null,
                'detail' => 'Pengadaan media kultur uji pangan batch November',
            ],
            [
                'expense_category_id' => $labCategory->id,
                'expense_type_id' => $calibrationType->id,
                'name' => 'Kalibrasi pH Meter & Neraca Analitik',
                'amount' => 4250000.0,
                'purchased_on' => '2026-11-10',
                'closing_date' => '2026-11-30',
                'employee_id' => null,
                'detail' => 'Kalibrasi berkala ISO 17025',
            ],
            [
                'expense_category_id' => $utilityCategory->id,
                'expense_type_id' => $electricType->id,
                'name' => 'Tagihan Listrik Lab & Cold Storage',
                'amount' => 6800000.0,
                'purchased_on' => '2026-11-15',
                'closing_date' => '2026-11-30',
                'employee_id' => null,
                'detail' => 'Pemakaian daya laboratorium dan ruang pendingin',
            ],
        ];

        foreach ($canonicalItems as $entry) {
            $this->upsertExpenseItem($existingItems, $primaryCompany->id, $entry);
        }

        $companyList = $companies->values();
        for ($i = 1; $i <= self::MIN_SEED_ROWS; $i++) {
            /** @var Company $company */
            $company = $companyList[($i - 1) % $companyList->count()];
            $category = $this->upsertExpenseCategory(
                $existingCategories,
                $company->id,
                sprintf('Kategori Operasional %03d', $i)
            );
            $type = $this->upsertExpenseType(
                $existingTypes,
                $company->id,
                $category->id,
                sprintf('Jenis Pengeluaran %03d', $i)
            );

            $companyEmployees = $employeesByCompany->get($company->id);
            $employeeId = ($i % 2 === 0 && $companyEmployees !== null && $companyEmployees->isNotEmpty())
                ? $companyEmployees->first()->id
                : null;

            $purchasedDay = sprintf('2026-10-%02d', (($i - 1) % 28) + 1);
            $closingDay = sprintf('2026-11-%02d', (($i - 1) % 28) + 1);

            $this->upsertExpenseItem($existingItems, $company->id, [
                'expense_category_id' => $category->id,
                'expense_type_id' => $type->id,
                'name' => sprintf('Pengeluaran Lab Batch %03d', $i),
                'amount' => round(500000.0 + ($i * 75000.0), 2),
                'purchased_on' => $purchasedDay,
                'closing_date' => $closingDay,
                'employee_id' => $employeeId,
                'detail' => sprintf('Pengeluaran operasional terjadwal batch #%03d', $i),
            ]);
        }
    }

    /**
     * @param  EloquentCollection<int, ExpenseCategory>  $existing
     */
    private function upsertExpenseCategory(EloquentCollection $existing, int $companyId, string $name): ExpenseCategory
    {
        $key = $companyId.'|'.$name;
        /** @var ExpenseCategory $category */
        $category = $existing->get($key) ?? new ExpenseCategory([
            'company_id' => $companyId,
            'name' => $name,
        ]);
        $category->deleted_at = null;
        $category->save();
        $existing->put($key, $category);

        return $category;
    }

    /**
     * @param  EloquentCollection<int, ExpenseType>  $existing
     */
    private function upsertExpenseType(
        EloquentCollection $existing,
        int $companyId,
        int $categoryId,
        string $name
    ): ExpenseType {
        $key = $companyId.'|'.$categoryId.'|'.$name;
        /** @var ExpenseType $type */
        $type = $existing->get($key) ?? new ExpenseType([
            'company_id' => $companyId,
            'expense_category_id' => $categoryId,
            'name' => $name,
        ]);
        $type->deleted_at = null;
        $type->save();
        $existing->put($key, $type);

        return $type;
    }

    /**
     * @param  EloquentCollection<int, ExpenseItem>  $existing
     * @param  array<string, mixed>  $attributes
     */
    private function upsertExpenseItem(EloquentCollection $existing, int $companyId, array $attributes): void
    {
        $key = $companyId.'|'.$attributes['expense_type_id'].'|'.$attributes['name'];
        /** @var ExpenseItem $item */
        $item = $existing->get($key) ?? new ExpenseItem([
            'company_id' => $companyId,
            'expense_type_id' => $attributes['expense_type_id'],
            'name' => $attributes['name'],
        ]);
        $item->expense_category_id = $attributes['expense_category_id'];
        $item->amount = $attributes['amount'];
        $item->purchased_on = $attributes['purchased_on'];
        $item->closing_date = $attributes['closing_date'];
        $item->employee_id = $attributes['employee_id'];
        $item->detail = $attributes['detail'];
        $item->deleted_at = null;
        $item->save();
        $existing->put($key, $item);
    }

    /**
     * @param  EloquentCollection<int, Company>  $companies
     */
    private function seedCfoAssets(EloquentCollection $companies): void
    {
        $primaryCompany = $companies->firstOrFail();
        $existingByKey = CompanyAsset::query()
            ->withTrashed()
            ->get()
            ->keyBy(fn (CompanyAsset $asset): string => $asset->company_id.'|'.$asset->name);

        $canonicalAssets = [
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

        foreach ($canonicalAssets as $asset) {
            $this->upsertCompanyAsset($existingByKey, $primaryCompany->id, $asset);
        }

        $companyList = $companies->values();
        for ($i = 1; $i <= self::MIN_SEED_ROWS; $i++) {
            /** @var Company $company */
            $company = $companyList[($i - 1) % $companyList->count()];
            $amount = ($i % 5) + 1;
            $pricePerUnit = round(2500000.0 + ($i * 350000.0), 2);

            $this->upsertCompanyAsset($existingByKey, $company->id, [
                'name' => sprintf('Peralatan Laboratorium %03d', $i),
                'asset_date' => sprintf('2026-%02d-%02d', (($i - 1) % 12) + 1, (($i - 1) % 28) + 1),
                'amount' => $amount,
                'price_per_unit' => $pricePerUnit,
            ]);
        }
    }

    /**
     * @param  EloquentCollection<int, CompanyAsset>  $existing
     * @param  array{name: string, asset_date: string, amount: int, price_per_unit: float}  $asset
     */
    private function upsertCompanyAsset(EloquentCollection $existing, int $companyId, array $asset): void
    {
        $key = $companyId.'|'.$asset['name'];
        /** @var CompanyAsset $record */
        $record = $existing->get($key) ?? new CompanyAsset([
            'company_id' => $companyId,
            'name' => $asset['name'],
        ]);
        $record->asset_date = $asset['asset_date'];
        $record->amount = $asset['amount'];
        $record->price_per_unit = $asset['price_per_unit'];
        $record->total_price = round((float) $asset['amount'] * (float) $asset['price_per_unit'], 2);
        $record->deleted_at = null;
        $record->save();
        $existing->put($key, $record);
    }

    /**
     * @param  EloquentCollection<int, Company>  $companies
     * @return EloquentCollection<int, Employee>
     */
    private function seedChoModule(EloquentCollection $companies): EloquentCollection
    {
        $positions = $this->seedEmployeePositions();
        $statuses = $this->seedEmploymentStatuses();
        $grades = $this->seedPayrollGrades();
        $taxStatuses = $this->seedTaxStatuses();

        $primaryCompany = $companies->firstOrFail();

        $analystPosition = $positions->firstWhere('code', 'STF-A');
        $qaPosition = $positions->firstWhere('code', 'STF-B');
        $kpaPosition = $positions->firstWhere('code', 'KPA');
        $spvPosition = $positions->firstWhere('code', 'SPV');
        $lksPosition = $positions->firstWhere('code', 'LKS');
        $otlPosition = $positions->firstWhere('code', 'OTL');

        $permanentStatus = $statuses->firstWhere('code', 'PKWTT');
        $contractStatus = $statuses->firstWhere('code', 'PKWT');

        $staffGrade = $grades->first(fn (PayrollGrade $g): bool => $g->grade === 1 && $g->sub_grade === 'A');
        $spvGrade = $grades->first(fn (PayrollGrade $g): bool => $g->grade === 2 && $g->sub_grade === 'A');

        $tk0Tax = $taxStatuses->firstWhere('code', 'TK/0');
        $k1Tax = $taxStatuses->firstWhere('code', 'K/1');

        $canonicalEmployees = [
            [
                'company_id' => $primaryCompany->id,
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
                'company_id' => $primaryCompany->id,
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
            [
                'company_id' => $primaryCompany->id,
                'nik_ktp' => '3273021001900001',
                'employee_position_id' => $kpaPosition->id,
                'employment_status_id' => $permanentStatus->id,
                'payroll_grade_id' => $spvGrade->id,
                'tax_status_id' => $k1Tax->id,
                'name' => 'Raka Pratama',
                'email' => 'raka.pratama@foodlab.test',
                'phone' => '081234567803',
                'nickname' => 'Raka',
                'birth_place' => 'Jakarta',
                'birth_date' => '1990-01-10',
                'gender' => JenisKelamin::LAKI_LAKI,
                'religion' => Agama::ISLAM,
                'blood_type' => GolonganDarah::B,
                'mother_name' => 'Dewi Sartika',
                'ktp_address' => 'Jl. Sudirman No. 10, Jakarta',
                'domicile_address' => 'Jl. Riau No. 10, Bandung',
                'whatsapp_number' => '081234567803',
                'emergency_phone_number' => '081234567887',
                'bpjs_ketenagakerjaan' => '19001234569',
                'bpjs_kesehatan' => '0001234567803',
                'npwp_number' => '9123456789012002',
            ],
            [
                'company_id' => $primaryCompany->id,
                'nik_ktp' => '3273021001900002',
                'employee_position_id' => $spvPosition->id,
                'employment_status_id' => $permanentStatus->id,
                'payroll_grade_id' => $spvGrade->id,
                'tax_status_id' => $tk0Tax->id,
                'name' => 'Sinta Dewi',
                'email' => 'sinta.dewi@foodlab.test',
                'phone' => '081234567804',
                'nickname' => 'Sinta',
                'birth_place' => 'Bandung',
                'birth_date' => '1991-03-14',
                'gender' => JenisKelamin::PEREMPUAN,
                'religion' => Agama::KRISTEN,
                'blood_type' => GolonganDarah::AB,
                'mother_name' => 'Ratna Sari',
                'ktp_address' => 'Jl. Braga No. 12, Bandung',
                'domicile_address' => 'Jl. Braga No. 12, Bandung',
                'whatsapp_number' => '081234567804',
                'emergency_phone_number' => '081234567886',
                'bpjs_ketenagakerjaan' => '19001234570',
                'bpjs_kesehatan' => '0001234567804',
                'npwp_number' => '9123456789012003',
            ],
            [
                'company_id' => $primaryCompany->id,
                'nik_ktp' => '3273021001900003',
                'employee_position_id' => $lksPosition->id,
                'employment_status_id' => $permanentStatus->id,
                'payroll_grade_id' => $staffGrade->id,
                'tax_status_id' => $k1Tax->id,
                'name' => 'Dimas Nugroho',
                'email' => 'dimas.nugroho@foodlab.test',
                'phone' => '081234567805',
                'nickname' => 'Dimas',
                'birth_place' => 'Yogyakarta',
                'birth_date' => '1993-05-19',
                'gender' => JenisKelamin::LAKI_LAKI,
                'religion' => Agama::ISLAM,
                'blood_type' => GolonganDarah::O,
                'mother_name' => 'Endang Lestari',
                'ktp_address' => 'Jl. Malioboro No. 5, Yogyakarta',
                'domicile_address' => 'Jl. Cihampelas No. 5, Bandung',
                'whatsapp_number' => '081234567805',
                'emergency_phone_number' => '081234567885',
                'bpjs_ketenagakerjaan' => '19001234571',
                'bpjs_kesehatan' => '0001234567805',
                'npwp_number' => '9123456789012004',
            ],
            [
                'company_id' => $primaryCompany->id,
                'nik_ktp' => '3273021001900004',
                'employee_position_id' => $otlPosition->id,
                'employment_status_id' => $contractStatus->id,
                'payroll_grade_id' => $staffGrade->id,
                'tax_status_id' => $tk0Tax->id,
                'name' => 'Larasati Wulandari',
                'email' => 'larasati.wulandari@foodlab.test',
                'phone' => '081234567806',
                'nickname' => 'Laras',
                'birth_place' => 'Semarang',
                'birth_date' => '1997-07-07',
                'gender' => JenisKelamin::PEREMPUAN,
                'religion' => Agama::KATOLIK,
                'blood_type' => GolonganDarah::A,
                'mother_name' => 'Maria Goreti',
                'ktp_address' => 'Jl. Pemuda No. 33, Semarang',
                'domicile_address' => 'Jl. Pasteur No. 33, Bandung',
                'whatsapp_number' => '081234567806',
                'emergency_phone_number' => '081234567884',
                'bpjs_ketenagakerjaan' => '19001234572',
                'bpjs_kesehatan' => '0001234567806',
                'npwp_number' => '9123456789012005',
            ],
            [
                'company_id' => $primaryCompany->id,
                'nik_ktp' => '3273021001900005',
                'employee_position_id' => $otlPosition->id,
                'employment_status_id' => $contractStatus->id,
                'payroll_grade_id' => $staffGrade->id,
                'tax_status_id' => $tk0Tax->id,
                'name' => 'Bagus Setiawan',
                'email' => 'bagus.setiawan@foodlab.test',
                'phone' => '081234567807',
                'nickname' => 'Bagus',
                'birth_place' => 'Malang',
                'birth_date' => '1998-09-12',
                'gender' => JenisKelamin::LAKI_LAKI,
                'religion' => Agama::ISLAM,
                'blood_type' => GolonganDarah::B,
                'mother_name' => 'Sulastri',
                'ktp_address' => 'Jl. Ijen No. 18, Malang',
                'domicile_address' => 'Jl. Dipatiukur No. 18, Bandung',
                'whatsapp_number' => '081234567807',
                'emergency_phone_number' => '081234567883',
                'bpjs_ketenagakerjaan' => '19001234573',
                'bpjs_kesehatan' => '0001234567807',
                'npwp_number' => '9123456789012006',
            ],
        ];

        $existingEmployees = Employee::query()
            ->withTrashed()
            ->get()
            ->keyBy(fn (Employee $emp): string => $emp->company_id.'|'.$emp->nik_ktp);

        $existingDocs = EmployeeDocument::query()
            ->withTrashed()
            ->get()
            ->keyBy(fn (EmployeeDocument $doc): string => $doc->employee_id.'|'.($doc->document_type instanceof JenisDokumen ? $doc->document_type->value : $doc->document_type));

        $employees = new EloquentCollection;

        foreach ($canonicalEmployees as $payload) {
            $employee = $this->upsertEmployee($existingEmployees, $payload);
            $this->upsertEmployeeDocument($existingDocs, $employee->id, JenisDokumen::KTP);
            $employees->push($employee);
        }

        $companyList = $companies->values();
        $positionList = $positions->values();
        $statusList = $statuses->values();
        $gradeList = $grades->values();
        $taxList = $taxStatuses->values();
        $genders = JenisKelamin::cases();
        $religions = Agama::cases();
        $bloodTypes = GolonganDarah::cases();

        for ($i = 1; $i <= self::MIN_SEED_ROWS; $i++) {
            /** @var Company $company */
            $company = $companyList[($i - 1) % $companyList->count()];
            /** @var EmployeePosition $position */
            $position = $positionList[($i - 1) % $positionList->count()];
            /** @var EmploymentStatus $status */
            $status = $statusList[($i - 1) % $statusList->count()];
            /** @var PayrollGrade $grade */
            $grade = $gradeList[($i - 1) % $gradeList->count()];
            /** @var TaxStatus $tax */
            $tax = $taxList[($i - 1) % $taxList->count()];

            $payload = [
                'company_id' => $company->id,
                'nik_ktp' => sprintf('327399010190%04d', $i),
                'employee_position_id' => $position->id,
                'employment_status_id' => $status->id,
                'payroll_grade_id' => $grade->id,
                'tax_status_id' => $tax->id,
                'name' => sprintf('Karyawan FoodLab %03d', $i),
                'email' => sprintf('karyawan.%03d@foodlab.test', $i),
                'phone' => sprintf('08130000%04d', $i),
                'nickname' => sprintf('Staff%03d', $i),
                'birth_place' => 'Bandung',
                'birth_date' => sprintf('199%d-%02d-%02d', $i % 10, (($i - 1) % 12) + 1, (($i - 1) % 28) + 1),
                'gender' => $genders[($i - 1) % count($genders)],
                'religion' => $religions[($i - 1) % count($religions)],
                'blood_type' => $bloodTypes[($i - 1) % count($bloodTypes)],
                'mother_name' => sprintf('Ibu Karyawan %03d', $i),
                'ktp_address' => sprintf('Jl. Laboratorium No. %d, Bandung', $i),
                'domicile_address' => sprintf('Jl. Riset Pangan No. %d, Bandung', $i),
                'whatsapp_number' => sprintf('08130000%04d', $i),
                'emergency_phone_number' => sprintf('08140000%04d', $i),
                'bpjs_ketenagakerjaan' => sprintf('1900999%04d', $i),
                'bpjs_kesehatan' => sprintf('000999000%04d', $i),
                'npwp_number' => sprintf('912345678901%04d', $i),
            ];

            $employee = $this->upsertEmployee($existingEmployees, $payload);
            $this->upsertEmployeeDocument($existingDocs, $employee->id, JenisDokumen::KTP);
            $employees->push($employee);
        }

        return $employees;
    }

    /**
     * @param  EloquentCollection<int, Employee>  $existing
     * @param  array<string, mixed>  $payload
     */
    private function upsertEmployee(EloquentCollection $existing, array $payload): Employee
    {
        $key = $payload['company_id'].'|'.$payload['nik_ktp'];
        /** @var Employee $employee */
        $employee = $existing->get($key) ?? new Employee;
        $employee->fill($payload);
        $employee->deleted_at = null;
        $employee->save();
        $employee->syncAttendanceCode();
        $existing->put($key, $employee);

        return $employee;
    }

    /**
     * @param  EloquentCollection<int, EmployeeDocument>  $existing
     */
    private function upsertEmployeeDocument(
        EloquentCollection $existing,
        int $employeeId,
        JenisDokumen $docType
    ): void {
        $key = $employeeId.'|'.$docType->value;
        /** @var EmployeeDocument $doc */
        $doc = $existing->get($key) ?? new EmployeeDocument([
            'employee_id' => $employeeId,
            'document_type' => $docType,
        ]);
        $doc->file_url = '/storage/employees/'.$employeeId.'/'.$docType->value.'.pdf';
        $doc->deleted_at = null;
        $doc->save();
        $existing->put($key, $doc);
    }

    /**
     * @return EloquentCollection<int, EmployeePosition>
     */
    private function seedEmployeePositions(): EloquentCollection
    {
        $existingByCode = EmployeePosition::query()->withTrashed()->get()->keyBy('code');

        $rows = [
            ['code' => 'STF-A', 'name' => 'STAFF A', 'description' => 'Deskripsi Pekerjaan'],
            ['code' => 'STF-B', 'name' => 'STAFF B', 'description' => 'Deskripsi Pekerjaan'],
            ['code' => 'KPA', 'name' => 'Kepala Area', 'description' => 'Kepala Area Operasional'],
            ['code' => 'SPV', 'name' => 'SPV', 'description' => 'Supervisor Operasional'],
            ['code' => 'LKS', 'name' => 'Lokasi', 'description' => 'Koordinator Lokasi'],
            ['code' => 'OTL', 'name' => 'Outlet', 'description' => 'Staf Outlet'],
        ];

        for ($i = 1; $i <= self::MIN_SEED_ROWS; $i++) {
            $rows[] = [
                'code' => sprintf('POS-%03d', $i),
                'name' => sprintf('Posisi Laboratorium %03d', $i),
                'description' => sprintf('Deskripsi tugas dan tanggung jawab posisi #%03d', $i),
            ];
        }

        $result = new EloquentCollection;
        foreach ($rows as $row) {
            /** @var EmployeePosition $record */
            $record = $existingByCode->get($row['code']) ?? new EmployeePosition;
            $record->fill($row);
            $record->deleted_at = null;
            $record->save();
            $result->push($record);
        }

        return $result;
    }

    /**
     * @return EloquentCollection<int, EmploymentStatus>
     */
    private function seedEmploymentStatuses(): EloquentCollection
    {
        $existingByCode = EmploymentStatus::query()->withTrashed()->get()->keyBy('code');

        $rows = [
            [
                'code' => 'PKWTT',
                'name' => 'Karyawan Tetap',
                'description' => 'Perjanjian Kerja Waktu Tidak Tertentu',
            ],
            [
                'code' => 'PKWT',
                'name' => 'Karyawan Kontrak',
                'description' => 'Perjanjian Kerja Waktu Tertentu',
            ],
        ];

        for ($i = 1; $i <= self::MIN_SEED_ROWS; $i++) {
            $rows[] = [
                'code' => sprintf('STS-%03d', $i),
                'name' => sprintf('Status Kepegawaian %03d', $i),
                'description' => sprintf('Kategori status kontrak kerja #%03d', $i),
            ];
        }

        $result = new EloquentCollection;
        foreach ($rows as $row) {
            /** @var EmploymentStatus $record */
            $record = $existingByCode->get($row['code']) ?? new EmploymentStatus;
            $record->fill($row);
            $record->deleted_at = null;
            $record->save();
            $result->push($record);
        }

        return $result;
    }

    /**
     * @return EloquentCollection<int, PayrollGrade>
     */
    private function seedPayrollGrades(): EloquentCollection
    {
        $existingByKey = PayrollGrade::query()
            ->withTrashed()
            ->get()
            ->keyBy(fn (PayrollGrade $g): string => $g->grade.'|'.$g->sub_grade);

        $result = new EloquentCollection;
        $result->push($this->upsertPayrollGrade($existingByKey, 1, 'A', 'staff, spv', 5500000.0, 500000.0));
        $result->push($this->upsertPayrollGrade($existingByKey, 2, 'A', 'supervisor', 8500000.0, 1500000.0));

        for ($i = 1; $i <= self::MIN_SEED_ROWS; $i++) {
            $grade = 10 + intdiv($i - 1, 10);
            $subGrade = chr(65 + (($i - 1) % 10));
            $baseSalary = 4000000.0 + ($i * 125000.0);
            $allowance = 250000.0 + (($i % 5) * 150000.0);
            $levelLabel = $i % 3 === 0 ? 'manager' : ($i % 2 === 0 ? 'staff khusus, spv khusus' : 'staff, spv');

            $result->push($this->upsertPayrollGrade($existingByKey, $grade, $subGrade, $levelLabel, $baseSalary, $allowance));
        }

        return $result;
    }

    /**
     * @param  EloquentCollection<int, PayrollGrade>  $existingByKey
     */
    private function upsertPayrollGrade(
        EloquentCollection $existingByKey,
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

        $key = $grade.'|'.$subGrade;
        /** @var PayrollGrade $record */
        $record = $existingByKey->get($key) ?? new PayrollGrade([
            'grade' => $grade,
            'sub_grade' => $subGrade,
        ]);
        $record->fill([
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
        ]);
        $record->deleted_at = null;
        $record->save();

        return $record;
    }

    /**
     * @return EloquentCollection<int, TaxStatus>
     */
    private function seedTaxStatuses(): EloquentCollection
    {
        $existingByCode = TaxStatus::query()->withTrashed()->get()->keyBy('code');

        $rows = [
            [
                'code' => 'TK/0',
                'name' => 'Tidak Kawin / 0 Tanggungan',
                'description' => 'PTKP Wajib Pajak Orang Pribadi tidak kawin tanpa tanggungan',
            ],
            [
                'code' => 'K/1',
                'name' => 'Kawin / 1 Tanggungan',
                'description' => 'PTKP Wajib Pajak kawin dengan 1 tanggungan',
            ],
            ['code' => 'TK/1', 'name' => 'Tidak Kawin / 1 Tanggungan', 'description' => 'PTKP TK/1'],
            ['code' => 'TK/2', 'name' => 'Tidak Kawin / 2 Tanggungan', 'description' => 'PTKP TK/2'],
            ['code' => 'TK/3', 'name' => 'Tidak Kawin / 3 Tanggungan', 'description' => 'PTKP TK/3'],
            ['code' => 'K/0', 'name' => 'Kawin / 0 Tanggungan', 'description' => 'PTKP K/0'],
            ['code' => 'K/2', 'name' => 'Kawin / 2 Tanggungan', 'description' => 'PTKP K/2'],
            ['code' => 'K/3', 'name' => 'Kawin / 3 Tanggungan', 'description' => 'PTKP K/3'],
            ['code' => 'K/I/0', 'name' => 'Kawin Gabung / 0 Tanggungan', 'description' => 'PTKP K/I/0'],
            ['code' => 'K/I/1', 'name' => 'Kawin Gabung / 1 Tanggungan', 'description' => 'PTKP K/I/1'],
            ['code' => 'K/I/2', 'name' => 'Kawin Gabung / 2 Tanggungan', 'description' => 'PTKP K/I/2'],
            ['code' => 'K/I/3', 'name' => 'Kawin Gabung / 3 Tanggungan', 'description' => 'PTKP K/I/3'],
        ];

        for ($i = 1; $i <= self::MIN_SEED_ROWS; $i++) {
            $rows[] = [
                'code' => sprintf('PTKP-%03d', $i),
                'name' => sprintf('Status Pajak Khusus %03d', $i),
                'description' => sprintf('Referensi kategori PTKP tambahan #%03d', $i),
            ];
        }

        $result = new EloquentCollection;
        foreach ($rows as $row) {
            /** @var TaxStatus $record */
            $record = $existingByCode->get($row['code']) ?? new TaxStatus;
            $record->fill($row);
            $record->deleted_at = null;
            $record->save();
            $result->push($record);
        }

        return $result;
    }

    /**
     * @param  EloquentCollection<int, Company>  $companies
     * @return Collection<int, Collection<string, EmployeeShift>>
     */
    private function seedEmployeeShifts(EloquentCollection $companies)
    {
        $shiftTemplates = [
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

        $existingByKey = EmployeeShift::query()
            ->withTrashed()
            ->get()
            ->keyBy(fn (EmployeeShift $shift): string => $shift->company_id.'|'.$shift->code);

        $shiftsByCompany = collect();

        foreach ($companies as $company) {
            $companyShifts = collect();

            foreach ($shiftTemplates as $payload) {
                $key = $company->id.'|'.$payload['code'];
                /** @var EmployeeShift $shift */
                $shift = $existingByKey->get($key) ?? new EmployeeShift;
                $shift->fill($payload);
                $shift->company_id = $company->id;
                $shift->deleted_at = null;
                $shift->save();

                $companyShifts->put($payload['code'], $shift);
            }

            $shiftsByCompany->put($company->id, $companyShifts);
        }

        return $shiftsByCompany;
    }

    /**
     * @param  EloquentCollection<int, Employee>  $employees
     * @param  Collection<int, Collection<string, EmployeeShift>>  $shiftsByCompany
     */
    private function seedEmployeeShiftAssignments(EloquentCollection $employees, $shiftsByCompany): void
    {
        $effectiveDate = '2026-11-01';
        $existingByKey = EmployeeShiftAssignment::query()
            ->withTrashed()
            ->get()
            ->keyBy(fn (EmployeeShiftAssignment $assignment): string => $assignment->company_id.'|'.$assignment->employee_id.'|'.$assignment->effective_date?->format('Y-m-d'));

        foreach ($employees as $index => $employee) {
            $companyShifts = $shiftsByCompany->get($employee->company_id);
            if ($companyShifts === null || $companyShifts->isEmpty()) {
                continue;
            }

            $shiftCodes = ['SHIFT-PAGI', 'SHIFT-SIANG', 'SHIFT-MALAM'];
            $targetCode = $index < 7 ? 'SHIFT-PAGI' : $shiftCodes[$index % count($shiftCodes)];
            /** @var EmployeeShift $shift */
            $shift = $companyShifts->get($targetCode) ?? $companyShifts->first();

            $key = $employee->company_id.'|'.$employee->id.'|'.$effectiveDate;
            /** @var EmployeeShiftAssignment $assignment */
            $assignment = $existingByKey->get($key) ?? new EmployeeShiftAssignment;
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

    /**
     * @param  EloquentCollection<int, Employee>  $employees
     * @param  Collection<int, Collection<string, EmployeeShift>>  $shiftsByCompany
     */
    private function seedEmployeeAttendances(EloquentCollection $employees, $shiftsByCompany): void
    {
        $existingByKey = EmployeeAttendance::query()
            ->withTrashed()
            ->get()
            ->keyBy(fn (EmployeeAttendance $att): string => $att->company_id.'|'.$att->employee_id.'|'.$att->attendance_date?->format('Y-m-d'));

        foreach ($employees as $index => $employee) {
            $companyShifts = $shiftsByCompany->get($employee->company_id);
            $morningShift = $companyShifts?->get('SHIFT-PAGI');
            $afternoonShift = $companyShifts?->get('SHIFT-SIANG');

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
                        'status' => $index % 6 === 1 ? AttendanceStatusEnum::SICK : AttendanceStatusEnum::LEAVE,
                        'notes' => $index % 6 === 1 ? 'Izin sakit dengan surat keterangan' : 'Cuti tahunan disetujui',
                    ],
                ];

            foreach ($samples as $payload) {
                $key = $employee->company_id.'|'.$employee->id.'|'.$payload['attendance_date'];
                /** @var EmployeeAttendance $attendance */
                $attendance = $existingByKey->get($key) ?? new EmployeeAttendance;
                $attendance->fill($payload);
                $attendance->company_id = $employee->company_id;
                $attendance->employee_id = $employee->id;
                $attendance->deleted_at = null;
                $attendance->save();
            }
        }
    }

    /**
     * @param  EloquentCollection<int, Company>  $companies
     * @param  EloquentCollection<int, User>  $users
     * @return Collection<string, PayrollRun>
     */
    private function seedPayrollRuns(EloquentCollection $companies, EloquentCollection $users)
    {
        $existingByKey = PayrollRun::query()
            ->withTrashed()
            ->get()
            ->keyBy(fn (PayrollRun $run): string => $run->company_id.'|'.$run->period_date?->format('Y-m-d'));

        $userList = $users->values();
        $admin = $userList->firstWhere('email', 'admin@foodlab.test') ?? $userList->firstOrFail();

        $runs = collect();

        foreach ($companies as $index => $company) {
            /** @var User $approver */
            $approver = $index === 0 ? $admin : $userList[$index % $userList->count()];
            $periodDate = '2025-12-01';
            $key = $company->id.'|'.$periodDate;

            /** @var PayrollRun $run */
            $run = $existingByKey->get($key) ?? new PayrollRun;
            $run->company_id = $company->id;
            $run->code = 'PR-2025-12';
            $run->name = 'Payroll Desember 2025';
            $run->period_date = $periodDate;
            $run->status = PayrollRunStatus::APPROVED;
            $run->notes = 'Payroll periode Desember 2025';
            $run->approved_by ??= $approver->id;
            $run->approved_at ??= now();
            $run->deleted_at = null;
            $run->save();

            $runs->put($key, $run);
        }

        // Additional DRAFT payroll run on primary company for Nadia & Budi
        $primaryCompany = $companies->firstOrFail();
        $draftPeriod = '2026-01-01';
        $draftKey = $primaryCompany->id.'|'.$draftPeriod;
        /** @var PayrollRun $draftRun */
        $draftRun = $existingByKey->get($draftKey) ?? new PayrollRun;
        $draftRun->company_id = $primaryCompany->id;
        $draftRun->code = 'PR-2026-01';
        $draftRun->name = 'Payroll Januari 2026';
        $draftRun->period_date = $draftPeriod;
        $draftRun->status = PayrollRunStatus::DRAFT;
        $draftRun->notes = 'Payroll periode Januari 2026 (Draft)';
        $draftRun->approved_by = null;
        $draftRun->approved_at = null;
        $draftRun->deleted_at = null;
        $draftRun->save();

        $runs->put($draftKey, $draftRun);

        return $runs;
    }

    /**
     * @param  EloquentCollection<int, Employee>  $employees
     * @param  Collection<string, PayrollRun>  $runsByCompanyAndPeriod
     * @param  EloquentCollection<int, User>  $users
     */
    private function seedPayrollItems(
        Company $primaryCompany,
        EloquentCollection $employees,
        $runsByCompanyAndPeriod,
        EloquentCollection $users
    ): void {
        $employeesByNik = $employees->keyBy('nik_ktp');
        $userList = $users->values();
        $admin = $userList->firstWhere('email', 'admin@foodlab.test') ?? $userList->firstOrFail();

        $existingItemsByKey = PayrollItem::query()
            ->withTrashed()
            ->get()
            ->keyBy(fn (PayrollItem $item): string => $item->company_id.'|'.$item->payroll_run_id.'|'.$item->employee_id);

        $primaryDecRun = $runsByCompanyAndPeriod->get($primaryCompany->id.'|2025-12-01');
        $primaryJanRun = $runsByCompanyAndPeriod->get($primaryCompany->id.'|2026-01-01');

        $canonicalRows = [
            [
                'nik_ktp' => '3273021001900001',
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
                'notes' => 'Outlet gaji pokok saja (rekening belum tercatat)',
            ],
        ];

        $canonicalNiks = [];
        foreach ($canonicalRows as $row) {
            $canonicalNiks[] = $row['nik_ktp'];
            /** @var Employee $employee */
            $employee = $employeesByNik->get($row['nik_ktp']);
            $this->upsertPayrollItem($existingItemsByKey, $primaryDecRun, $employee, [
                'payroll_group' => $row['payroll_group'],
                'attendance_days' => 25,
                'bank_account_number' => $row['bank_account_number'],
                'base_salary' => $row['base_salary'],
                'bpjs_kesehatan' => $row['bpjs_kesehatan'],
                'bpjs_ketenagakerjaan' => $row['bpjs_ketenagakerjaan'],
                'bonus' => $row['bonus'],
                'overtime' => $row['overtime'],
                'deduction' => $row['deduction'],
                'thr' => $row['thr'],
                'pph21' => $row['pph21'],
                'status' => PayrollItemStatus::FINALIZED,
                'notes' => $row['notes'],
                'finalized_by' => $admin->id,
                'finalized_at' => now(),
            ]);
        }

        // Nadia & Budi on January DRAFT run
        foreach (['3273011504960001', '3273012208920002'] as $draftIndex => $nik) {
            $canonicalNiks[] = $nik;
            /** @var Employee $employee */
            $employee = $employeesByNik->get($nik);
            $baseSalary = $draftIndex === 0 ? 5500000.00 : 8500000.00;
            $this->upsertPayrollItem($existingItemsByKey, $primaryJanRun, $employee, [
                'payroll_group' => PayrollGroup::OFFICE,
                'attendance_days' => 22,
                'bank_account_number' => '13100099000'.($draftIndex + 1),
                'base_salary' => $baseSalary,
                'bpjs_kesehatan' => round($baseSalary * 0.01, 2),
                'bpjs_ketenagakerjaan' => round($baseSalary * 0.02, 2),
                'bonus' => 250000.00,
                'overtime' => 150000.00,
                'deduction' => 0.00,
                'thr' => 0.00,
                'pph21' => 100000.00,
                'status' => PayrollItemStatus::DRAFT,
                'notes' => 'Draft payroll periode Januari 2026',
                'finalized_by' => null,
                'finalized_at' => null,
            ]);
        }

        // Remaining 100 employees on their company's December 2025 APPROVED run
        $generatedCounter = 0;
        foreach ($employees as $employee) {
            if (in_array($employee->nik_ktp, $canonicalNiks, true)) {
                continue;
            }

            $generatedCounter++;
            /** @var PayrollRun|null $run */
            $run = $runsByCompanyAndPeriod->get($employee->company_id.'|2025-12-01');
            if ($run === null) {
                continue;
            }

            /** @var User $finalizer */
            $finalizer = $userList[$generatedCounter % $userList->count()];
            $baseSalary = round(4200000.0 + ($generatedCounter * 50000.0), 2);
            $bpjsKes = round($baseSalary * 0.01, 2);
            $bpjsTk = round($baseSalary * 0.02, 2);
            $bonus = ($generatedCounter % 2 === 0) ? 300000.0 : 150000.0;
            $overtime = ($generatedCounter % 3) * 100000.0;
            $deduction = ($generatedCounter % 4 === 0) ? 50000.0 : 0.0;
            $pph21 = round($baseSalary * 0.025, 2);

            $this->upsertPayrollItem($existingItemsByKey, $run, $employee, [
                'payroll_group' => $generatedCounter % 5 === 0 ? PayrollGroup::OUTLET : PayrollGroup::OFFICE,
                'attendance_days' => 24 + ($generatedCounter % 2),
                'bank_account_number' => sprintf('13100088%05d', $generatedCounter),
                'base_salary' => $baseSalary,
                'bpjs_kesehatan' => $bpjsKes,
                'bpjs_ketenagakerjaan' => $bpjsTk,
                'bonus' => $bonus,
                'overtime' => $overtime,
                'deduction' => $deduction,
                'thr' => 0.00,
                'pph21' => $pph21,
                'status' => PayrollItemStatus::FINALIZED,
                'notes' => sprintf('Payroll karyawan #%03d periode Desember 2025', $generatedCounter),
                'finalized_by' => $finalizer->id,
                'finalized_at' => now(),
            ]);
        }

        foreach ($runsByCompanyAndPeriod as $run) {
            PayrollItemService::syncPayrollRunTotals($run);
        }
    }

    /**
     * @param  EloquentCollection<int, PayrollItem>  $existingByKey
     * @param  array<string, mixed>  $attributes
     */
    private function upsertPayrollItem(
        EloquentCollection $existingByKey,
        PayrollRun $run,
        Employee $employee,
        array $attributes
    ): void {
        $totalNet = round(
            ($attributes['base_salary'] + $attributes['bonus'] + $attributes['overtime'] + $attributes['thr'])
            - ($attributes['bpjs_kesehatan'] + $attributes['bpjs_ketenagakerjaan'] + $attributes['deduction'] + $attributes['pph21']),
            2
        );

        $key = $run->company_id.'|'.$run->id.'|'.$employee->id;
        /** @var PayrollItem $item */
        $item = $existingByKey->get($key) ?? new PayrollItem;
        $item->company_id = $run->company_id;
        $item->payroll_run_id = $run->id;
        $item->employee_id = $employee->id;
        $item->employee_position_id = $employee->employee_position_id;
        $item->payroll_group = $attributes['payroll_group'];
        $item->attendance_days = $attributes['attendance_days'];
        $item->bank_account_number = $attributes['bank_account_number'];
        $item->base_salary = $attributes['base_salary'];
        $item->bpjs_kesehatan = $attributes['bpjs_kesehatan'];
        $item->bpjs_ketenagakerjaan = $attributes['bpjs_ketenagakerjaan'];
        $item->bonus = $attributes['bonus'];
        $item->overtime = $attributes['overtime'];
        $item->deduction = $attributes['deduction'];
        $item->thr = $attributes['thr'];
        $item->pph21 = $attributes['pph21'];
        $item->total_net = $totalNet;
        $item->status = $attributes['status'];
        $item->notes = $attributes['notes'];
        $item->finalized_by = $attributes['finalized_by'];
        $item->finalized_at ??= $attributes['finalized_at'];
        if ($attributes['finalized_at'] === null) {
            $item->finalized_at = null;
        }
        $item->deleted_at = null;
        $item->save();
        $existingByKey->put($key, $item);
    }

    /**
     * @param  EloquentCollection<int, Company>  $companies
     * @param  EloquentCollection<int, PacketVendor>  $packetVendors
     * @return EloquentCollection<int, Item>
     */
    private function seedCpoItems(EloquentCollection $companies, EloquentCollection $packetVendors): EloquentCollection
    {
        $primaryCompany = $companies->firstOrFail();
        $primaryVendor = $packetVendors->firstOrFail();

        $existingByCodeKey = Item::query()
            ->withTrashed()
            ->get()
            ->keyBy(fn (Item $item): string => ($item->company_id ?? 'v'.$item->packet_vendor_id).'|'.$item->code);

        $entries = [
            ['company_id' => $primaryCompany->id, 'packet_vendor_id' => null, 'code' => 'ITM-001', 'name' => 'Apple', 'type' => ItemType::Bahan],
            ['company_id' => $primaryCompany->id, 'packet_vendor_id' => null, 'code' => 'ITM-002', 'name' => 'Banana', 'type' => ItemType::Bahan],
            ['company_id' => $primaryCompany->id, 'packet_vendor_id' => null, 'code' => 'ITM-003', 'name' => 'Orange', 'type' => ItemType::Bahan],
            ['company_id' => $primaryCompany->id, 'packet_vendor_id' => null, 'code' => 'ITM-004', 'name' => 'Jackfruit', 'type' => ItemType::Bahan],
            ['company_id' => $primaryCompany->id, 'packet_vendor_id' => null, 'code' => 'ITM-005', 'name' => 'Blender Lab', 'type' => ItemType::Kelengkapan],
            ['company_id' => $primaryCompany->id, 'packet_vendor_id' => null, 'code' => 'ITM-006', 'name' => 'Timbangan Digital', 'type' => ItemType::Sarpras],
            ['company_id' => null, 'packet_vendor_id' => $primaryVendor->id, 'code' => 'VND-ITM-001', 'name' => 'Kemasan Vendor A', 'type' => ItemType::Kelengkapan],
        ];

        $companyList = $companies->values();
        for ($i = 1; $i <= self::MIN_SEED_ROWS; $i++) {
            /** @var Company $company */
            $company = $companyList[($i - 1) % $companyList->count()];
            $entries[] = [
                'company_id' => $company->id,
                'packet_vendor_id' => null,
                'code' => sprintf('ITM-%04d', $i + 6),
                'name' => $i % 2 === 0
                    ? sprintf('Kelengkapan Uji %03d', $i)
                    : sprintf('Bahan Baku Uji %03d', $i),
                'type' => $i % 2 === 0 ? ItemType::Kelengkapan : ItemType::Bahan,
            ];
        }

        $items = new EloquentCollection;
        foreach ($entries as $entry) {
            $ownerKey = $entry['company_id'] ?? ('v'.$entry['packet_vendor_id']);
            $key = $ownerKey.'|'.$entry['code'];
            /** @var Item $item */
            $item = $existingByCodeKey->get($key) ?? new Item;
            $item->company_owner_id = $entry['company_id'] ?? $primaryCompany->id;
            $item->company_id = $entry['company_id'];
            $item->packet_vendor_id = $entry['packet_vendor_id'];
            $item->code = $entry['code'];
            $item->name = $entry['name'];
            $item->type = $entry['type'];
            $item->deleted_at = null;
            $item->save();
            $items->push($item);
        }

        return $items;
    }

    /**
     * @return EloquentCollection<int, Packet>
     */
    private function seedCpoPackets(Company $primaryCompany): EloquentCollection
    {
        $existingByName = Packet::query()->withTrashed()->get()->keyBy('name');

        $names = ['Paket A', 'Paket B'];
        for ($i = 1; $i <= self::MIN_SEED_ROWS; $i++) {
            $names[] = sprintf('Paket Uji %03d', $i);
        }

        $packets = new EloquentCollection;
        foreach ($names as $name) {
            /** @var Packet $packet */
            $packet = $existingByName->get($name) ?? new Packet;
            $packet->company_owner_id = $primaryCompany->id;
            $packet->name = $name;
            $packet->deleted_at = null;
            $packet->save();
            $packets->push($packet);
        }

        return $packets;
    }

    /**
     * @return EloquentCollection<int, PacketName>
     */
    private function seedCpoPacketNames(Company $primaryCompany): EloquentCollection
    {
        $existingByName = PacketName::query()->withTrashed()->get()->keyBy('name');

        $names = ['Paket A', 'Paket B'];
        for ($i = 1; $i <= self::MIN_SEED_ROWS; $i++) {
            $names[] = sprintf('Paket Nama %03d', $i);
        }

        $packetNames = new EloquentCollection;
        foreach ($names as $name) {
            /** @var PacketName $packetName */
            $packetName = $existingByName->get($name) ?? new PacketName;
            $packetName->company_owner_id = $primaryCompany->id;
            $packetName->name = $name;
            $packetName->deleted_at = null;
            $packetName->save();
            $packetNames->push($packetName);
        }

        return $packetNames;
    }

    /**
     * @return EloquentCollection<int, PacketVendor>
     */
    private function seedCpoPacketVendors(Company $primaryCompany): EloquentCollection
    {
        $existingByName = PacketVendor::query()->withTrashed()->get()->keyBy('name');

        $names = ['Vendor A', 'Vendor B'];
        for ($i = 1; $i <= self::MIN_SEED_ROWS; $i++) {
            $names[] = sprintf('Vendor Paket %03d', $i);
        }

        $packetVendors = new EloquentCollection;
        $vendorTypes = PacketVendorType::cases();
        foreach ($names as $index => $name) {
            /** @var PacketVendor $packetVendor */
            $packetVendor = $existingByName->get($name) ?? new PacketVendor;
            $packetVendor->company_owner_id = $primaryCompany->id;
            $packetVendor->name = $name;
            $packetVendor->type = $vendorTypes[$index % count($vendorTypes)];
            $packetVendor->deleted_at = null;
            $packetVendor->save();
            $packetVendors->push($packetVendor);
        }

        return $packetVendors;
    }

    /**
     * @return EloquentCollection<int, PacketCategory>
     */
    private function seedCpoPacketCategories(Company $primaryCompany): EloquentCollection
    {
        $existingByName = PacketCategory::query()->withTrashed()->get()->keyBy('name');

        $names = ['Kategori A', 'Kategori B'];
        for ($i = 1; $i <= self::MIN_SEED_ROWS; $i++) {
            $names[] = sprintf('Kategori Paket %03d', $i);
        }

        $packetCategories = new EloquentCollection;
        foreach ($names as $name) {
            /** @var PacketCategory $packetCategory */
            $packetCategory = $existingByName->get($name) ?? new PacketCategory;
            $packetCategory->company_owner_id = $primaryCompany->id;
            $packetCategory->name = $name;
            $packetCategory->deleted_at = null;
            $packetCategory->save();
            $packetCategories->push($packetCategory);
        }

        return $packetCategories;
    }

    /**
     * @param  EloquentCollection<int, Item>  $items
     * @param  EloquentCollection<int, Packet>  $packets
     * @return EloquentCollection<int, ItemPacket>
     */
    private function seedCpoItemPackets(
        Company $primaryCompany,
        EloquentCollection $items,
        EloquentCollection $packets
    ): EloquentCollection {
        $packetsByName = $packets->keyBy('name');
        $primaryItemsByName = $items
            ->where('company_id', $primaryCompany->id)
            ->keyBy('name');

        $existingByKey = ItemPacket::query()
            ->withTrashed()
            ->get()
            ->keyBy(fn (ItemPacket $ip): string => ($ip->company_id ?? 'v'.$ip->packet_vendor_id).'|'.$ip->packet_id.'|'.$ip->item_id);

        $seededItemPackets = new EloquentCollection;

        $canonicalMappings = [
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

        foreach ($canonicalMappings as $packetName => $entries) {
            $packet = $packetsByName->get($packetName);
            if ($packet === null) {
                continue;
            }

            foreach ($entries as $entry) {
                $item = $primaryItemsByName->get($entry['item']);
                if ($item === null) {
                    continue;
                }

                $seededItemPackets->push($this->upsertItemPacket($existingByKey, $primaryCompany->id, null, $packet->id, $item->id, $entry['quantity']));
            }
        }

        $generatedPackets = $packets
            ->reject(fn (Packet $packet): bool => in_array($packet->name, ['Paket A', 'Paket B'], true))
            ->values();

        $canonicalCodes = ['ITM-001', 'ITM-002', 'ITM-003', 'ITM-004', 'ITM-005', 'ITM-006'];
        $generatedIndex = 0;

        foreach ($items as $item) {
            if (in_array($item->code, $canonicalCodes, true)) {
                continue;
            }

            /** @var Packet $packet */
            $packet = $generatedPackets[$generatedIndex % $generatedPackets->count()];
            $seededItemPackets->push($this->upsertItemPacket(
                $existingByKey,
                $item->company_id,
                $item->packet_vendor_id,
                $packet->id,
                $item->id,
                ($generatedIndex % 5) + 1
            ));
            $generatedIndex++;
        }

        return $seededItemPackets;
    }

    /**
     * @param  EloquentCollection<int, ItemPacket>  $existingByKey
     */
    private function upsertItemPacket(
        EloquentCollection $existingByKey,
        ?int $companyId,
        ?int $packetVendorId,
        int $packetId,
        int $itemId,
        int $quantity
    ): ItemPacket {
        $ownerKey = $companyId ?? ('v'.$packetVendorId);
        $key = $ownerKey.'|'.$packetId.'|'.$itemId;
        /** @var ItemPacket $itemPacket */
        $itemPacket = $existingByKey->get($key) ?? new ItemPacket;
        $itemPacket->company_owner_id = $companyId ?? 1;
        $itemPacket->company_id = $companyId;
        $itemPacket->packet_vendor_id = $packetVendorId;
        $itemPacket->packet_id = $packetId;
        $itemPacket->item_id = $itemId;
        $itemPacket->quantity = $quantity;
        $itemPacket->deleted_at = null;
        $itemPacket->save();
        $existingByKey->put($key, $itemPacket);

        return $itemPacket;
    }

    /**
     * @param  EloquentCollection<int, PacketName>  $packetNames
     * @param  EloquentCollection<int, PacketVendor>  $packetVendors
     * @param  EloquentCollection<int, PacketCategory>  $packetCategories
     * @param  EloquentCollection<int, ItemPacket>  $itemPackets
     * @return EloquentCollection<int, DefaultPackage>
     */
    private function seedCpoDefaultPackages(
        Company $primaryCompany,
        EloquentCollection $packetNames,
        EloquentCollection $packetVendors,
        EloquentCollection $packetCategories,
        EloquentCollection $itemPackets
    ): EloquentCollection {
        $existingByKey = DefaultPackage::query()
            ->withTrashed()
            ->get()
            ->keyBy(fn (DefaultPackage $dp): string => implode('|', [
                $dp->brand_name,
                $dp->packet_name_id,
                $dp->company_id !== null ? 'c'.$dp->company_id : 'v'.$dp->packet_vendor_id,
                $dp->packet_category_id,
                $dp->item_packet_id ?? $dp->packet_id ?? '',
            ]));

        $canonicalName = $packetNames->firstWhere('name', 'Paket A') ?? $packetNames->firstOrFail();
        $canonicalVendor = $packetVendors->firstWhere('name', 'Vendor A') ?? $packetVendors->firstOrFail();
        $canonicalCategory = $packetCategories->firstWhere('name', 'Kategori A') ?? $packetCategories->firstOrFail();
        $canonicalItemPacket = $itemPackets
            ->first(fn (ItemPacket $ip): bool => (int) $ip->company_id === (int) $primaryCompany->id)
            ?? $itemPackets->firstOrFail();

        $seeded = new EloquentCollection;

        $seeded->push($this->upsertDefaultPackage(
            $existingByKey,
            'Brand A',
            $canonicalName->id,
            null,
            $canonicalVendor->id,
            $canonicalCategory->id,
            $canonicalItemPacket->packet_id,
            $canonicalItemPacket->id,
            15000.00
        ));

        $seeded->push($this->upsertDefaultPackage(
            $existingByKey,
            'Brand Internal A',
            $canonicalName->id,
            $primaryCompany->id,
            null,
            $canonicalCategory->id,
            $canonicalItemPacket->packet_id,
            $canonicalItemPacket->id,
            18000.00
        ));

        $nameList = $packetNames->values();
        $vendorList = $packetVendors->values();
        $categoryList = $packetCategories->values();
        $itemPacketList = $itemPackets->values();

        for ($i = 1; $i <= self::MIN_SEED_ROWS; $i++) {
            /** @var PacketName $pktName */
            $pktName = $nameList[($i - 1) % $nameList->count()];
            /** @var PacketVendor $pktVendor */
            $pktVendor = $vendorList[($i - 1) % $vendorList->count()];
            /** @var PacketCategory $pktCategory */
            $pktCategory = $categoryList[($i - 1) % $categoryList->count()];
            /** @var ItemPacket $itemPacket */
            $itemPacket = $itemPacketList[($i - 1) % $itemPacketList->count()];

            $seeded->push($this->upsertDefaultPackage(
                $existingByKey,
                sprintf('Brand Paket %03d', $i),
                $pktName->id,
                null,
                $pktVendor->id,
                $pktCategory->id,
                $itemPacket->packet_id,
                $itemPacket->id,
                round(10000.00 + ($i * 2500.00), 2)
            ));
        }

        return $seeded;
    }

    /**
     * @param  EloquentCollection<int, DefaultPackage>  $existingByKey
     */
    private function upsertDefaultPackage(
        EloquentCollection $existingByKey,
        string $brandName,
        int $packetNameId,
        ?int $companyId,
        ?int $packetVendorId,
        int $packetCategoryId,
        ?int $packetId,
        ?int $itemPacketId,
        float $price
    ): DefaultPackage {
        $ownerKey = $companyId !== null ? 'c'.$companyId : 'v'.$packetVendorId;
        $key = implode('|', [
            $brandName,
            $packetNameId,
            $ownerKey,
            $packetCategoryId,
            $itemPacketId ?? $packetId ?? '',
        ]);

        /** @var DefaultPackage $defaultPackage */
        $defaultPackage = $existingByKey->get($key) ?? new DefaultPackage([
            'brand_name' => $brandName,
            'packet_name_id' => $packetNameId,
            'company_id' => $companyId,
            'packet_vendor_id' => $packetVendorId,
            'packet_category_id' => $packetCategoryId,
            'packet_id' => $packetId,
            'item_packet_id' => $itemPacketId,
        ]);
        $defaultPackage->company_owner_id = $companyId ?? 1;
        $defaultPackage->company_id = $companyId;
        $defaultPackage->packet_vendor_id = $packetVendorId;
        $defaultPackage->packet_id = $packetId;
        $defaultPackage->price = $price;
        $defaultPackage->deleted_at = null;
        $defaultPackage->save();
        $existingByKey->put($key, $defaultPackage);

        return $defaultPackage;
    }

    /**
     * @param  EloquentCollection<int, DefaultPackage>  $defaultPackages
     * @param  EloquentCollection<int, Item>  $items
     */
    private function seedCpoIngredients(
        Company $primaryCompany,
        EloquentCollection $defaultPackages,
        EloquentCollection $items
    ): void {
        $existingByKey = Ingredient::query()
            ->withTrashed()
            ->get()
            ->keyBy(fn (Ingredient $ing): string => $ing->default_package_id.'|'.$ing->item_id);

        $firstDefaultPackage = $defaultPackages->firstOrFail();
        $firstItem = $items->firstOrFail();

        $this->upsertIngredient($existingByKey, $firstDefaultPackage->company_owner_id ?? $primaryCompany->id, $firstDefaultPackage->id, $firstItem->id, 1.00);

        $dpList = $defaultPackages->values();
        $itemList = $items->values();

        for ($i = 1; $i <= self::MIN_SEED_ROWS; $i++) {
            /** @var DefaultPackage $dp */
            $dp = $dpList[($i - 1) % $dpList->count()];
            /** @var Item $item */
            $item = $itemList[$i % $itemList->count()];

            $this->upsertIngredient(
                $existingByKey,
                $dp->company_owner_id ?? $primaryCompany->id,
                $dp->id,
                $item->id,
                round(1500.00 + ($i * 500.00), 2)
            );
        }
    }

    /**
     * @param  EloquentCollection<int, Ingredient>  $existingByKey
     */
    private function upsertIngredient(
        EloquentCollection $existingByKey,
        int $companyOwnerId,
        int $defaultPackageId,
        int $itemId,
        float $price
    ): void {
        $key = $defaultPackageId.'|'.$itemId;
        /** @var Ingredient $ingredient */
        $ingredient = $existingByKey->get($key) ?? new Ingredient([
            'default_package_id' => $defaultPackageId,
            'item_id' => $itemId,
        ]);
        $ingredient->company_owner_id = $companyOwnerId;
        $ingredient->price = $price;
        $ingredient->deleted_at = null;
        $ingredient->save();
        $existingByKey->put($key, $ingredient);
    }
}
