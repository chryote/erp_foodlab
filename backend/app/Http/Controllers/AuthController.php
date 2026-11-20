<?php

namespace App\Http\Controllers;

use App\Http\Requests\LoginRequest;
use App\Http\Resources\UserResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Laravel\Sanctum\PersonalAccessToken;

class AuthController extends Controller
{
    public function login(LoginRequest $request): JsonResponse
    {
        $user = $request->authenticate();
        $token = $user->createToken($request->string('device_name')->toString() ?: 'erp-web');

        return response()->json([
            'data' => [
                'user' => new UserResource($user),
                'token' => $token->plainTextToken,
                'token_type' => 'Bearer',
            ],
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        return (new UserResource($request->user()))->response();
    }

    public function logout(Request $request): JsonResponse
    {
        $currentToken = $request->user()->currentAccessToken();

        if ($currentToken instanceof PersonalAccessToken) {
            $currentToken->delete();
        }

        return response()->json([
            'message' => 'Logged out successfully.',
        ]);
    }
}
