<?php

use App\Models\Company;
use App\Models\Employee;
use App\Models\EmployeePosition;
use App\Models\EmploymentStatus;
use App\Models\ExpenseCategory;
use App\Models\ExpenseItem;
use App\Models\ExpenseType;
use App\Models\Item;
use App\Models\LabSample;
use App\Models\Packet;
use App\Models\PayrollGrade;
use App\Models\TaxStatus;
use App\Support\ActiveCompany;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;

uses(RefreshDatabase::class);

describe('Scout Search Integration Preserving ERP API Patterns', function () {
    beforeEach(function () {
        Cache::flush();
        ActiveCompany::clear();
        actingAsErpUser();
        config(['scout.driver' => 'collection']);
    });

    it('searches ExpenseItem by own and denormalized category/type fields while respecting active_company, pagination, and soft deletes', function () {
        $companyA = Company::factory()->create(['name' => 'Alpha Food', 'series' => 1]);
        $companyB = Company::factory()->create(['name' => 'Beta Food', 'series' => 1]);

        $catA = ExpenseCategory::factory()->create(['company_id' => $companyA->id, 'name' => 'Bahan Baku Khusus']);
        $typeA = ExpenseType::factory()->create([
            'company_id' => $companyA->id,
            'expense_category_id' => $catA->id,
            'name' => 'Kemasan Steril',
        ]);

        $catB = ExpenseCategory::factory()->create(['company_id' => $companyB->id, 'name' => 'Bahan Baku Khusus']);
        $typeB = ExpenseType::factory()->create([
            'company_id' => $companyB->id,
            'expense_category_id' => $catB->id,
            'name' => 'Kemasan Steril',
        ]);

        $itemA1 = ExpenseItem::factory()->create([
            'company_id' => $companyA->id,
            'expense_category_id' => $catA->id,
            'expense_type_id' => $typeA->id,
            'name' => 'Botol Kaca 250ml',
            'detail' => 'Diskon 100% batch awal',
        ]);

        $itemA2 = ExpenseItem::factory()->create([
            'company_id' => $companyA->id,
            'expense_category_id' => $catA->id,
            'expense_type_id' => $typeA->id,
            'name' => 'Tutup Segel',
            'detail' => 'Stok gudang utama',
        ]);

        ExpenseItem::factory()->create([
            'company_id' => $companyB->id,
            'expense_category_id' => $catB->id,
            'expense_type_id' => $typeB->id,
            'name' => 'Botol Kaca 500ml',
            'detail' => 'Cabang lain',
        ]);

        // Soft-deleted record must never appear in search results
        $deletedItem = ExpenseItem::factory()->create([
            'company_id' => $companyA->id,
            'expense_category_id' => $catA->id,
            'expense_type_id' => $typeA->id,
            'name' => 'Botol Kaca Terhapus',
        ]);
        $deletedItem->delete();

        // Standard ?search= with ?active_company=1 + pagination + sort
        $this->getJson('/api/v1/modules/cfo/expense-items?active_company=1&search=Botol&per_page=5&sort=id', [
            'X-Active-Company-Id' => (string) $companyA->id,
        ])
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $itemA1->id)
            ->assertJsonPath('meta.per_page', 5);

        // Denormalized parent relation search (?filter[search]=)
        $this->getJson('/api/v1/modules/cfo/expense-items?active_company=1&filter[search]=Kemasan', [
            'X-Active-Company-Id' => (string) $companyA->id,
        ])
            ->assertOk()
            ->assertJsonCount(2, 'data');

        // SQL wildcard fallback preserves literal '%' matching
        $this->getJson('/api/v1/modules/cfo/expense-items?active_company=1&filter[search]='.urlencode('100%'), [
            'X-Active-Company-Id' => (string) $companyA->id,
        ])
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $itemA1->id);

        // Whitespace-only search leaves results unfiltered (active items for companyA = 2)
        $this->getJson('/api/v1/modules/cfo/expense-items?active_company=1&filter[search]=%20%20%20', [
            'X-Active-Company-Id' => (string) $companyA->id,
        ])
            ->assertOk()
            ->assertJsonCount(2, 'data');

        // Updating parent ExpenseCategory re-indexes child ExpenseItems transparently
        $this->patchJson("/api/v1/modules/cfo/expense-categories/{$catA->id}", [
            'name' => 'Operasional Lab Baru',
        ])->assertOk();

        $this->getJson('/api/v1/modules/cfo/expense-items?active_company=1&filter[search]=Operasional', [
            'X-Active-Company-Id' => (string) $companyA->id,
        ])
            ->assertOk()
            ->assertJsonCount(2, 'data');

        expect($itemA2->fresh())->not->toBeNull();
    });

    it('searches Item, Packet, Employee, and LabSample via Scout without breaking response format', function () {
        $company = Company::factory()->create(['name' => 'FoodLab Core', 'series' => 1]);

        $item = Item::factory()->create([
            'company_id' => $company->id,
            'code' => 'RM-990',
            'name' => 'Tepung Tapioka Premium',
        ]);
        Item::factory()->create([
            'company_id' => $company->id,
            'code' => 'RM-991',
            'name' => 'Gula Pasir',
        ]);

        $this->getJson('/api/v1/modules/cpo/items?search=Tapioka&per_page=10')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $item->id);

        $packet = Packet::factory()->create(['name' => 'Paket Hemat Lab A']);
        Packet::factory()->create(['name' => 'Paket Standar B']);

        $this->getJson('/api/v1/modules/cpo/packets?filter[search]=Hemat')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $packet->id);

        $position = EmployeePosition::factory()->create(['name' => 'Analis']);
        $status = EmploymentStatus::factory()->create(['name' => 'Tetap']);
        $grade = PayrollGrade::factory()->create();
        $tax = TaxStatus::factory()->create(['name' => 'TK/0']);

        $employee = Employee::factory()->create([
            'company_id' => $company->id,
            'employee_position_id' => $position->id,
            'employment_status_id' => $status->id,
            'payroll_grade_id' => $grade->id,
            'tax_status_id' => $tax->id,
            'name' => 'Budi Santoso',
            'nickname' => 'Budi',
            'email' => 'budi.santoso@foodlab.test',
        ]);

        $this->getJson('/api/v1/modules/cho/employees?search=Santoso')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $employee->id);

        $sample = LabSample::factory()->create([
            'batch_code' => 'BATCH-LAB-777',
            'product_name' => 'Saus Sambal Pedas',
        ]);
        LabSample::factory()->create([
            'batch_code' => 'BATCH-LAB-888',
            'product_name' => 'Kecap Manis',
        ]);

        $this->getJson('/api/v1/samples?search=Sambal')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $sample->id);
    });
});
