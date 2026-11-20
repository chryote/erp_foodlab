<?php

namespace App\Modules\CFO\Controllers;

use App\Http\Controllers\Concerns\RespondsWithApiList;
use App\Http\Controllers\Controller;
use App\Http\Resources\CompanyResource;
use App\Models\Company;
use App\Modules\CFO\Requests\SaveCompanyRequest;
use App\Modules\CFO\Services\CompanyService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CompanyController extends Controller
{
    use RespondsWithApiList;

    public function __construct(
        protected CompanyService $companyService
    ) {}

    public function index(Request $request): JsonResponse
    {
        return $this->respondWithList(
            CompanyResource::class,
            $this->companyService->list($request),
            ['cache_key' => CompanyService::CACHE_KEY_LIST]
        );
    }

    public function store(SaveCompanyRequest $request): JsonResponse
    {
        $company = $this->companyService->createCompany($request->payload());

        return (new CompanyResource($company))
            ->response()
            ->setStatusCode(201);
    }

    public function show(Company $company): JsonResponse
    {
        return (new CompanyResource($company))->response();
    }

    public function update(SaveCompanyRequest $request, Company $company): JsonResponse
    {
        $updated = $this->companyService->updateCompany($company, $request->payload());

        return (new CompanyResource($updated))->response();
    }

    public function destroy(Company $company): JsonResponse
    {
        $this->companyService->deleteCompany($company);

        return response()->json([
            'message' => 'Company deleted successfully.',
        ]);
    }
}
