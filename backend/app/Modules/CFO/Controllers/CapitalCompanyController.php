<?php

namespace App\Modules\CFO\Controllers;

use App\Http\Controllers\Concerns\RespondsWithApiList;
use App\Http\Controllers\Controller;
use App\Http\Resources\CapitalCompanyResource;
use App\Models\CapitalCompany;
use App\Modules\CFO\Requests\SaveCapitalCompanyRequest;
use App\Modules\CFO\Services\CapitalCompanyService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CapitalCompanyController extends Controller
{
    use RespondsWithApiList;

    public function __construct(
        protected CapitalCompanyService $capitalCompanyService
    ) {}

    public function index(Request $request): JsonResponse
    {
        return $this->respondWithList(
            CapitalCompanyResource::class,
            $this->capitalCompanyService->list($request),
            [
                'total_capital' => $this->capitalCompanyService->totalCapital($request),
                'cache_key' => CapitalCompanyService::CACHE_KEY_LIST,
            ]
        );
    }

    public function store(SaveCapitalCompanyRequest $request): JsonResponse
    {
        $capitalCompany = $this->capitalCompanyService->createCapitalCompany($request->payload());

        return (new CapitalCompanyResource($capitalCompany))
            ->response()
            ->setStatusCode(201);
    }

    public function show(CapitalCompany $capitalCompany): JsonResponse
    {
        return (new CapitalCompanyResource($capitalCompany->load('company')))->response();
    }

    public function update(SaveCapitalCompanyRequest $request, CapitalCompany $capitalCompany): JsonResponse
    {
        $updated = $this->capitalCompanyService->updateCapitalCompany($capitalCompany, $request->payload());

        return (new CapitalCompanyResource($updated))->response();
    }

    public function destroy(CapitalCompany $capitalCompany): JsonResponse
    {
        $this->capitalCompanyService->deleteCapitalCompany($capitalCompany);

        return response()->json([
            'message' => 'Capital company deleted successfully.',
        ]);
    }
}
