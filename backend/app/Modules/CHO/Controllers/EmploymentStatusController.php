<?php

namespace App\Modules\CHO\Controllers;

use App\Http\Controllers\Concerns\RespondsWithApiList;
use App\Http\Controllers\Controller;
use App\Http\Resources\EmploymentStatusResource;
use App\Models\EmploymentStatus;
use App\Modules\CHO\Requests\SaveEmploymentStatusRequest;
use App\Modules\CHO\Services\EmploymentStatusService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class EmploymentStatusController extends Controller
{
    use RespondsWithApiList;

    public function __construct(
        protected EmploymentStatusService $employmentStatusService,
    ) {}

    public function index(Request $request): JsonResponse
    {
        return $this->respondWithList(
            EmploymentStatusResource::class,
            $this->employmentStatusService->list($request),
            ['cache_key' => EmploymentStatusService::CACHE_KEY_LIST]
        );
    }

    public function store(SaveEmploymentStatusRequest $request): JsonResponse
    {
        $employmentStatus = $this->employmentStatusService->createEmploymentStatus($request->payload());

        return (new EmploymentStatusResource($employmentStatus))
            ->response()
            ->setStatusCode(201);
    }

    public function show(EmploymentStatus $employmentStatus): JsonResponse
    {
        return (new EmploymentStatusResource($employmentStatus))->response();
    }

    public function update(SaveEmploymentStatusRequest $request, EmploymentStatus $employmentStatus): JsonResponse
    {
        $updated = $this->employmentStatusService->updateEmploymentStatus($employmentStatus, $request->payload());

        return (new EmploymentStatusResource($updated))->response();
    }

    public function destroy(EmploymentStatus $employmentStatus): JsonResponse
    {
        $this->employmentStatusService->deleteEmploymentStatus($employmentStatus);

        return response()->json([
            'message' => 'Employment status deleted successfully.',
        ]);
    }
}
