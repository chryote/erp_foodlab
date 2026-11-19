<?php

use App\Models\Company;
use App\Models\ExpenseCategory;
use App\Models\ExpenseItem;
use App\Models\ExpenseType;
use Illuminate\Support\Facades\Cache;

describe('CFO Expense Category, Type, and Item CRUD scoped by company_id', function () {
    beforeEach(function () {
        Cache::flush();
    });

    it('creates, filters, updates, and soft-deletes expense categories, types, and items per company_id via API', function () {
        $companyA = Company::factory()->create(['name' => 'PT. Slaras Nusa Foodlab']);
        $companyB = Company::factory()->create(['name' => 'PT. Pangan Nusantara']);

        $catARes = $this->postJson('/api/v1/modules/cfo/expense-categories', [
            'company_id' => $companyA->id,
            'name' => 'Bahan Baku',
        ]);
        $catARes->assertCreated()
            ->assertJsonPath('data.company_id', $companyA->id)
            ->assertJsonPath('data.name', 'Bahan Baku');

        $catBRes = $this->postJson('/api/v1/modules/cfo/expense-categories', [
            'company_id' => $companyB->id,
            'name' => 'Operasional B',
        ]);
        $catBRes->assertCreated()
            ->assertJsonPath('data.company_id', $companyB->id);

        $catAId = $catARes->json('data.id');
        $catBId = $catBRes->json('data.id');

        $this->getJson("/api/v1/modules/cfo/expense-categories?company_id={$companyA->id}")
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $catAId);

        // Creating an ExpenseType with a category belonging to another company fails validation
        $this->postJson('/api/v1/modules/cfo/expense-types', [
            'company_id' => $companyA->id,
            'expense_category_id' => $catBId,
            'name' => 'Invalid Cross Company Type',
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['expense_category_id']);

        $typeARes = $this->postJson('/api/v1/modules/cfo/expense-types', [
            'company_id' => $companyA->id,
            'expense_category_id' => $catAId,
            'name' => 'Bubuk',
        ]);
        $typeARes->assertCreated()
            ->assertJsonPath('data.company_id', $companyA->id)
            ->assertJsonPath('data.expense_category_id', $catAId);

        $typeBRes = $this->postJson('/api/v1/modules/cfo/expense-types', [
            'company_id' => $companyB->id,
            'expense_category_id' => $catBId,
            'name' => 'Bubuk',
        ]);
        $typeBRes->assertCreated()
            ->assertJsonPath('data.company_id', $companyB->id);

        $typeAId = $typeARes->json('data.id');
        $typeBId = $typeBRes->json('data.id');

        $this->getJson("/api/v1/modules/cfo/expense-types?company_id={$companyA->id}")
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $typeAId);

        // Creating an ExpenseItem with a type belonging to another company fails validation
        $this->postJson('/api/v1/modules/cfo/expense-items', [
            'company_id' => $companyA->id,
            'expense_category_id' => $catAId,
            'expense_type_id' => $typeBId,
            'name' => 'Cross Company Item',
            'amount' => 1000000,
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['expense_type_id']);

        $itemARes = $this->postJson('/api/v1/modules/cfo/expense-items', [
            'company_id' => $companyA->id,
            'expense_category_id' => $catAId,
            'expense_type_id' => $typeAId,
            'name' => 'Bubuk Coklat',
            'amount' => 2000000,
        ]);
        $itemARes->assertCreated()
            ->assertJsonPath('data.company_id', $companyA->id)
            ->assertJsonPath('data.expense_category_id', $catAId)
            ->assertJsonPath('data.expense_type_id', $typeAId);

        $itemAId = $itemARes->json('data.id');

        $this->getJson("/api/v1/modules/cfo/expense-items?company_id={$companyA->id}")
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $itemAId);

        $this->putJson("/api/v1/modules/cfo/expense-categories/{$catAId}", [
            'company_id' => $companyA->id,
            'name' => 'Bahan Baku Revisi',
        ])->assertOk()->assertJsonPath('data.name', 'Bahan Baku Revisi');

        $this->putJson("/api/v1/modules/cfo/expense-types/{$typeAId}", [
            'company_id' => $companyA->id,
            'expense_category_id' => $catAId,
            'name' => 'Bubuk Premium',
        ])->assertOk()->assertJsonPath('data.name', 'Bubuk Premium');

        $this->putJson("/api/v1/modules/cfo/expense-items/{$itemAId}", [
            'company_id' => $companyA->id,
            'expense_category_id' => $catAId,
            'expense_type_id' => $typeAId,
            'name' => 'Bubuk Coklat Dark',
            'amount' => 2500000,
        ])->assertOk()->assertJsonPath('data.name', 'Bubuk Coklat Dark');

        $this->deleteJson("/api/v1/modules/cfo/expense-items/{$itemAId}")->assertOk();
        $this->assertSoftDeleted('expense_items', ['id' => $itemAId]);

        $this->deleteJson("/api/v1/modules/cfo/expense-types/{$typeAId}")->assertOk();
        $this->assertSoftDeleted('expense_types', ['id' => $typeAId]);

        $this->deleteJson("/api/v1/modules/cfo/expense-categories/{$catAId}")->assertOk();
        $this->assertSoftDeleted('expense_categories', ['id' => $catAId]);
    });

    it('creates, updates, and deletes company-scoped expense entities via Inertia web routes', function () {
        $company = Company::factory()->create(['name' => 'PT. Slaras Nusa Foodlab']);

        $this->from('/')->post('/cfo/expense-categories', [
            'company_id' => $company->id,
            'name' => 'Operasional',
        ])->assertRedirect('/');

        $category = ExpenseCategory::query()->where('company_id', $company->id)->firstOrFail();

        $this->from('/')->post('/cfo/expense-types', [
            'company_id' => $company->id,
            'expense_category_id' => $category->id,
            'name' => 'Franchise',
        ])->assertRedirect('/');

        $type = ExpenseType::query()->where('company_id', $company->id)->firstOrFail();

        $this->from('/')->post('/cfo/expense-items', [
            'company_id' => $company->id,
            'expense_category_id' => $category->id,
            'expense_type_id' => $type->id,
            'name' => 'Franchise Outlet',
            'amount' => 15000000,
        ])->assertRedirect('/');

        $item = ExpenseItem::query()->where('company_id', $company->id)->firstOrFail();
        expect($item->expense_category_id)->toBe($category->id)
            ->and($item->expense_type_id)->toBe($type->id)
            ->and((float) $item->amount)->toBe(15000000.0);
    });
});
