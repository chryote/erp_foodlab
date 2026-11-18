<?php

namespace App\Http\Middleware;

use App\Services\MetricsCollectorService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RecordPrometheusMetrics
{
    public function __construct(
        protected MetricsCollectorService $metricsCollector
    ) {}

    public function handle(Request $request, Closure $next): Response
    {
        $startTime = microtime(true);

        /** @var Response $response */
        $response = $next($request);

        $durationSeconds = microtime(true) - $startTime;
        $route = $request->route()?->uri() ?? $request->path();

        $this->metricsCollector->recordHttpRequest(
            $request->method(),
            $route,
            $response->getStatusCode(),
            $durationSeconds
        );

        return $response;
    }
}
