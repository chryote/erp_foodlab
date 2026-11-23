<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Ensure all /api requests negotiate JSON responses even when callers omit
 * or send non-JSON Accept headers (e.g. browsers or curl without Accept).
 */
class ForceJsonResponse
{
    public function handle(Request $request, Closure $next): Response
    {
        if ($request->is('api', 'api/*')) {
            $request->headers->set('Accept', 'application/json');
        }

        return $next($request);
    }
}
