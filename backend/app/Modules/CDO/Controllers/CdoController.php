<?php

namespace App\Modules\CDO\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\CDO\Services\CdoService;
use Illuminate\Http\JsonResponse;

class CdoController extends Controller
{
    public function __construct(
        protected CdoService $cdoService
    ) {}

    public function index(): JsonResponse
    {
        return response()->json([
            'data' => $this->cdoService->getOverview(),
        ]);
    }
}
