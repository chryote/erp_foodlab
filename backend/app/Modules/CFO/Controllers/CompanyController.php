<?php

namespace App\Modules\CFO\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Company;
use App\Modules\CFO\Services\CompanyService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CompanyController extends Controller
{
    public function __construct(
        protected CompanyService $companyService
    ) {}

    public function index(): JsonResponse
    {
        $companies = $this->companyService->listCompanies();

        return response()->json([
            'data' => $companies,
            'meta' => [
                'count' => $companies->count(),
                'cache_key' => CompanyService::CACHE_KEY_LIST,
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:150'],
        ]);

        $company = $this->companyService->createCompany($validated);

        return response()->json([
            'data' => $company,
        ], 201);
    }

    public function show(Company $company): JsonResponse
    {
        return response()->json([
            'data' => $company,
        ]);
    }

    public function update(Request $request, Company $company): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:150'],
        ]);

        $updated = $this->companyService->updateCompany($company, $validated);

        return response()->json([
            'data' => $updated,
        ]);
    }

    public function destroy(Company $company): JsonResponse
    {
        $this->companyService->deleteCompany($company);

        return response()->json([
            'message' => 'Company deleted successfully.',
        ]);
    }
}
