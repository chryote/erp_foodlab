<?php

namespace App\Modules\CHO\Controllers;

use App\Http\Controllers\Concerns\RespondsWithApiList;
use App\Http\Controllers\Controller;
use App\Http\Resources\PayrollGradeResource;
use App\Models\PayrollGrade;
use App\Modules\CHO\Requests\SavePayrollGradeRequest;
use App\Modules\CHO\Services\PayrollGradeService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PayrollGradeController extends Controller
{
    use RespondsWithApiList;

    public function __construct(
        protected PayrollGradeService $payrollGradeService,
    ) {}

    public function index(Request $request): JsonResponse
    {
        return $this->respondWithList(
            PayrollGradeResource::class,
            $this->payrollGradeService->list($request),
            ['cache_key' => PayrollGradeService::CACHE_KEY_LIST]
        );
    }

    public function store(SavePayrollGradeRequest $request): JsonResponse
    {
        $payrollGrade = $this->payrollGradeService->createPayrollGrade($request->payload());

        return (new PayrollGradeResource($payrollGrade))
            ->response()
            ->setStatusCode(201);
    }

    public function show(PayrollGrade $payrollGrade): JsonResponse
    {
        return (new PayrollGradeResource($payrollGrade->load('company')))->response();
    }

    public function update(SavePayrollGradeRequest $request, PayrollGrade $payrollGrade): JsonResponse
    {
        $updated = $this->payrollGradeService->updatePayrollGrade($payrollGrade, $request->payload());

        return (new PayrollGradeResource($updated))->response();
    }

    public function destroy(PayrollGrade $payrollGrade): JsonResponse
    {
        $this->payrollGradeService->deletePayrollGrade($payrollGrade);

        return response()->json([
            'message' => 'Payroll grade deleted successfully.',
        ]);
    }
}
