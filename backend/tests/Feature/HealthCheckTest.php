<?php

describe('GET /api/health', function () {
    it('returns 200 OK with database and cache status', function () {
        $response = $this->getJson('/api/health');

        $response->assertOk()
            ->assertJsonStructure([
                'status',
                'service',
                'checks' => ['database', 'cache_redis'],
                'timestamp',
            ])
            ->assertJsonPath('status', 'ok')
            ->assertJsonPath('checks.database', 'ok')
            ->assertJsonPath('checks.cache_redis', 'ok');
    });
});
