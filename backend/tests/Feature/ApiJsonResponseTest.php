<?php

use Illuminate\Support\Facades\Route;

describe('API JSON response enforcement', function () {
    it('returns JSON for all registered GET API endpoints even when Accept is text/html', function () {
        actingAsErpUser();

        $routes = collect(Route::getRoutes()->getRoutes())
            ->filter(function ($route) {
                $uri = $route->uri();
                $methods = $route->methods();

                return str_starts_with($uri, 'api/')
                    && $uri !== 'api/metrics'
                    && in_array('GET', $methods, true)
                    && ! str_contains($uri, '{');
            });

        expect($routes)->not->toBeEmpty();

        foreach ($routes as $route) {
            $uri = '/'.ltrim($route->uri(), '/');

            $response = $this->withHeaders([
                'Accept' => 'text/html,application/xhtml+xml',
            ])->get($uri);

            expect($response->getStatusCode())->toBe(
                200,
                "GET {$uri} returned status {$response->getStatusCode()}"
            );
            expect($response->headers->get('Content-Type'))
                ->toContain('application/json');
            expect(json_decode($response->getContent(), true))->toBeArray();
        }
    });

    it('preserves Prometheus text/plain on /api/metrics and HTML on web /', function () {
        $metricsResponse = $this->withHeaders([
            'Accept' => 'text/html',
        ])->get('/api/metrics');

        $metricsResponse->assertOk();
        expect($metricsResponse->headers->get('Content-Type'))
            ->toContain('text/plain; version=0.0.4');

        $webResponse = $this->get('/');
        $webResponse->assertOk();
        expect($webResponse->headers->get('Content-Type'))->toContain('text/html');
    });

    it('returns JSON instead of HTML or redirects for 401, 404, 405, 422, 429, and 500 API errors without Accept: application/json', function () {
        // 401 Unauthenticated
        $unauth = $this->withHeaders(['Accept' => 'text/html'])
            ->get('/api/v1/auth/me');
        $unauth->assertUnauthorized();
        expect($unauth->headers->get('Content-Type'))->toContain('application/json');
        $unauth->assertJsonStructure(['message']);

        // 422 ValidationException on public auth login (must not 302 redirect to HTML)
        $loginValidation = $this->withHeaders(['Accept' => 'text/html'])
            ->post('/api/v1/auth/login', []);
        $loginValidation->assertUnprocessable();
        expect($loginValidation->headers->get('Content-Type'))->toContain('application/json');
        $loginValidation->assertJsonStructure(['message', 'errors' => ['email', 'password']]);

        // 404 Unknown API path and bare /api
        foreach (['/api', '/api/v1/does-not-exist'] as $unknownUri) {
            $notFound = $this->withHeaders(['Accept' => 'text/html'])->get($unknownUri);
            $notFound->assertNotFound();
            expect($notFound->headers->get('Content-Type'))->toContain('application/json');
            $notFound->assertJsonStructure(['message']);
        }

        // 405 Method Not Allowed (including POST-only /api/v1/documents)
        foreach (['/api/health', '/api/v1/documents'] as $uri) {
            $methodNotAllowed = $this->withHeaders(['Accept' => 'text/html'])
                ->get($uri === '/api/health' ? '/api/health' : $uri);
            if ($uri === '/api/health') {
                $methodNotAllowed = $this->withHeaders(['Accept' => 'text/html'])->post($uri);
            }
            $methodNotAllowed->assertStatus(405);
            expect($methodNotAllowed->headers->get('Content-Type'))->toContain('application/json');
            $methodNotAllowed->assertJsonStructure(['message']);
        }

        // 429 Rate Limit on /api/v1/auth/login (throttle:5,1; 1 request already made above)
        for ($i = 0; $i < 4; $i++) {
            $this->withHeaders(['Accept' => 'text/html'])->post('/api/v1/auth/login', []);
        }
        $throttled = $this->withHeaders(['Accept' => 'text/html'])
            ->post('/api/v1/auth/login', []);
        $throttled->assertStatus(429);
        expect($throttled->headers->get('Content-Type'))->toContain('application/json');
        $throttled->assertJsonStructure(['message']);

        // Authenticated 404 ModelNotFoundException and 422 FormRequest ValidationException
        actingAsErpUser();

        $missingModel = $this->withHeaders(['Accept' => 'text/html'])
            ->get('/api/v1/modules/cfo/companies/999999');
        $missingModel->assertNotFound();
        expect($missingModel->headers->get('Content-Type'))->toContain('application/json');
        $missingModel->assertJsonStructure(['message']);

        $companyValidation = $this->withHeaders(['Accept' => 'text/html'])
            ->post('/api/v1/modules/cfo/companies', []);
        $companyValidation->assertUnprocessable();
        expect($companyValidation->headers->get('Content-Type'))->toContain('application/json');
        $companyValidation->assertJsonStructure(['message', 'errors' => ['name']]);

        $documentValidation = $this->withHeaders(['Accept' => 'text/html'])
            ->post('/api/v1/documents', []);
        $documentValidation->assertUnprocessable();
        expect($documentValidation->headers->get('Content-Type'))->toContain('application/json');
        $documentValidation->assertJsonStructure(['message', 'errors' => ['document']]);

        // 500 Unhandled Server Error
        Route::get('/api/_test-server-error', function () {
            throw new RuntimeException('Simulated unexpected failure');
        });

        $serverError = $this->withHeaders(['Accept' => 'text/html'])
            ->get('/api/_test-server-error');
        $serverError->assertStatus(500);
        expect($serverError->headers->get('Content-Type'))->toContain('application/json');
        $serverError->assertJsonStructure(['message']);
    });
});
