<?php

use App\Http\Resources\CapitalCompanyResource;
use App\Http\Resources\CompanyResource;
use App\Http\Resources\ExpenseCategoryResource;
use App\Http\Resources\ExpenseItemResource;
use App\Http\Resources\ExpenseTypeResource;
use App\Http\Resources\LabSampleResource;
use App\Http\Resources\UserResource;
use App\Models\CapitalCompany;
use App\Models\Company;
use App\Models\ExpenseCategory;
use App\Models\ExpenseItem;
use App\Models\ExpenseType;
use App\Models\LabSample;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\File;

uses(RefreshDatabase::class);

describe('Model JsonResources', function () {
    it('ensures every Eloquent model in app/Models has a corresponding JsonResource in app/Http/Resources', function () {
        $modelFiles = File::allFiles(app_path('Models'));
        expect($modelFiles)->not->toBeEmpty();

        foreach ($modelFiles as $file) {
            $modelBase = $file->getFilenameWithoutExtension();
            $modelClass = 'App\\Models\\' . $modelBase;
            $reflection = new ReflectionClass($modelClass);

            if ($reflection->isAbstract() || ! $reflection->isSubclassOf(Model::class)) {
                continue;
            }

            $resourceClass = 'App\\Http\\Resources\\' . $modelBase . 'Resource';
            expect(class_exists($resourceClass))->toBeTrue(
                "JsonResource class {$resourceClass} is missing for model {$modelClass}."
            );
            expect(is_subclass_of($resourceClass, JsonResource::class))->toBeTrue(
                "{$resourceClass} must extend Illuminate\\Http\\Resources\\Json\\JsonResource."
            );
        }
    });

    it('transforms Company, CapitalCompany, ExpenseCategory, ExpenseType, and ExpenseItem with conditional relations', function () {
        $company = Company::factory()->create([
            'name' => 'PT. Slaras Nusa Foodlab',
            'series' => 2,
        ]);

        $capital = CapitalCompany::factory()->create([
            'company_id' => $company->id,
            'stakeholder_name' => 'Rian',
            'capital' => 150000000.5,
        ]);

        $category = ExpenseCategory::factory()->create([
            'company_id' => $company->id,
            'name' => 'Bahan Baku',
        ]);

        $type = ExpenseType::factory()->create([
            'company_id' => $company->id,
            'expense_category_id' => $category->id,
            'name' => 'Dairy',
        ]);

        $item = ExpenseItem::factory()->create([
            'company_id' => $company->id,
            'expense_category_id' => $category->id,
            'expense_type_id' => $type->id,
            'name' => 'Susu Segar',
            'amount' => 2500000.25,
            'purchased_on' => '2026-11-19',
            'closing_date' => '2026-11-30',
            'employee_id' => 7,
            'detail' => 'Stok mingguan',
        ]);

        $request = Request::create('/');

        // Without loaded relations, nested keys must be omitted
        $unloadedCompany = (new CompanyResource($company))->resolve($request);
        expect($unloadedCompany)
            ->toHaveKeys(['id', 'name', 'series', 'created_at', 'updated_at', 'deleted_at'])
            ->not->toHaveKey('capital_companies');
        expect($unloadedCompany['series'])->toBe(2);

        $unloadedItem = (new ExpenseItemResource($item))->resolve($request);
        expect($unloadedItem)
            ->not->toHaveKey('company')
            ->not->toHaveKey('expense_category')
            ->not->toHaveKey('expense_type');
        expect($unloadedItem['amount'])->toBe(2500000.25);
        expect($unloadedItem['purchased_on'])->toBe('2026-11-19');
        expect($unloadedItem['closing_date'])->toBe('2026-11-30');
        expect($unloadedItem['employee_id'])->toBe(7);

        // With loaded relations, nested resources must use snake_case keys
        $company->load('capitalCompanies');
        $loadedCompany = (new CompanyResource($company))->resolve($request);
        expect($loadedCompany['capital_companies'])->toHaveCount(1);

        $capital->load('company');
        $loadedCapital = (new CapitalCompanyResource($capital))->resolve($request);
        expect($loadedCapital['company']['name'])->toBe('PT. Slaras Nusa Foodlab');
        expect($loadedCapital['capital'])->toBe(150000000.5);

        $category->load('company');
        $loadedCategory = (new ExpenseCategoryResource($category))->resolve($request);
        expect($loadedCategory['company']['id'])->toBe($company->id);

        $type->load(['expenseCategory', 'company']);
        $loadedType = (new ExpenseTypeResource($type))->resolve($request);
        expect($loadedType['expense_category']['name'])->toBe('Bahan Baku');
        expect($loadedType['company']['name'])->toBe('PT. Slaras Nusa Foodlab');

        $item->load(['expenseCategory', 'expenseType', 'company']);
        $loadedItem = (new ExpenseItemResource($item))->resolve($request);
        expect($loadedItem['expense_category']['name'])->toBe('Bahan Baku');
        expect($loadedItem['expense_type']['name'])->toBe('Dairy');
        expect($loadedItem['company']['name'])->toBe('PT. Slaras Nusa Foodlab');
    });

    it('handles soft-deleted parent relations loaded as null without throwing', function () {
        $company = Company::factory()->create();
        $capital = CapitalCompany::factory()->create(['company_id' => $company->id]);
        $company->delete();

        $capital->load('company');
        $resolved = (new CapitalCompanyResource($capital))->resolve(Request::create('/'));

        expect($resolved['company'])->toBeNull();
    });

    it('transforms LabSample and User models while excluding sensitive User attributes', function () {
        $sample = LabSample::factory()->create([
            'batch_code' => 'FL-RES-001',
            'ph_level' => 6.5,
            'moisture_percent' => 82.25,
            'status' => 'approved',
        ]);

        $user = User::factory()->create([
            'name' => 'Lab Admin',
            'email' => 'admin@foodlab.test',
        ]);

        $request = Request::create('/');

        $sampleData = (new LabSampleResource($sample))->resolve($request);
        expect($sampleData)
            ->toHaveKeys(['id', 'batch_code', 'product_name', 'category', 'ph_level', 'moisture_percent', 'status', 'created_at', 'updated_at']);
        expect($sampleData['ph_level'])->toBe(6.5);
        expect($sampleData['moisture_percent'])->toBe(82.25);

        $userData = (new UserResource($user))->resolve($request);
        expect($userData)
            ->toHaveKeys(['id', 'name', 'email', 'email_verified_at', 'created_at', 'updated_at'])
            ->not->toHaveKey('password')
            ->not->toHaveKey('remember_token');
        expect($userData['email'])->toBe('admin@foodlab.test');
    });
});
