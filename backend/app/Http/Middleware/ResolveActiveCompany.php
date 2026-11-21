<?php

namespace App\Http\Middleware;

use App\Support\ActiveCompany;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class ResolveActiveCompany
{
    /**
     * Resolve the active Company from the request header or persisted cache
     * so it is globally accessible across the backend during the request.
     *
     * @param  Closure(Request): Response  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        ActiveCompany::clear();
        ActiveCompany::resolveForRequest($request);

        return $next($request);
    }
}
