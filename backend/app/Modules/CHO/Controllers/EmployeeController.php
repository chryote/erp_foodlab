<?php

namespace App\Modules\CHO\Controllers;

use App\Http\Controllers\Concerns\RespondsWithApiList;
use App\Http\Controllers\Controller;
use App\Http\Resources\EmployeeResource;
use App\Models\Employee;
use App\Modules\CHO\Requests\SaveEmployeeRequest;
use App\Modules\CHO\Services\EmployeeService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class EmployeeController extends Controller
{
    use RespondsWithApiList;

    public function __construct(
        protected EmployeeService $employeeService,
    ) {}

    public function index(Request $request): JsonResponse
    {
        return $this->respondWithList(
            EmployeeResource::class,
            $this->employeeService->list($request),
            ['cache_key' => EmployeeService::CACHE_KEY_LIST]
        );
    }

    public function store(SaveEmployeeRequest $request): JsonResponse
    {
        $employee = $this->employeeService->createEmployee($request->payload());

        return (new EmployeeResource($employee))
            ->response()
            ->setStatusCode(201);
    }

    public function show(Employee $employee): JsonResponse
    {
        return (new EmployeeResource(
            $employee->load([
                'company',
                'employeePosition',
                'employmentStatus',
                'payrollGrade',
                'taxStatus',
                'documents',
            ])
        ))->response();
    }

    public function update(SaveEmployeeRequest $request, Employee $employee): JsonResponse
    {
        $updated = $this->employeeService->updateEmployee($employee, $request->payload());

        return (new EmployeeResource($updated))->response();
    }

    public function destroy(Employee $employee): JsonResponse
    {
        $this->employeeService->deleteEmployee($employee);

        return response()->json([
            'message' => 'Employee deleted successfully.',
        ]);
    }
}
