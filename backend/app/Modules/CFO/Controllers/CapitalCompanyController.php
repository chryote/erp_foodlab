<?php

namespace App\Modules\CFO\Controllers;

use App\Http\Controllers\Controller;
use App\Models\CapitalCompany;
use App\Modules\CFO\Services\CapitalCompanyService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class CapitalCompanyController extends Controller
{
    public function __construct(
        protected CapitalCompanyService $capitalCompanyService
    ) {}

    public function index(Request $request): JsonResponse
    {
        $search = $request->query('search');
        $perPage = $request->query('per_page');
        $page = $request->query('page');

        if ($search !== null || $perPage !== null || $page !== null) {
            $paginator = $this->capitalCompanyService->paginateCapitalCompanies(
                is_string($search) ? $search : null,
                max(1, (int) ($perPage ?? 10)),
                max(1, (int) ($page ?? 1))
            );
            $totalCapital = $this->capitalCompanyService->getTotalCapital();

            return response()->json([
                'data' => $paginator->items(),
                'meta' => [
                    'count' => count($paginator->items()),
                    'total' => $paginator->total(),
                    'total_capital' => $totalCapital,
                    'page' => $paginator->currentPage(),
                    'per_page' => $paginator->perPage(),
                    'last_page' => $paginator->lastPage(),
                    'cache_key' => CapitalCompanyService::CACHE_KEY_LIST,
                ],
            ]);
        }

        $capitalCompanies = $this->capitalCompanyService->listCapitalCompanies();
        $totalCapital = (float) $capitalCompanies->sum('capital');

        return response()->json([
            'data' => $capitalCompanies,
            'meta' => [
                'count' => $capitalCompanies->count(),
                'total' => $capitalCompanies->count(),
                'total_capital' => $totalCapital,
                'page' => 1,
                'per_page' => max(1, $capitalCompanies->count()),
                'last_page' => 1,
                'cache_key' => CapitalCompanyService::CACHE_KEY_LIST,
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'company_id' => [
                'required',
                'integer',
                Rule::exists('companies', 'id')->whereNull('deleted_at'),
            ],
            'capital' => ['required', 'numeric', 'min:0'],
        ]);

        $validated['capital'] = (float) $validated['capital'];

        $capitalCompany = $this->capitalCompanyService->createCapitalCompany($validated);

        return response()->json([
            'data' => $capitalCompany,
        ], 201);
    }

    public function show(CapitalCompany $capitalCompany): JsonResponse
    {
        return response()->json([
            'data' => $capitalCompany->load('company'),
        ]);
    }

    public function update(Request $request, CapitalCompany $capitalCompany): JsonResponse
    {
        $validated = $request->validate([
            'company_id' => [
                'required',
                'integer',
                Rule::exists('companies', 'id')->whereNull('deleted_at'),
            ],
            'capital' => ['required', 'numeric', 'min:0'],
        ]);

        $validated['capital'] = (float) $validated['capital'];

        $updated = $this->capitalCompanyService->updateCapitalCompany($capitalCompany, $validated);

        return response()->json([
            'data' => $updated,
        ]);
    }

    public function destroy(CapitalCompany $capitalCompany): JsonResponse
    {
        $this->capitalCompanyService->deleteCapitalCompany($capitalCompany);

        return response()->json([
            'message' => 'Capital company deleted successfully.',
        ]);
    }
}
