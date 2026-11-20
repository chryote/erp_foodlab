<?php

namespace App\Modules\CHO\Controllers;

use App\Http\Controllers\Concerns\RespondsWithApiList;
use App\Http\Controllers\Controller;
use App\Http\Resources\EmployeePositionResource;
use App\Models\EmployeePosition;
use App\Modules\CHO\Requests\SaveEmployeePositionRequest;
use App\Modules\CHO\Services\EmployeePositionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class EmployeePositionController extends Controller
{
    use RespondsWithApiList;

    public function __construct(
        protected EmployeePositionService $employeePositionService,
    ) {}

    public function index(Request $request): JsonResponse
    {
        return $this->respondWithList(
            EmployeePositionResource::class,
            $this->employeePositionService->list($request),
            ['cache_key' => EmployeePositionService::CACHE_KEY_LIST]
        );
    }

    public function store(SaveEmployeePositionRequest $request): JsonResponse
    {
        $employeePosition = $this->employeePositionService->createEmployeePosition($request->payload());

        return (new EmployeePositionResource($employeePosition))
            ->response()
            ->setStatusCode(201);
    }

    public function show(EmployeePosition $employeePosition): JsonResponse
    {
        return (new EmployeePositionResource($employeePosition->load('company')))->response();
    }

    public function update(SaveEmployeePositionRequest $request, EmployeePosition $employeePosition): JsonResponse
    {
        $updated = $this->employeePositionService->updateEmployeePosition($employeePosition, $request->payload());

        return (new EmployeePositionResource($updated))->response();
    }

    public function destroy(EmployeePosition $employeePosition): JsonResponse
    {
        $this->employeePositionService->deleteEmployeePosition($employeePosition);

        return response()->json([
            'message' => 'Employee position deleted successfully.',
        ]);
    }
}
