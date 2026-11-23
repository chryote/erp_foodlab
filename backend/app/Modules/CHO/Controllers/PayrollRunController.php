<?php

namespace App\Modules\CHO\Controllers;

use App\Http\Controllers\Concerns\RespondsWithApiList;
use App\Http\Controllers\Controller;
use App\Http\Resources\PayrollRunResource;
use App\Models\PayrollRun;
use App\Modules\CHO\Requests\SavePayrollRunRequest;
use App\Modules\CHO\Services\PayrollRunService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PayrollRunController extends Controller
{
    use RespondsWithApiList;

    public function __construct(
        protected PayrollRunService $payrollRunService,
    ) {}

    public function index(Request $request): JsonResponse
    {
        return $this->respondWithList(
            PayrollRunResource::class,
            $this->payrollRunService->list($request),
            ['cache_key' => PayrollRunService::CACHE_KEY_LIST]
        );
    }

    public function store(SavePayrollRunRequest $request): JsonResponse
    {
        $payrollRun = $this->payrollRunService->createPayrollRun($request->payload());

        return (new PayrollRunResource($payrollRun))
            ->response()
            ->setStatusCode(201);
    }

    public function show(PayrollRun $payrollRun): JsonResponse
    {
        return (new PayrollRunResource(
            $payrollRun->load(['company', 'approver'])
        ))->response();
    }

    public function update(SavePayrollRunRequest $request, PayrollRun $payrollRun): JsonResponse
    {
        $updated = $this->payrollRunService->updatePayrollRun($payrollRun, $request->payload());

        return (new PayrollRunResource($updated))->response();
    }

    public function destroy(PayrollRun $payrollRun): JsonResponse
    {
        $this->payrollRunService->deletePayrollRun($payrollRun);

        return response()->json([
            'message' => 'Payroll run deleted successfully.',
        ]);
    }
}
