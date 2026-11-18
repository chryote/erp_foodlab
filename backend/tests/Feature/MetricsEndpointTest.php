<?php

use Illuminate\Support\Facades\Cache;

describe('GET /api/metrics', function () {
    beforeEach(function () {
        Cache::flush();
    });

    it('exposes Prometheus formatted metrics after API requests', function () {
        $this->getJson('/api/health')->assertOk();

        $response = $this->get('/api/metrics');

        $response->assertOk();
        expect($response->headers->get('Content-Type'))
            ->toContain('text/plain; version=0.0.4')
            ->and($response->getContent())
            ->toContain('# HELP erp_foodlab_http_requests_total')
            ->toContain('erp_foodlab_http_requests_total{method="GET",route="/api/health",status="200"} 1');
    });
});
