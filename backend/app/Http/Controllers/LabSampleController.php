<?php

namespace App\Http\Controllers;

use App\Models\LabSample;
use App\Services\LabSampleService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LabSampleController extends Controller
{
    public function __construct(
        protected LabSampleService $labSampleService
    ) {}

    public function index(): JsonResponse
    {
        $samples = $this->labSampleService->listRecentSamples();

        return response()->json([
            'data' => $samples,
            'meta' => [
                'count' => $samples->count(),
                'cache_key' => LabSampleService::CACHE_KEY_LIST,
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'batch_code' => ['required', 'string', 'max:64', 'unique:lab_samples,batch_code'],
            'product_name' => ['required', 'string', 'max:150'],
            'category' => ['required', 'string', 'max:80'],
            'ph_level' => ['required', 'numeric', 'between:0,14'],
            'moisture_percent' => ['required', 'numeric', 'between:0,100'],
            'status' => ['sometimes', 'string', 'in:pending,approved,rejected'],
        ]);

        $sample = $this->labSampleService->createSample([
            ...$validated,
            'status' => $validated['status'] ?? 'pending',
        ]);

        return response()->json([
            'data' => $sample,
            'quality_grade' => $this->labSampleService->evaluateQualityGrade(
                (float) $sample->ph_level,
                (float) $sample->moisture_percent
            ),
        ], 201);
    }

    public function show(LabSample $labSample): JsonResponse
    {
        return response()->json([
            'data' => $labSample,
            'quality_grade' => $this->labSampleService->evaluateQualityGrade(
                (float) $labSample->ph_level,
                (float) $labSample->moisture_percent
            ),
        ]);
    }
}
