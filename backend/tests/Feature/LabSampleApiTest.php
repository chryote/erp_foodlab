<?php

use App\Models\LabSample;
use App\Services\LabSampleService;
use Illuminate\Support\Facades\Cache;

describe('LabSample API (/api/v1/samples)', function () {
    beforeEach(function () {
        Cache::flush();
    });

    it('lists lab samples and caches results in Redis/Cache store', function () {
        LabSample::factory()->count(3)->create();

        expect(Cache::has(LabSampleService::CACHE_KEY_LIST))->toBeFalse();

        $response = $this->getJson('/api/v1/samples');

        $response->assertOk()
            ->assertJsonCount(3, 'data')
            ->assertJsonPath('meta.cache_key', LabSampleService::CACHE_KEY_LIST);

        expect(Cache::has(LabSampleService::CACHE_KEY_LIST))->toBeTrue();
    });

    it('creates a new lab sample, computes quality grade, and invalidates cache', function () {
        Cache::put(LabSampleService::CACHE_KEY_LIST, ['stale'], 60);

        $payload = [
            'batch_code' => 'FL-TEST-2026',
            'product_name' => 'Pasteurized Whole Milk',
            'category' => 'Dairy',
            'ph_level' => 6.65,
            'moisture_percent' => 87.4,
            'status' => 'approved',
        ];

        $response = $this->postJson('/api/v1/samples', $payload);

        $response->assertCreated()
            ->assertJsonPath('data.batch_code', 'FL-TEST-2026')
            ->assertJsonPath('quality_grade', 'PASS');

        expect(Cache::has(LabSampleService::CACHE_KEY_LIST))->toBeFalse();
        $this->assertDatabaseHas('lab_samples', ['batch_code' => 'FL-TEST-2026']);
    });

    it('validates input fields when creating a lab sample', function () {
        $response = $this->postJson('/api/v1/samples', [
            'batch_code' => '',
            'ph_level' => 19.5,
        ]);

        $response->assertUnprocessable()
            ->assertJsonValidationErrors(['batch_code', 'product_name', 'category', 'ph_level', 'moisture_percent']);
    });
});
