<?php

namespace App\Modules\CHO\Controllers;

use App\Http\Controllers\Concerns\RespondsWithApiList;
use App\Http\Controllers\Controller;
use App\Http\Resources\PayrollItemResource;
use App\Models\PayrollItem;
use App\Modules\CHO\Requests\SavePayrollItemRequest;
use App\Modules\CHO\Services\PayrollItemService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PayrollItemController extends Controller
{
    use RespondsWithApiList;

    public function __construct(
        protected PayrollItemService $payrollItemService,
    ) {}

    public function index(Request $request): JsonResponse
    {
        return $this->respondWithList(
            PayrollItemResource::class,
            $this->payrollItemService->list($request),
            ['cache_key' => PayrollItemService::CACHE_KEY_LIST]
        );
    }

    public function store(SavePayrollItemRequest $request): JsonResponse
    {
        $payrollItem = $this->payrollItemService->createPayrollItem($request->payload());

        return (new PayrollItemResource($payrollItem))
            ->response()
            ->setStatusCode(201);
    }

    public function show(PayrollItem $payrollItem): JsonResponse
    {
        return (new PayrollItemResource(
            $payrollItem->load(['company', 'payrollRun', 'employee', 'employeePosition'])
        ))->response();
    }

    public function update(SavePayrollItemRequest $request, PayrollItem $payrollItem): JsonResponse
    {
        $updated = $this->payrollItemService->updatePayrollItem($payrollItem, $request->payload());

        return (new PayrollItemResource($updated))->response();
    }

    public function destroy(PayrollItem $payrollItem): JsonResponse
    {
        $this->payrollItemService->deletePayrollItem($payrollItem);

        return response()->json([
            'message' => 'Payroll item deleted successfully.',
        ]);
    }
}
