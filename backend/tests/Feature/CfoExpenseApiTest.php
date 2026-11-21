<?php

use App\Models\Company;
use App\Models\Employee;
use App\Models\ExpenseCategory;
use App\Models\ExpenseItem;
use App\Models\ExpenseType;
use Illuminate\Support\Facades\Cache;

describe('CFO Expense Category, Type, and Item CRUD scoped by company_id', function () {
    beforeEach(function () {
        Cache::flush();
        actingAsErpUser();
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
            'purchased_on' => '2026-11-19',
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['expense_type_id']);

        $itemARes = $this->postJson('/api/v1/modules/cfo/expense-items', [
            'company_id' => $companyA->id,
            'expense_category_id' => $catAId,
            'expense_type_id' => $typeAId,
            'name' => 'Bubuk Coklat',
            'amount' => 2000000,
            'purchased_on' => '2026-11-19',
            'closing_date' => '2026-11-30',
            'employee_id' => null,
            'detail' => 'Stok awal bulan',
        ]);
        $itemARes->assertCreated()
            ->assertJsonPath('data.company_id', $companyA->id)
            ->assertJsonPath('data.expense_category_id', $catAId)
            ->assertJsonPath('data.expense_type_id', $typeAId)
            ->assertJsonPath('data.purchased_on', '2026-11-19')
            ->assertJsonPath('data.closing_date', '2026-11-30')
            ->assertJsonPath('data.employee_id', null)
            ->assertJsonPath('data.detail', 'Stok awal bulan');

        $itemAId = $itemARes->json('data.id');

        $this->getJson("/api/v1/modules/cfo/expense-items?company_id={$companyA->id}")
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $itemAId);

        $this->getJson("/api/v1/modules/cfo/expense-categories/{$catAId}")
            ->assertOk()
            ->assertJsonPath('data.id', $catAId);

        $this->getJson("/api/v1/modules/cfo/expense-types/{$typeAId}")
            ->assertOk()
            ->assertJsonPath('data.id', $typeAId);

        $this->getJson("/api/v1/modules/cfo/expense-items/{$itemAId}")
            ->assertOk()
            ->assertJsonPath('data.id', $itemAId);

        $this->putJson("/api/v1/modules/cfo/expense-categories/{$catAId}", [
            'company_id' => $companyA->id,
            'name' => 'Bahan Baku Revisi',
        ])->assertOk()->assertJsonPath('data.name', 'Bahan Baku Revisi');

        $this->putJson("/api/v1/modules/cfo/expense-types/{$typeAId}", [
            'company_id' => $companyA->id,
            'expense_category_id' => $catAId,
            'name' => 'Bubuk Premium',
        ])->assertOk()->assertJsonPath('data.name', 'Bubuk Premium');

        $employeeA = Employee::factory()->create(['company_id' => $companyA->id]);
        $employeeB = Employee::factory()->create(['company_id' => $companyB->id]);

        $this->putJson("/api/v1/modules/cfo/expense-items/{$itemAId}", [
            'company_id' => $companyA->id,
            'expense_category_id' => $catAId,
            'expense_type_id' => $typeAId,
            'name' => 'Bubuk Coklat Dark',
            'amount' => 2500000,
            'purchased_on' => '2026-11-20',
            'closing_date' => null,
            'employee_id' => $employeeB->id,
            'detail' => 'Cross-company employee rejected',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['employee_id']);

        $this->putJson("/api/v1/modules/cfo/expense-items/{$itemAId}", [
            'company_id' => $companyA->id,
            'expense_category_id' => $catAId,
            'expense_type_id' => $typeAId,
            'name' => 'Bubuk Coklat Dark',
            'amount' => 2500000,
            'purchased_on' => '2026-11-20',
            'closing_date' => null,
            'employee_id' => $employeeA->id,
            'detail' => 'Revisi pembelian',
        ])->assertOk()
            ->assertJsonPath('data.name', 'Bubuk Coklat Dark')
            ->assertJsonPath('data.purchased_on', '2026-11-20')
            ->assertJsonPath('data.employee_id', $employeeA->id)
            ->assertJsonPath('data.detail', 'Revisi pembelian');

        $this->deleteJson("/api/v1/modules/cfo/expense-items/{$itemAId}")->assertOk();
        $this->assertSoftDeleted('expense_items', ['id' => $itemAId]);

        $this->deleteJson("/api/v1/modules/cfo/expense-types/{$typeAId}")->assertOk();
        $this->assertSoftDeleted('expense_types', ['id' => $typeAId]);

        $this->deleteJson("/api/v1/modules/cfo/expense-categories/{$catAId}")->assertOk();
        $this->assertSoftDeleted('expense_categories', ['id' => $catAId]);
    });

    it('supports QueryBuilder sorting and includes for expense types', function () {
        $company = Company::factory()->create();
        $category = ExpenseCategory::factory()->create([
            'company_id' => $company->id,
            'name' => 'Reagen',
        ]);
        ExpenseType::factory()->create([
            'company_id' => $company->id,
            'expense_category_id' => $category->id,
            'name' => 'Zeta',
        ]);
        ExpenseType::factory()->create([
            'company_id' => $company->id,
            'expense_category_id' => $category->id,
            'name' => 'Alpha',
        ]);

        $this->getJson('/api/v1/modules/cfo/expense-types?sort=name&include=expenseCategory,company')
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.name', 'Alpha')
            ->assertJsonPath('data.0.expense_category.name', 'Reagen')
            ->assertJsonPath('data.0.company.id', $company->id);
    });

    it('refuses to soft-delete a category or type that is still referenced by items', function () {
        $company = Company::factory()->create();
        $category = ExpenseCategory::factory()->create(['company_id' => $company->id]);
        $type = ExpenseType::factory()->create([
            'company_id' => $company->id,
            'expense_category_id' => $category->id,
        ]);
        ExpenseItem::factory()->create([
            'company_id' => $company->id,
            'expense_category_id' => $category->id,
            'expense_type_id' => $type->id,
        ]);

        $this->deleteJson("/api/v1/modules/cfo/expense-types/{$type->id}")
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['expense_type']);

        $this->deleteJson("/api/v1/modules/cfo/expense-categories/{$category->id}")
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['expense_category']);

        $this->assertNotSoftDeleted('expense_types', ['id' => $type->id]);
        $this->assertNotSoftDeleted('expense_categories', ['id' => $category->id]);
    });
});
