<?php

use App\Enums\LabSampleStatus;
use App\Models\Company;
use App\Models\ExpenseCategory;
use App\Models\ExpenseItem;
use App\Models\ExpenseType;
use App\Models\LabSample;
use Illuminate\Support\Facades\Cache;

describe('ExpenseItem Golden Module & Spec-Driven Backend Standards', function () {
    beforeEach(function () {
        Cache::flush();
        actingAsErpUser();
    });

    it('supports full CRUD, QueryBuilder filtering/sorting/includes, validation, and soft-deletes', function () {
        $companyA = Company::factory()->create(['name' => 'PT. Foodlab Alpha']);
        $companyB = Company::factory()->create(['name' => 'PT. Foodlab Beta']);

        $categoryA = ExpenseCategory::factory()->create([
            'company_id' => $companyA->id,
            'name' => 'Reagen Lab',
        ]);
        $typeA = ExpenseType::factory()->create([
            'company_id' => $companyA->id,
            'expense_category_id' => $categoryA->id,
            'name' => 'Kimia Analitik',
        ]);

        $categoryB = ExpenseCategory::factory()->create([
            'company_id' => $companyB->id,
            'name' => 'Packaging',
        ]);
        $typeB = ExpenseType::factory()->create([
            'company_id' => $companyB->id,
            'expense_category_id' => $categoryB->id,
            'name' => 'Botol Kaca',
        ]);

        // Create via FormRequest validation + DB transaction
        $createRes = $this->postJson('/api/v1/modules/cfo/expense-items', [
            'company_id' => $companyA->id,
            'expense_category_id' => $categoryA->id,
            'expense_type_id' => $typeA->id,
            'name' => 'Etanol PA 99%',
            'amount' => 1500000,
            'purchased_on' => '2026-11-19',
            'detail' => 'Batch uji mikrobiologi',
        ]);

        $createRes->assertCreated()
            ->assertJsonStructure([
                'data' => [
                    'id',
                    'expense_category_id',
                    'expense_type_id',
                    'company_id',
                    'name',
                    'amount',
                    'purchased_on',
                    'closing_date',
                    'employee_id',
                    'detail',
                    'expense_category',
                    'expense_type',
                    'company',
                    'created_at',
                    'updated_at',
                    'deleted_at',
                ],
            ])
            ->assertJsonPath('data.name', 'Etanol PA 99%')
            ->assertJsonPath('data.amount', 1500000);

        $itemA1Id = $createRes->json('data.id');

        $itemA2 = ExpenseItem::factory()->create([
            'company_id' => $companyA->id,
            'expense_category_id' => $categoryA->id,
            'expense_type_id' => $typeA->id,
            'name' => 'Buffer pH 7.0',
            'amount' => 450000,
            'purchased_on' => '2026-11-18',
        ]);

        ExpenseItem::factory()->create([
            'company_id' => $companyB->id,
            'expense_category_id' => $categoryB->id,
            'expense_type_id' => $typeB->id,
            'name' => 'Botol Sampel 100ml',
            'amount' => 900000,
            'purchased_on' => '2026-11-19',
        ]);

        // Spatie QueryBuilder filter + sort + include
        $this->getJson("/api/v1/modules/cfo/expense-items?filter[company_id]={$companyA->id}&sort=amount&include=company")
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.id', $itemA2->id)
            ->assertJsonPath('data.1.id', $itemA1Id)
            ->assertJsonPath('data.0.company.id', $companyA->id);

        // Search filter + pagination
        $this->getJson('/api/v1/modules/cfo/expense-items?filter[search]=Etanol&per_page=5&page=1')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $itemA1Id)
            ->assertJsonPath('meta.total', 1);

        // Show single item
        $this->getJson("/api/v1/modules/cfo/expense-items/{$itemA1Id}")
            ->assertOk()
            ->assertJsonPath('data.id', $itemA1Id);

        // Update via FormRequest
        $this->putJson("/api/v1/modules/cfo/expense-items/{$itemA1Id}", [
            'company_id' => $companyA->id,
            'expense_category_id' => $categoryA->id,
            'expense_type_id' => $typeA->id,
            'name' => 'Etanol PA 99.9%',
            'amount' => 1750000,
            'purchased_on' => '2026-11-19',
            'detail' => 'Updated batch',
        ])->assertOk()
            ->assertJsonPath('data.name', 'Etanol PA 99.9%')
            ->assertJsonPath('data.amount', 1750000);

        // Validation failure returns 422
        $this->postJson('/api/v1/modules/cfo/expense-items', [
            'company_id' => $companyA->id,
            'expense_type_id' => $typeB->id, // belongs to company B
            'name' => '',
            'amount' => -10,
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['expense_type_id', 'name', 'amount', 'purchased_on']);

        // Soft delete (never hard-delete ERP records)
        $this->deleteJson("/api/v1/modules/cfo/expense-items/{$itemA1Id}")
            ->assertOk();

        $this->assertSoftDeleted('expense_items', ['id' => $itemA1Id]);
    });

    it('casts LabSample status to backed PHP Enum and supports SoftDeletes', function () {
        $response = $this->postJson('/api/v1/samples', [
            'batch_code' => 'FL-ENUM-001',
            'product_name' => 'UHT Skim Milk',
            'category' => 'Dairy',
            'ph_level' => 6.7,
            'moisture_percent' => 88.0,
            'status' => LabSampleStatus::APPROVED->value,
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.status', 'approved');

        $sample = LabSample::query()->findOrFail($response->json('data.id'));
        expect($sample->status)->toBe(LabSampleStatus::APPROVED);

        $sample->delete();
        $this->assertSoftDeleted('lab_samples', ['id' => $sample->id]);

        $this->postJson('/api/v1/samples', [
            'batch_code' => 'FL-ENUM-002',
            'product_name' => 'UHT Skim Milk',
            'category' => 'Dairy',
            'ph_level' => 6.7,
            'moisture_percent' => 88.0,
            'status' => 'invalid_status',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['status']);
    });

    it('serves auto-generated OpenAPI documentation via dedoc/scramble', function () {
        $this->getJson('/docs/api.json')
            ->assertOk()
            ->assertJsonStructure(['openapi', 'info', 'paths']);
    });

    it('filters expense items by YYYY-MM-DD daterange and date_from/date_to', function () {
        $company = Company::factory()->create(['name' => 'PT. Foodlab DateRange']);
        $category = ExpenseCategory::factory()->create(['company_id' => $company->id, 'name' => 'Operasional']);
        $type = ExpenseType::factory()->create([
            'company_id' => $company->id,
            'expense_category_id' => $category->id,
            'name' => 'Listrik',
        ]);

        $itemNov01 = ExpenseItem::factory()->create([
            'company_id' => $company->id,
            'expense_category_id' => $category->id,
            'expense_type_id' => $type->id,
            'name' => 'Expense Nov 01',
            'purchased_on' => '2026-11-01',
        ]);
        $itemNov15 = ExpenseItem::factory()->create([
            'company_id' => $company->id,
            'expense_category_id' => $category->id,
            'expense_type_id' => $type->id,
            'name' => 'Expense Nov 15',
            'purchased_on' => '2026-11-15',
        ]);
        $itemNov30 = ExpenseItem::factory()->create([
            'company_id' => $company->id,
            'expense_category_id' => $category->id,
            'expense_type_id' => $type->id,
            'name' => 'Expense Nov 30',
            'purchased_on' => '2026-11-30',
        ]);

        // Inclusive filter[daterange]=YYYY-MM-DD,YYYY-MM-DD
        $this->getJson('/api/v1/modules/cfo/expense-items?filter[daterange]=2026-11-10,2026-11-30&sort=purchased_on')
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.id', $itemNov15->id)
            ->assertJsonPath('data.1.id', $itemNov30->id);

        // Flat ?daterange=YYYY-MM-DD..YYYY-MM-DD
        $this->getJson('/api/v1/modules/cfo/expense-items?daterange=2026-11-01..2026-11-15&sort=purchased_on')
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.id', $itemNov01->id)
            ->assertJsonPath('data.1.id', $itemNov15->id);

        // Single-day filter[daterange]=YYYY-MM-DD
        $this->getJson('/api/v1/modules/cfo/expense-items?filter[daterange]=2026-11-15')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $itemNov15->id);

        // filter[date_from] and filter[date_to] (and flat aliases)
        $this->getJson('/api/v1/modules/cfo/expense-items?filter[date_from]=2026-11-15&filter[date_to]=2026-11-30&sort=purchased_on')
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.id', $itemNov15->id)
            ->assertJsonPath('data.1.id', $itemNov30->id);

        $this->getJson('/api/v1/modules/cfo/expense-items?date_from=2026-11-20')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $itemNov30->id);

        $this->getJson('/api/v1/modules/cfo/expense-items?date_to=2026-11-05')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $itemNov01->id);

        // Invalid date format returns 422
        $this->getJson('/api/v1/modules/cfo/expense-items?filter[daterange]=2026-02-30,2026-11-30')
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['daterange']);

        $this->getJson('/api/v1/modules/cfo/expense-items?filter[date_from]=19-11-2026')
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['date_from']);

        // Unfiltered list still returns all 3 items (not polluted by filtered requests)
        $this->getJson('/api/v1/modules/cfo/expense-items')
            ->assertOk()
            ->assertJsonCount(3, 'data');
    });
});
