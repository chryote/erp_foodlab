<?php

namespace App\Modules\HR\Controllers;

use App\Http\Controllers\Concerns\RespondsWithApiList;
use App\Http\Controllers\Controller;
use App\Http\Resources\EmployeeShiftAssignmentResource;
use App\Models\EmployeeShiftAssignment;
use App\Modules\HR\Requests\SaveEmployeeShiftAssignmentRequest;
use App\Modules\HR\Services\EmployeeShiftAssignmentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class EmployeeShiftAssignmentController extends Controller
{
    use RespondsWithApiList;

    public function __construct(
        protected EmployeeShiftAssignmentService $employeeShiftAssignmentService,
    ) {}

    public function index(Request $request): JsonResponse
    {
        return $this->respondWithList(
            EmployeeShiftAssignmentResource::class,
            $this->employeeShiftAssignmentService->list($request),
            ['cache_key' => EmployeeShiftAssignmentService::CACHE_KEY_LIST]
        );
    }

    public function store(SaveEmployeeShiftAssignmentRequest $request): JsonResponse
    {
        $assignment = $this->employeeShiftAssignmentService->createEmployeeShiftAssignment($request->payload());

        return (new EmployeeShiftAssignmentResource($assignment))
            ->response()
            ->setStatusCode(201);
    }

    public function show(EmployeeShiftAssignment $employeeShiftAssignment): JsonResponse
    {
        return (new EmployeeShiftAssignmentResource(
            $employeeShiftAssignment->load(['company', 'employee', 'employeeShift'])
        ))->response();
    }

    public function update(
        SaveEmployeeShiftAssignmentRequest $request,
        EmployeeShiftAssignment $employeeShiftAssignment
    ): JsonResponse {
        $updated = $this->employeeShiftAssignmentService->updateEmployeeShiftAssignment(
            $employeeShiftAssignment,
            $request->payload()
        );

        return (new EmployeeShiftAssignmentResource($updated))->response();
    }

    public function destroy(EmployeeShiftAssignment $employeeShiftAssignment): JsonResponse
    {
        $this->employeeShiftAssignmentService->deleteEmployeeShiftAssignment($employeeShiftAssignment);

        return response()->json([
            'message' => 'Employee shift assignment deleted successfully.',
        ]);
    }
}
