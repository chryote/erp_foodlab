<?php

namespace App\Modules\HR\Controllers;

use App\Http\Controllers\Concerns\RespondsWithApiList;
use App\Http\Controllers\Controller;
use App\Http\Resources\EmployeeShiftResource;
use App\Models\EmployeeShift;
use App\Modules\HR\Requests\SaveEmployeeShiftRequest;
use App\Modules\HR\Services\EmployeeShiftService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class EmployeeShiftController extends Controller
{
    use RespondsWithApiList;

    public function __construct(
        protected EmployeeShiftService $employeeShiftService,
    ) {}

    public function index(Request $request): JsonResponse
    {
        return $this->respondWithList(
            EmployeeShiftResource::class,
            $this->employeeShiftService->list($request),
            ['cache_key' => EmployeeShiftService::CACHE_KEY_LIST]
        );
    }

    public function store(SaveEmployeeShiftRequest $request): JsonResponse
    {
        $employeeShift = $this->employeeShiftService->createEmployeeShift($request->payload());

        return (new EmployeeShiftResource($employeeShift))
            ->response()
            ->setStatusCode(201);
    }

    public function show(EmployeeShift $employeeShift): JsonResponse
    {
        return (new EmployeeShiftResource($employeeShift->load('company')))->response();
    }

    public function update(SaveEmployeeShiftRequest $request, EmployeeShift $employeeShift): JsonResponse
    {
        $updated = $this->employeeShiftService->updateEmployeeShift($employeeShift, $request->payload());

        return (new EmployeeShiftResource($updated))->response();
    }

    public function destroy(EmployeeShift $employeeShift): JsonResponse
    {
        $this->employeeShiftService->deleteEmployeeShift($employeeShift);

        return response()->json([
            'message' => 'Employee shift deleted successfully.',
        ]);
    }
}
