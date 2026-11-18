<?php

namespace App\Http\Controllers;

use App\Models\CapitalCompany;
use App\Models\Company;
use App\Modules\CDO\Services\CdoService;
use App\Modules\CFO\Services\CapitalCompanyService;
use App\Modules\CFO\Services\CfoService;
use App\Modules\CFO\Services\CompanyService;
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
        ]);
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
