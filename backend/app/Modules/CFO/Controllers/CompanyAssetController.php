<?php

namespace App\Modules\CFO\Controllers;

use App\Http\Controllers\Concerns\RespondsWithApiList;
use App\Http\Controllers\Controller;
use App\Http\Resources\CompanyAssetResource;
use App\Models\CompanyAsset;
use App\Modules\CFO\Requests\SaveCompanyAssetRequest;
use App\Modules\CFO\Services\CompanyAssetService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CompanyAssetController extends Controller
{
    use RespondsWithApiList;

    public function __construct(
        protected CompanyAssetService $companyAssetService,
    ) {}

    public function index(Request $request): JsonResponse
    {
        return $this->respondWithList(
            CompanyAssetResource::class,
            $this->companyAssetService->list($request),
            ['cache_key' => CompanyAssetService::CACHE_KEY_LIST]
        );
    }

    public function store(SaveCompanyAssetRequest $request): JsonResponse
    {
        $companyAsset = $this->companyAssetService->createCompanyAsset($request->payload());

        return (new CompanyAssetResource($companyAsset))
            ->response()
            ->setStatusCode(201);
    }

    public function show(CompanyAsset $companyAsset): JsonResponse
    {
        return (new CompanyAssetResource($companyAsset->load('company')))->response();
    }

    public function update(SaveCompanyAssetRequest $request, CompanyAsset $companyAsset): JsonResponse
    {
        $updated = $this->companyAssetService->updateCompanyAsset($companyAsset, $request->payload());

        return (new CompanyAssetResource($updated))->response();
    }

    public function destroy(CompanyAsset $companyAsset): JsonResponse
    {
        $this->companyAssetService->deleteCompanyAsset($companyAsset);

        return response()->json([
            'message' => 'Company asset deleted successfully.',
        ]);
    }
}
