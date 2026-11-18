<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Throwable;

class HealthController extends Controller
{
    public function __invoke(): JsonResponse
    {
        $dbStatus = 'ok';
        $cacheStatus = 'ok';

        try {
            DB::connection()->getPdo();
        } catch (Throwable) {
            $dbStatus = 'error';
        }

        try {
            Cache::put('health_check_ping', 'pong', 5);
            if (Cache::get('health_check_ping') !== 'pong') {
                $cacheStatus = 'error';
            }
        } catch (Throwable) {
            $cacheStatus = 'error';
        }

        $overallOk = ($dbStatus === 'ok' && $cacheStatus === 'ok');

        return response()->json([
            'status' => $overallOk ? 'ok' : 'degraded',
            'service' => config('app.name'),
            'checks' => [
                'database' => $dbStatus,
                'cache_redis' => $cacheStatus,
            ],
            'timestamp' => now()->toIso8601String(),
        ], $overallOk ? 200 : 503);
    }
}
