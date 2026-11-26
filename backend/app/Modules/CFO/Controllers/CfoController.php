<?php

namespace App\Modules\CFO\Controllers;

use App\Enums\CompanyType;
use App\Http\Controllers\Controller;
use App\Modules\CFO\Services\CfoService;
use Illuminate\Http\JsonResponse;

class CfoController extends Controller
{
    public function __construct(
        protected CfoService $cfoService
    ) {}

    public function index(): JsonResponse
    {
        return response()->json([
            'data' => $this->cfoService->getOverview(),
        ]);
    }

    public function enums(): JsonResponse
    {
        return response()->json([
            'data' => [
                'company_type' => CompanyType::options(),
            ],
        ]);
    }
}
