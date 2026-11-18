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

    public function index(Request $request): JsonResponse
    {
        $search = $request->query('search');
        $perPage = $request->query('per_page');
        $page = $request->query('page');

        if ($search !== null || $perPage !== null || $page !== null) {
            $paginator = $this->companyService->paginateCompanies(
                is_string($search) ? $search : null,
                max(1, (int) ($perPage ?? 10)),
                max(1, (int) ($page ?? 1))
            );

            return response()->json([
                'data' => $paginator->items(),
                'meta' => [
                    'count' => count($paginator->items()),
                    'total' => $paginator->total(),
                    'page' => $paginator->currentPage(),
                    'per_page' => $paginator->perPage(),
                    'last_page' => $paginator->lastPage(),
                    'cache_key' => CompanyService::CACHE_KEY_LIST,
                ],
            ]);
        }

        $companies = $this->companyService->listCompanies();

        return response()->json([
            'data' => $companies,
            'meta' => [
                'count' => $companies->count(),
                'total' => $companies->count(),
                'page' => 1,
                'per_page' => max(1, $companies->count()),
                'last_page' => 1,
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
