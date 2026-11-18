<?php

namespace App\Modules\CHO\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\CHO\Services\ChoService;
use Illuminate\Http\JsonResponse;

class ChoController extends Controller
{
    public function __construct(
        protected ChoService $choService
    ) {}

    public function index(): JsonResponse
    {
        return response()->json([
            'data' => $this->choService->getOverview(),
        ]);
    }
}
