<?php

namespace App\Http\Controllers;

use App\Models\CapitalCompany;
use App\Models\Company;
use App\Models\ExpenseCategory;
use App\Models\ExpenseItem;
use App\Models\ExpenseType;
use App\Modules\CDO\Services\CdoService;
use App\Modules\CFO\Services\CapitalCompanyService;
use App\Modules\CFO\Services\CfoService;
use App\Modules\CFO\Services\CompanyService;
use App\Modules\CFO\Services\ExpenseCategoryService;
use App\Modules\CFO\Services\ExpenseItemService;
use App\Modules\CFO\Services\ExpenseTypeService;
use App\Modules\CHO\Services\ChoService;
use App\Modules\CMO\Services\CmoService;
use App\Modules\CPO\Services\CpoService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class ErpInertiaController extends Controller
{
    public function __construct(
        protected CompanyService $companyService,
        protected CapitalCompanyService $capitalCompanyService,
        protected ExpenseCategoryService $expenseCategoryService,
        protected ExpenseTypeService $expenseTypeService,
        protected ExpenseItemService $expenseItemService,
    ) {}

    public function index(
        CfoService $cfoService,
        ChoService $choService,
        CpoService $cpoService,
        CdoService $cdoService,
        CmoService $cmoService,
    ): Response {
        return Inertia::render('Dashboard', [
            'modules' => [
                $cfoService->getOverview(),
                $choService->getOverview(),
                $cpoService->getOverview(),
                $cdoService->getOverview(),
                $cmoService->getOverview(),
            ],
            'companies' => $this->companyService->listCompanies(),
            'capitalCompanies' => $this->capitalCompanyService->listCapitalCompanies(),
            'expenseCategories' => $this->expenseCategoryService->listExpenseCategories(),
            'expenseTypes' => $this->expenseTypeService->listExpenseTypes(),
            'expenseItems' => $this->expenseItemService->listExpenseItems()
        ]);
    }

    public function storeExpenseCategory(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:150'],
        ]);

        $this->expenseCategoryService->createExpenseCategory($validated);

        return back()->with('success', 'Master kategori berhasil ditambahkan.');
    }

    public function updateExpenseCategory(Request $request, ExpenseCategory $expenseCategory): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:150'],
        ]);

        $this->expenseCategoryService->updateExpenseCategory($expenseCategory, $validated);

        return back()->with('success', 'Master kategori berhasil diperbarui.');
    }

    public function destroyExpenseCategory(ExpenseCategory $expenseCategory): RedirectResponse
    {
        $this->expenseCategoryService->deleteExpenseCategory($expenseCategory);

        return back()->with('success', 'Master kategori berhasil dihapus.');
    }

    public function storeExpenseType(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:150'],
        ]);

        $this->expenseTypeService->createExpenseType($validated);

        return back()->with('success', 'Master tipe berhasil ditambahkan.');
    }

    public function updateExpenseType(Request $request, ExpenseType $expenseType): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:150'],
        ]);

        $this->expenseTypeService->updateExpenseType($expenseType, $validated);

        return back()->with('success', 'Master tipe berhasil diperbarui.');
    }

    public function destroyExpenseType(ExpenseType $expenseType): RedirectResponse
    {
        $this->expenseTypeService->deleteExpenseType($expenseType);

        return back()->with('success', 'Master tipe berhasil dihapus.');
    }

    public function storeExpenseItem(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:150'],
        ]);

        $this->expenseItemService->createExpenseItem($validated);

        return back()->with('success', 'Master item berhasil ditambahkan.');
    }

    public function updateExpenseItem(Request $request, ExpenseItem $expenseItem): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:150'],
        ]);

        $this->expenseItemService->updateExpenseItem($expenseItem, $validated);

        return back()->with('success', 'Master item berhasil diperbarui.');
    }

    public function destroyExpenseItem(ExpenseItem $expenseItem): RedirectResponse
    {
        $this->expenseItemService->deleteExpenseItem($expenseItem);

        return back()->with('success', 'Master item berhasil dihapus.');
    }

    public function storeCompany(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:150'],
            'series' => ['sometimes', 'required', 'integer', 'min:1'],
        ]);

        $this->companyService->createCompany($validated);

        return back()->with('success', 'Perusahaan berhasil ditambahkan.');
    }

    public function updateCompany(Request $request, Company $company): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:150'],
            'series' => ['sometimes', 'required', 'integer', 'min:1'],
        ]);

        $this->companyService->updateCompany($company, $validated);

        return back()->with('success', 'Perusahaan berhasil diperbarui.');
    }

    public function destroyCompany(Company $company): RedirectResponse
    {
        $this->companyService->deleteCompany($company);

        return back()->with('success', 'Perusahaan berhasil dihapus.');
    }

    public function storeCapitalCompany(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'company_id' => [
                'required',
                'integer',
                Rule::exists('companies', 'id')->whereNull('deleted_at'),
            ],
            'stakeholder_name' => ['required', 'string', 'max:150'],
            'capital' => ['required', 'numeric', 'min:0'],
        ]);

        $validated['capital'] = (float) $validated['capital'];

        $this->capitalCompanyService->createCapitalCompany($validated);

        return back()->with('success', 'Pemegang saham berhasil ditambahkan.');
    }

    public function updateCapitalCompany(
        Request $request,
        CapitalCompany $capitalCompany
    ): RedirectResponse {
        $validated = $request->validate([
            'company_id' => [
                'required',
                'integer',
                Rule::exists('companies', 'id')->whereNull('deleted_at'),
            ],
            'stakeholder_name' => ['required', 'string', 'max:150'],
            'capital' => ['required', 'numeric', 'min:0'],
        ]);

        $validated['capital'] = (float) $validated['capital'];

        $this->capitalCompanyService->updateCapitalCompany($capitalCompany, $validated);

        return back()->with('success', 'Pemegang saham berhasil diperbarui.');
    }

    public function destroyCapitalCompany(CapitalCompany $capitalCompany): RedirectResponse
    {
        $this->capitalCompanyService->deleteCapitalCompany($capitalCompany);

        return back()->with('success', 'Pemegang saham berhasil dihapus.');
    }
}
