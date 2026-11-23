<?php

use App\Http\Middleware\EnforceIdempotencyKey;
use App\Http\Middleware\ForceJsonResponse;
use App\Http\Middleware\RecordPrometheusMetrics;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        $middleware->prepend(ForceJsonResponse::class);

        $middleware->redirectGuestsTo(
            fn (Request $request) => $request->is('api', 'api/*') ? null : '/'
        );

        $middleware->api(append: [
            RecordPrometheusMetrics::class,
            EnforceIdempotencyKey::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request, Throwable $e): bool => $request->is('api', 'api/*') || $request->expectsJson()
        );

        $exceptions->render(function (AuthenticationException $exception, Request $request) {
            if ($request->is('api', 'api/*')) {
                return response()->json([
                    'message' => 'Unauthenticated.',
                ], 401);
            }
        });

        $exceptions->render(function (UniqueConstraintViolationException $exception, Request $request) {
            if ($request->is('api', 'api/*')) {
                return response()->json([
                    'message' => 'A duplicate active record already exists.',
                    'errors' => [
                        'duplicate' => ['A duplicate active record already exists.'],
                    ],
                ], 422);
            }
        });
    })->create();
