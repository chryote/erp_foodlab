<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\RespondsWithApiList;
use App\Http\Requests\StoreLabSampleRequest;
use App\Http\Resources\LabSampleResource;
use App\Models\LabSample;
use App\Services\LabSampleService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LabSampleController extends Controller
{
    use RespondsWithApiList;

    public function __construct(
        protected LabSampleService $labSampleService
    ) {}

    public function index(Request $request): JsonResponse
    {
        return $this->respondWithList(
            LabSampleResource::class,
            $this->labSampleService->list($request),
            ['cache_key' => LabSampleService::CACHE_KEY_LIST]
        );
    }

    public function store(StoreLabSampleRequest $request): JsonResponse
    {
        $sample = $this->labSampleService->createSample($request->validated());

        return (new LabSampleResource($sample))
            ->additional([
                'quality_grade' => $this->labSampleService->evaluateQualityGrade(
                    (float) $sample->ph_level,
                    (float) $sample->moisture_percent
                ),
            ])
            ->response()
            ->setStatusCode(201);
    }

    public function show(LabSample $labSample): JsonResponse
    {
        return (new LabSampleResource($labSample))
            ->additional([
                'quality_grade' => $this->labSampleService->evaluateQualityGrade(
                    (float) $labSample->ph_level,
                    (float) $labSample->moisture_percent
                ),
            ])
            ->response();
    }
}
