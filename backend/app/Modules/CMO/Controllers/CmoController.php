<?php

namespace App\Modules\CMO\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\CMO\Services\CmoService;
use Illuminate\Http\JsonResponse;

class CmoController extends Controller
{
    public function __construct(
        protected CmoService $cmoService
    ) {}

    public function index(): JsonResponse
    {
        return response()->json([
            'data' => $this->cmoService->getOverview(),
        ]);
    }
}
