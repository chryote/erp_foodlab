<?php

namespace App\Services;

use App\Models\LabSample;
use Illuminate\Support\Facades\Cache;
use Throwable;

class MetricsCollectorService
{
    private const REGISTRY_KEY = 'prometheus:http_metrics_registry';

    /**
     * Record an HTTP request metric entry in the configured cache store (Redis in production).
     */
    public function recordHttpRequest(string $method, string $route, int $status, float $durationSeconds): void
    {
        if (! config('prometheus.enabled', true)) {
            return;
        }

        $method = strtoupper($method);
        $route = '/' . ltrim($route, '/');
        $bucketKey = "{$method}|{$route}|{$status}";

        $registry = Cache::get(self::REGISTRY_KEY, []);

        if (! isset($registry[$bucketKey])) {
            $registry[$bucketKey] = [
                'method' => $method,
                'route' => $route,
                'status' => (string) $status,
                'count' => 0,
                'duration_sum' => 0.0,
            ];
        }

        $registry[$bucketKey]['count'] += 1;
        $registry[$bucketKey]['duration_sum'] = round(
            $registry[$bucketKey]['duration_sum'] + max(0.0, $durationSeconds),
            6
        );

        Cache::forever(self::REGISTRY_KEY, $registry);
    }

    /**
     * Render all collected metrics in Prometheus text exposition format (0.0.4).
     */
    public function renderPrometheusText(): string
    {
        $ns = config('prometheus.namespace', 'erp_foodlab');
        $registry = Cache::get(self::REGISTRY_KEY, []);

        $lines = [
            "# HELP {$ns}_http_requests_total Total number of HTTP requests processed by the ERP FoodLab API.",
            "# TYPE {$ns}_http_requests_total counter",
        ];

        foreach ($registry as $entry) {
            $labels = sprintf(
                'method="%s",route="%s",status="%s"',
                addslashes($entry['method']),
                addslashes($entry['route']),
                addslashes($entry['status'])
            );
            $lines[] = "{$ns}_http_requests_total{{$labels}} {$entry['count']}";
        }

        $lines[] = "# HELP {$ns}_http_request_duration_seconds_sum Total HTTP latency in seconds.";
        $lines[] = "# TYPE {$ns}_http_request_duration_seconds_sum counter";
        $lines[] = "# HELP {$ns}_http_request_duration_seconds_count Total HTTP request count for latency calculation.";
        $lines[] = "# TYPE {$ns}_http_request_duration_seconds_count counter";

        foreach ($registry as $entry) {
            $labels = sprintf(
                'method="%s",route="%s"',
                addslashes($entry['method']),
                addslashes($entry['route'])
            );
            $lines[] = "{$ns}_http_request_duration_seconds_sum{{$labels}} {$entry['duration_sum']}";
            $lines[] = "{$ns}_http_request_duration_seconds_count{{$labels}} {$entry['count']}";
        }

        $lines[] = "# HELP {$ns}_samples_total Total lab samples grouped by status.";
        $lines[] = "# TYPE {$ns}_samples_total gauge";

        foreach ($this->getSampleCountsByStatus() as $status => $total) {
            $safeStatus = addslashes($status);
            $lines[] = "{$ns}_samples_total{status=\"{$safeStatus}\"} {$total}";
        }

        return implode("\n", $lines) . "\n";
    }

    /**
     * Query sample totals by status safely even if migrations have not yet run.
     *
     * @return array<string, int>
     */
    protected function getSampleCountsByStatus(): array
    {
        try {
            $counts = LabSample::query()
                ->selectRaw('status, count(*) as aggregate')
                ->groupBy('status')
                ->pluck('aggregate', 'status')
                ->all();

            return array_merge(
                ['pending' => 0, 'approved' => 0, 'rejected' => 0],
                array_map('intval', $counts)
            );
        } catch (Throwable) {
            return ['pending' => 0, 'approved' => 0, 'rejected' => 0];
        }
    }
}
