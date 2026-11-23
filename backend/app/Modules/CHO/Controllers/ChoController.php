<?php

namespace App\Modules\CHO\Controllers;

use App\Enums\Agama;
use App\Enums\GolonganDarah;
use App\Enums\JenisDokumen;
use App\Enums\JenisKelamin;
use App\Enums\PayrollGroup;
use App\Enums\PayrollRunStatus;
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

    public function enums(): JsonResponse
    {
        return response()->json([
            'data' => [
                'agama' => Agama::options(),
                'golongan_darah' => GolonganDarah::options(),
                'jenis_kelamin' => JenisKelamin::options(),
                'jenis_dokumen' => JenisDokumen::options(),
                'payroll_run_status' => PayrollRunStatus::options(),
                'payroll_group' => PayrollGroup::options(),
            ],
        ]);
    }
}
