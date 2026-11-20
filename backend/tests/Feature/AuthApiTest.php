<?php

use App\Models\User;

describe('Sanctum authentication API (/api/v1/auth)', function () {
    it('rejects anonymous access to protected ERP endpoints', function () {
        $this->getJson('/api/v1/modules/cfo/companies')->assertUnauthorized();
        $this->getJson('/api/v1/modules')->assertUnauthorized();
        $this->postJson('/api/v1/samples', [])->assertUnauthorized();
    });

    it('issues a personal access token for valid credentials', function () {
        $user = User::factory()->create([
            'email' => 'login@foodlab.test',
            'password' => 'secret-password',
        ]);

        $response = $this->postJson('/api/v1/auth/login', [
            'email' => 'login@foodlab.test',
            'password' => 'secret-password',
            'device_name' => 'pest',
        ]);

        $response->assertOk()
            ->assertJsonPath('data.user.email', 'login@foodlab.test')
            ->assertJsonPath('data.token_type', 'Bearer')
            ->assertJsonStructure([
                'data' => [
                    'user' => ['id', 'name', 'email'],
                    'token',
                    'token_type',
                ],
            ]);

        expect($user->tokens()->count())->toBe(1)
            ->and($user->tokens()->first()->name)->toBe('pest');
    });

    it('returns a 422 response for invalid credentials', function () {
        User::factory()->create(['email' => 'login@foodlab.test']);

        $this->postJson('/api/v1/auth/login', [
            'email' => 'login@foodlab.test',
            'password' => 'wrong-password',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['email']);
    });

    it('returns the current user and revokes the token on logout', function () {
        $user = User::factory()->create();
        $token = $user->createToken('pest')->plainTextToken;

        $this->withToken($token)->getJson('/api/v1/auth/me')
            ->assertOk()
            ->assertJsonPath('data.id', $user->id)
            ->assertJsonPath('data.email', $user->email);

        $this->withToken($token)->postJson('/api/v1/auth/logout')->assertOk();

        expect($user->tokens()->count())->toBe(0);

        $this->app['auth']->forgetGuards();

        $this->withToken($token)->getJson('/api/v1/auth/me')->assertUnauthorized();
    });
});
