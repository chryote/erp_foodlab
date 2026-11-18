<?php

namespace App\Http\Controllers;

use App\Services\MetricsCollectorService;
use Illuminate\Http\Response;

class MetricsController extends Controller
{
    public function __invoke(MetricsCollectorService $metricsCollector): Response
    {
        return response(
            $metricsCollector->renderPrometheusText(),
            200,
            ['Content-Type' => 'text/plain; version=0.0.4; charset=UTF-8']
        );
    }
}
