<?php

namespace App\Http\Controllers;

use App\Modules\CDO\Services\CdoService;
use App\Modules\CFO\Services\CfoService;
use App\Modules\CHO\Services\ChoService;
use App\Modules\CMO\Services\CmoService;
use App\Modules\CPO\Services\CpoService;
use Illuminate\Http\JsonResponse;

class ErpMenuController extends Controller
{
    public function __invoke(
        CfoService $cfoService,
        ChoService $choService,
        CpoService $cpoService,
        CdoService $cdoService,
        CmoService $cmoService,
    ): JsonResponse {
        $modules = [
            $cfoService->getOverview(),
            $choService->getOverview(),
            $cpoService->getOverview(),
            $cdoService->getOverview(),
            $cmoService->getOverview(),
        ];

        return response()->json([
            'data' => $modules,
            'meta' => [
                'count' => count($modules),
            ],
        ]);
    }
}
