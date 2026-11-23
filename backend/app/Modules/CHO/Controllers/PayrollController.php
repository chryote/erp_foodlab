<?php

namespace App\Modules\CHO\Controllers;

use App\Http\Controllers\Controller;
use App\Http\Resources\CompanyResource;
use App\Http\Resources\EmployeeResource;
use App\Http\Resources\PayrollItemResource;
use App\Http\Resources\PayrollRunResource;
use App\Modules\CHO\Requests\PayrollWorkspaceRequest;
use App\Modules\CHO\Requests\SaveEmployeePayrollRequest;
use App\Modules\CHO\Services\PayrollService;
use Illuminate\Http\JsonResponse;

class PayrollController extends Controller
{
    public function __construct(
        protected PayrollService $payrollService,
    ) {}

    public function workspace(PayrollWorkspaceRequest $request): JsonResponse
    {
        $payload = $request->payload();
        $workspace = $this->payrollService->workspace($payload['company_id'], $payload['period']);

        $rows = array_map(static function (array $row): array {
            $row['employee'] = new EmployeeResource($row['employee']);

            return $row;
        }, $workspace['rows']);

        return response()->json([
            'data' => [
                'period' => $workspace['period'],
                'period_date' => $workspace['period_date'],
                'cutoff_start_date' => $workspace['cutoff_start_date'],
                'cutoff_end_date' => $workspace['cutoff_end_date'],
                'cutoff_day' => $workspace['cutoff_day'],
                'period_start_day' => $workspace['period_start_day'],
                'effective_work_days' => $workspace['effective_work_days'],
                'company' => $workspace['company'] !== null
                    ? new CompanyResource($workspace['company'])
                    : null,
                'payroll_run' => $workspace['payroll_run'] !== null
                    ? new PayrollRunResource($workspace['payroll_run'])
                    : null,
                'rows' => $rows,
            ],
        ]);
    }

    public function saveRow(SaveEmployeePayrollRequest $request): JsonResponse
    {
        $item = $this->payrollService->saveEmployeePayroll($request->payload(), finalize: false);

        return (new PayrollItemResource($item))->response();
    }

    public function finalizeRow(SaveEmployeePayrollRequest $request): JsonResponse
    {
        $item = $this->payrollService->saveEmployeePayroll($request->payload(), finalize: true);

        return (new PayrollItemResource($item))->response();
    }
}
