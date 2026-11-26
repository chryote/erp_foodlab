<?php

use App\Enums\ItemType;
use App\Enums\PacketVendorType;
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
use Database\Seeders\DatabaseSeeder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Schema;

describe('General System Integrity, Schema, Storage & API Contract Guardrails', function () {
    beforeEach(function () {
        Artisan::call('migrate:fresh');
        actingAsErpUser();
    });

    it('ensures storage, logs, and bootstrap/cache directories exist and are writable', function () {
        $requiredDirectories = [
            storage_path('logs'),
            storage_path('framework/cache'),
            storage_path('framework/sessions'),
            storage_path('framework/views'),
            base_path('bootstrap/cache'),
        ];

        foreach ($requiredDirectories as $dir) {
            expect(is_dir($dir))->toBeTrue("Directory {$dir} must exist");
            expect(is_writable($dir))->toBeTrue("Directory {$dir} must be writable");
        }

        $logFile = storage_path('logs/laravel.log');
        if (file_exists($logFile)) {
            expect(is_writable($logFile))->toBeTrue("Log file {$logFile} must be writable");
        }
    });

    it('ensures docker-entrypoint.sh enforces storage permissions and hands off to php-fpm entrypoint', function () {
        $entrypointPath = base_path('docker-entrypoint.sh');
        expect(file_exists($entrypointPath))->toBeTrue();

        $contents = file_get_contents($entrypointPath);
        expect($contents)
            ->toContain('chown -R www-data:www-data /var/www/html/storage /var/www/html/bootstrap/cache')
            ->toContain('chmod -R 775 /var/www/html/storage /var/www/html/bootstrap/cache')
            ->toContain('exec docker-php-entrypoint "$@"');
    });

    it('discovers all Eloquent models and verifies their database tables and fillable columns exist', function () {
        $modelFiles = File::allFiles(app_path('Models'));
        expect($modelFiles)->not->toBeEmpty();

        foreach ($modelFiles as $file) {
            $className = 'App\\Models\\'.$file->getFilenameWithoutExtension();
            expect(class_exists($className))->toBeTrue("Model class {$className} should exist");

            $reflection = new ReflectionClass($className);
            if ($reflection->isAbstract() || ! $reflection->isSubclassOf(Model::class)) {
                continue;
            }

            /** @var Model $model */
            $model = $reflection->newInstance();
            $table = $model->getTable();

            expect(Schema::hasTable($table))->toBeTrue(
                "Database table '{$table}' for model {$className} is missing from migrations."
            );

            $columns = Schema::getColumnListing($table);
            expect(in_array($model->getKeyName(), $columns, true))->toBeTrue();

            foreach ($model->getFillable() as $fillableColumn) {
                expect(in_array($fillableColumn, $columns, true))->toBeTrue(
                    "Fillable column '{$fillableColumn}' on {$className} is missing from table '{$table}'."
                );
            }
        }
    });

    it('runs DatabaseSeeder without errors and populates expected records idempotently', function () {
        expect(fn () => Artisan::call('db:seed', ['--class' => DatabaseSeeder::class]))
            ->not->toThrow(Throwable::class);

        $firstCounts = [
            'users' => User::query()->count(),
            'companies' => Company::query()->count(),
            'capital_companies' => CapitalCompany::query()->count(),
            'expense_categories' => ExpenseCategory::query()->count(),
            'expense_types' => ExpenseType::query()->count(),
            'expense_items' => ExpenseItem::query()->count(),
            'company_assets' => CompanyAsset::query()->count(),
            'employee_positions' => EmployeePosition::query()->count(),
            'employment_statuses' => EmploymentStatus::query()->count(),
            'payroll_grades' => PayrollGrade::query()->count(),
            'tax_statuses' => TaxStatus::query()->count(),
            'employees' => Employee::query()->count(),
            'employee_documents' => EmployeeDocument::query()->count(),
            'employee_shifts' => EmployeeShift::query()->count(),
            'employee_shift_assignments' => EmployeeShiftAssignment::query()->count(),
            'employee_attendances' => EmployeeAttendance::query()->count(),
            'payroll_runs' => PayrollRun::query()->count(),
            'payroll_items' => PayrollItem::query()->count(),
            'items' => Item::query()->count(),
            'packets' => Packet::query()->count(),
            'packet_categories' => PacketCategory::query()->count(),
            'packet_names' => PacketName::query()->count(),
            'packet_vendors' => PacketVendor::query()->count(),
            'item_packet' => ItemPacket::query()->count(),
            'default_packages' => DefaultPackage::query()->count(),
            'ingredients' => Ingredient::query()->count(),
            'lab_samples' => LabSample::query()->count(),
        ];

        foreach ($firstCounts as $table => $count) {
            expect($count)->toBeGreaterThanOrEqual(
                DatabaseSeeder::MIN_SEED_ROWS,
                "Expected table '{$table}' to be populated with at least ".DatabaseSeeder::MIN_SEED_ROWS.' rows by DatabaseSeeder.'
            );
        }

        expect(fn () => Artisan::call('db:seed', ['--class' => DatabaseSeeder::class]))
            ->not->toThrow(Throwable::class);

        $secondCounts = [
            'users' => User::query()->count(),
            'companies' => Company::query()->count(),
            'capital_companies' => CapitalCompany::query()->count(),
            'expense_categories' => ExpenseCategory::query()->count(),
            'expense_types' => ExpenseType::query()->count(),
            'expense_items' => ExpenseItem::query()->count(),
            'company_assets' => CompanyAsset::query()->count(),
            'employee_positions' => EmployeePosition::query()->count(),
            'employment_statuses' => EmploymentStatus::query()->count(),
            'payroll_grades' => PayrollGrade::query()->count(),
            'tax_statuses' => TaxStatus::query()->count(),
            'employees' => Employee::query()->count(),
            'employee_documents' => EmployeeDocument::query()->count(),
            'employee_shifts' => EmployeeShift::query()->count(),
            'employee_shift_assignments' => EmployeeShiftAssignment::query()->count(),
            'employee_attendances' => EmployeeAttendance::query()->count(),
            'payroll_runs' => PayrollRun::query()->count(),
            'payroll_items' => PayrollItem::query()->count(),
            'items' => Item::query()->count(),
            'packets' => Packet::query()->count(),
            'packet_categories' => PacketCategory::query()->count(),
            'packet_names' => PacketName::query()->count(),
            'packet_vendors' => PacketVendor::query()->count(),
            'item_packet' => ItemPacket::query()->count(),
            'default_packages' => DefaultPackage::query()->count(),
            'ingredients' => Ingredient::query()->count(),
            'lab_samples' => LabSample::query()->count(),
        ];

        expect($secondCounts)->toBe($firstCounts);

        $nadia = Employee::query()->with('employeePosition')->where('nik_ktp', '3273011504960001')->firstOrFail();
        $budi = Employee::query()->with('employeePosition')->where('nik_ktp', '3273012208920002')->firstOrFail();

        expect($nadia->employee_attendance_code)->toBe('NadiaSTAFFA'.$nadia->id);
        expect($budi->employee_attendance_code)->toBe('BudiSTAFFB'.$budi->id);

        $seededVendors = PacketVendor::query()->get();
        $vendorIds = $seededVendors->pluck('id')->all();
        expect($seededVendors)->not->toBeEmpty();
        foreach ($seededVendors as $seededVendor) {
            expect($seededVendor->type)->toBeInstanceOf(PacketVendorType::class);
        }

        $seededItems = Item::query()->get();
        $companyIds = Company::query()->pluck('id')->all();
        expect($seededItems)->not->toBeEmpty();
        expect($seededItems->pluck('type')->contains(ItemType::Bahan))->toBeTrue();
        expect($seededItems->pluck('type')->contains(ItemType::Kelengkapan))->toBeTrue();
        expect($seededItems->whereNotNull('company_id'))->not->toBeEmpty();
        expect($seededItems->whereNotNull('packet_vendor_id'))->not->toBeEmpty();
        foreach ($seededItems as $seededItem) {
            if ($seededItem->company_id !== null) {
                expect($companyIds)->toContain($seededItem->company_id);
                expect($seededItem->packet_vendor_id)->toBeNull();
                expect($seededItem->code)->toStartWith('ITM-');
            } else {
                expect($vendorIds)->toContain($seededItem->packet_vendor_id);
                expect($seededItem->code)->toStartWith('VND-ITM-');
            }
            expect($seededItem->code)->not->toBeNull();
            expect($seededItem->type)->toBeInstanceOf(ItemType::class);
        }

        $seededItemPackets = ItemPacket::query()->with('item')->get();
        expect($seededItemPackets)->not->toBeEmpty();
        expect($seededItemPackets->whereNotNull('company_id'))->not->toBeEmpty();
        expect($seededItemPackets->whereNotNull('packet_vendor_id'))->not->toBeEmpty();
        foreach ($seededItemPackets as $seededItemPacket) {
            if ($seededItemPacket->company_id !== null) {
                expect($companyIds)->toContain($seededItemPacket->company_id);
                expect($seededItemPacket->packet_vendor_id)->toBeNull();
            } else {
                expect($vendorIds)->toContain($seededItemPacket->packet_vendor_id);
            }
            expect($seededItemPacket->company_id)->toBe($seededItemPacket->item?->company_id);
            expect($seededItemPacket->packet_vendor_id)->toBe($seededItemPacket->item?->packet_vendor_id);
        }
    });

    it('verifies all registered GET API endpoints return 200 OK with CORS headers after seeding', function () {
        Artisan::call('db:seed', ['--class' => DatabaseSeeder::class]);

        $routes = collect(Route::getRoutes()->getRoutes())
            ->filter(function ($route) {
                $uri = $route->uri();
                $methods = $route->methods();

                return str_starts_with($uri, 'api/')
                    && in_array('GET', $methods, true)
                    && ! str_contains($uri, '{');
            });

        expect($routes)->not->toBeEmpty();

        foreach ($routes as $route) {
            $uri = '/'.ltrim($route->uri(), '/');
            $response = $this->withHeaders([
                'Origin' => 'http://localhost:5173',
                'Accept' => 'application/json',
            ])->get($uri);

            expect($response->getStatusCode())->toBe(
                200,
                "GET {$uri} failed with status {$response->getStatusCode()}"
            );
            expect($response->headers->get('Access-Control-Allow-Origin'))->not->toBeNull(
                "GET {$uri} is missing Access-Control-Allow-Origin CORS header"
            );
        }
    });
});
