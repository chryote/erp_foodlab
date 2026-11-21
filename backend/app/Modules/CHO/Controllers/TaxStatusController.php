<?php

namespace App\Modules\CHO\Controllers;

use App\Http\Controllers\Concerns\RespondsWithApiList;
use App\Http\Controllers\Controller;
use App\Http\Resources\TaxStatusResource;
use App\Models\TaxStatus;
use App\Modules\CHO\Requests\SaveTaxStatusRequest;
use App\Modules\CHO\Services\TaxStatusService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TaxStatusController extends Controller
{
    use RespondsWithApiList;

    public function __construct(
        protected TaxStatusService $taxStatusService,
    ) {}

    public function index(Request $request): JsonResponse
    {
        return $this->respondWithList(
            TaxStatusResource::class,
            $this->taxStatusService->list($request),
            ['cache_key' => TaxStatusService::CACHE_KEY_LIST]
        );
    }

    public function store(SaveTaxStatusRequest $request): JsonResponse
    {
        $taxStatus = $this->taxStatusService->createTaxStatus($request->payload());

        return (new TaxStatusResource($taxStatus))
            ->response()
            ->setStatusCode(201);
    }

    public function show(TaxStatus $taxStatus): JsonResponse
    {
        return (new TaxStatusResource($taxStatus->load('company')))->response();
    }

    public function update(SaveTaxStatusRequest $request, TaxStatus $taxStatus): JsonResponse
    {
        $updated = $this->taxStatusService->updateTaxStatus($taxStatus, $request->payload());

        return (new TaxStatusResource($updated))->response();
    }

    public function destroy(TaxStatus $taxStatus): JsonResponse
    {
        $this->taxStatusService->deleteTaxStatus($taxStatus);

        return response()->json([
            'message' => 'Tax status deleted successfully.',
        ]);
    }
}
