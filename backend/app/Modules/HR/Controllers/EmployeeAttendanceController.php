<?php

namespace App\Modules\HR\Controllers;

use App\Http\Controllers\Concerns\RespondsWithApiList;
use App\Http\Controllers\Controller;
use App\Http\Resources\EmployeeAttendanceResource;
use App\Models\EmployeeAttendance;
use App\Modules\HR\Requests\SaveEmployeeAttendanceRequest;
use App\Modules\HR\Requests\ScanEmployeeAttendanceRequest;
use App\Modules\HR\Services\EmployeeAttendanceService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class EmployeeAttendanceController extends Controller
{
    use RespondsWithApiList;

    public function __construct(
        protected EmployeeAttendanceService $employeeAttendanceService,
    ) {}

    public function index(Request $request): JsonResponse
    {
        return $this->respondWithList(
            EmployeeAttendanceResource::class,
            $this->employeeAttendanceService->list($request),
            ['cache_key' => EmployeeAttendanceService::CACHE_KEY_LIST]
        );
    }

    public function store(SaveEmployeeAttendanceRequest $request): JsonResponse
    {
        $employeeAttendance = $this->employeeAttendanceService->createEmployeeAttendance($request->payload());

        return (new EmployeeAttendanceResource($employeeAttendance))
            ->response()
            ->setStatusCode(201);
    }

    public function scan(ScanEmployeeAttendanceRequest $request): JsonResponse
    {
        $employeeAttendance = $this->employeeAttendanceService->scanEmployeeAttendance($request->payload());
        $isClockIn = $employeeAttendance->clock_out_at === null;
        $statusCode = $employeeAttendance->wasRecentlyCreated ? 201 : 200;

        return (new EmployeeAttendanceResource($employeeAttendance))
            ->additional([
                'meta' => [
                    'action' => $isClockIn ? 'clock_in' : 'clock_out',
                ],
            ])
            ->response()
            ->setStatusCode($statusCode);
    }

    public function show(EmployeeAttendance $employeeAttendance): JsonResponse
    {
        return (new EmployeeAttendanceResource(
            $employeeAttendance->load(['company', 'employee', 'employeeShift'])
        ))->response();
    }

    public function update(SaveEmployeeAttendanceRequest $request, EmployeeAttendance $employeeAttendance): JsonResponse
    {
        $updated = $this->employeeAttendanceService->updateEmployeeAttendance($employeeAttendance, $request->payload());

        return (new EmployeeAttendanceResource($updated))->response();
    }

    public function destroy(EmployeeAttendance $employeeAttendance): JsonResponse
    {
        $this->employeeAttendanceService->deleteEmployeeAttendance($employeeAttendance);

        return response()->json([
            'message' => 'Employee attendance deleted successfully.',
        ]);
    }
}
