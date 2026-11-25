<?php

namespace App\Modules\CPO\Controllers;

use App\Enums\ItemType;
use App\Http\Controllers\Controller;
use App\Modules\CPO\Services\CpoService;
use Illuminate\Http\JsonResponse;

class CpoController extends Controller
{
    public function __construct(
        protected CpoService $cpoService
    ) {}

    public function index(): JsonResponse
    {
        return response()->json([
            'data' => $this->cpoService->getOverview(),
        ]);
    }

    public function enums(): JsonResponse
    {
        return response()->json([
            'data' => [
                'item_type' => ItemType::options(),
            ],
        ]);
    }
}
