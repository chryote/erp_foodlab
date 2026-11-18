<?php

use App\Services\MetricsCollectorService;
use Illuminate\Support\Facades\Cache;

describe('MetricsCollectorService', function () {
    beforeEach(function () {
        Cache::flush();
    });

    it('records HTTP request counters and renders Prometheus text format', function () {
        $collector = new MetricsCollectorService();

        $collector->recordHttpRequest('GET', '/api/v1/samples', 200, 0.042);
        $collector->recordHttpRequest('GET', '/api/v1/samples', 200, 0.018);
        $collector->recordHttpRequest('POST', '/api/v1/samples', 201, 0.085);

        $output = $collector->renderPrometheusText();

        expect($output)
            ->toContain('erp_foodlab_http_requests_total{method="GET",route="/api/v1/samples",status="200"} 2')
            ->toContain('erp_foodlab_http_requests_total{method="POST",route="/api/v1/samples",status="201"} 1')
            ->toContain('erp_foodlab_http_request_duration_seconds_sum{method="GET",route="/api/v1/samples"} 0.06')
            ->toContain('erp_foodlab_samples_total{status="pending"}');
    });
});
