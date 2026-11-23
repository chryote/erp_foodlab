<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Symfony\Component\HttpFoundation\Response;

/**
 * Optional Idempotency-Key protection for POST API endpoints.
 *
 * When a client sends an `Idempotency-Key` header, concurrent or retried POST
 * requests with the same key and payload return the cached 2xx response without
 * creating duplicate rows. Requests without the header pass straight through.
 */
class EnforceIdempotencyKey
{
    private const CACHE_TTL_SECONDS = 300;

    private const LOCK_TTL_SECONDS = 15;

    public function handle(Request $request, Closure $next): Response
    {
        if (! $request->isMethod('POST')) {
            return $next($request);
        }

        $rawKey = $request->header('Idempotency-Key');
        if (! is_string($rawKey) || trim($rawKey) === '') {
            return $next($request);
        }

        $idempotencyKey = trim($rawKey);
        if (strlen($idempotencyKey) > 128) {
            return new JsonResponse([
                'message' => 'The Idempotency-Key header may not exceed 128 characters.',
                'errors' => [
                    'idempotency_key' => ['The Idempotency-Key header may not exceed 128 characters.'],
                ],
            ], 422);
        }

        $actor = $request->user()?->getAuthIdentifier() ?? ('ip:'.($request->ip() ?? 'unknown'));
        $fingerprint = sha1($actor.'|'.$request->method().'|'.$request->path().'|'.$idempotencyKey);
        $cacheKey = "erp_foodlab:idempotency:{$fingerprint}";
        $payloadHash = hash('sha256', json_encode($request->all(), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) ?: '');

        $cached = Cache::get($cacheKey);
        if (is_array($cached)) {
            return $this->replayOrReject($cached, $payloadHash);
        }

        $lock = Cache::lock("erp_foodlab:idempotency:lock:{$fingerprint}", self::LOCK_TTL_SECONDS);
        if (! $lock->get()) {
            return new JsonResponse([
                'message' => 'A request with this Idempotency-Key is already in progress.',
            ], 409);
        }

        try {
            $cached = Cache::get($cacheKey);
            if (is_array($cached)) {
                return $this->replayOrReject($cached, $payloadHash);
            }

            $response = $next($request);

            if ($response->getStatusCode() >= 200 && $response->getStatusCode() < 300) {
                $content = $response->getContent();
                $decoded = is_string($content) ? json_decode($content, true) : null;

                if (is_array($decoded)) {
                    Cache::put($cacheKey, [
                        'payload_hash' => $payloadHash,
                        'status' => $response->getStatusCode(),
                        'body' => $decoded,
                    ], self::CACHE_TTL_SECONDS);
                }
            }

            return $response;
        } finally {
            $lock->release();
        }
    }

    /**
     * @param  array<string, mixed>  $cached
     */
    private function replayOrReject(array $cached, string $payloadHash): JsonResponse
    {
        if (($cached['payload_hash'] ?? null) !== $payloadHash) {
            return new JsonResponse([
                'message' => 'Idempotency-Key was already used with a different request payload.',
                'errors' => [
                    'idempotency_key' => ['Idempotency-Key was already used with a different request payload.'],
                ],
            ], 422);
        }

        return (new JsonResponse($cached['body'], (int) $cached['status']))
            ->header('X-Idempotency-Replayed', 'true');
    }
}
