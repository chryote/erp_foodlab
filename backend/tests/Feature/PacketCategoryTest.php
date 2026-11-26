<?php

use App\Http\Resources\PacketCategoryResource;
use App\Models\PacketCategory;
use App\Modules\CPO\Services\CpoService;
use App\Modules\CPO\Services\PacketCategoryService;
use App\Support\IndexQuery;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

describe('PacketCategory CPO module', function () {
    beforeEach(function () {
        Cache::flush();
        actingAsErpUser();
    });

    it('supports CRUD, QueryBuilder filtering/sorting/pagination, caching, and JsonResource structure', function () {
        // Warm dependent CPO overview cache to confirm writes invalidate it
        $this->getJson('/api/v1/modules/cpo')->assertOk();
        expect(Cache::has(CpoService::CACHE_KEY))->toBeTrue();

        // Create via SavePacketCategoryRequest + DB::transaction (company-agnostic)
        $createRes = $this->postJson('/api/v1/modules/cpo/packet-categories', [
            'name' => '  Kategori   100%  Hemat  ',
        ]);

        $createRes->assertCreated()
            ->assertJsonStructure([
                'data' => [
                    'id',
                    'name',
                    'created_at',
                    'updated_at',
                    'deleted_at',
                ],
            ])
            ->assertJsonMissingPath('data.active_flag')
            ->assertJsonMissingPath('data.company_id')
            ->assertJsonMissingPath('data.default_packages')
            ->assertJsonPath('data.name', 'Kategori 100% Hemat');

        expect(Cache::has(CpoService::CACHE_KEY))->toBeFalse();

        $categoryHematId = $createRes->json('data.id');
        $categoryA = PacketCategory::factory()->create(['name' => 'Kategori Alpha_Lab']);
        $categoryB = PacketCategory::factory()->create(['name' => 'Kategori Beta']);

        // Unfiltered list uses defaultSort('name', 'id') and populates cache
        expect(Cache::has(PacketCategoryService::CACHE_KEY_LIST))->toBeFalse();

        $this->getJson('/api/v1/modules/cpo/packet-categories')
            ->assertOk()
            ->assertJsonCount(3, 'data')
            ->assertJsonPath('meta.cache_key', PacketCategoryService::CACHE_KEY_LIST)
            ->assertJsonPath('data.0.id', $categoryHematId)
            ->assertJsonPath('data.1.id', $categoryA->id)
            ->assertJsonPath('data.2.id', $categoryB->id);

        expect(Cache::has(PacketCategoryService::CACHE_KEY_LIST))->toBeTrue();

        // Filter by name and search with LIKE wildcard escaping & whitespace-only skipping
        $this->getJson('/api/v1/modules/cpo/packet-categories?filter[name]='.urlencode('100%'))
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $categoryHematId);

        $this->getJson('/api/v1/modules/cpo/packet-categories?filter[search]='.urlencode('Alpha_'))
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $categoryA->id);

        $this->getJson('/api/v1/modules/cpo/packet-categories?search=Beta')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $categoryB->id);

        $this->getJson('/api/v1/modules/cpo/packet-categories?filter[name]=%20%20%20')
            ->assertOk()
            ->assertJsonCount(3, 'data');

        // Sort & pagination + per_page cap
        $this->getJson('/api/v1/modules/cpo/packet-categories?sort=-name&per_page=2&page=1')
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('meta.total', 3)
            ->assertJsonPath('meta.per_page', 2)
            ->assertJsonPath('data.0.id', $categoryB->id)
            ->assertJsonPath('data.1.id', $categoryA->id);

        $this->getJson('/api/v1/modules/cpo/packet-categories?sort=id&page=1&per_page=99999')
            ->assertOk()
            ->assertJsonPath('meta.per_page', IndexQuery::MAX_PER_PAGE)
            ->assertJsonPath('data.0.id', $categoryHematId);

        $this->getJson('/api/v1/modules/cpo/packet-categories?sort=-created_at')
            ->assertOk()
            ->assertJsonCount(3, 'data');

        // Show single packet category
        $this->getJson("/api/v1/modules/cpo/packet-categories/{$categoryHematId}")
            ->assertOk()
            ->assertJsonPath('data.id', $categoryHematId)
            ->assertJsonPath('data.name', 'Kategori 100% Hemat');

        // PUT update keeping same name works and invalidates cache
        $this->putJson("/api/v1/modules/cpo/packet-categories/{$categoryHematId}", [
            'name' => 'Kategori 100% Hemat',
        ])->assertOk()
            ->assertJsonPath('data.name', 'Kategori 100% Hemat');

        expect(Cache::has(PacketCategoryService::CACHE_KEY_LIST))->toBeFalse();

        // PUT update changing name
        $this->putJson("/api/v1/modules/cpo/packet-categories/{$categoryHematId}", [
            'name' => 'Kategori Reguler',
        ])->assertOk()
            ->assertJsonPath('data.name', 'Kategori Reguler');

        // Partial PATCH with empty payload keeps existing values
        $this->patchJson("/api/v1/modules/cpo/packet-categories/{$categoryHematId}", [])
            ->assertOk()
            ->assertJsonPath('data.name', 'Kategori Reguler');

        // Partial PATCH updating name
        $this->patchJson("/api/v1/modules/cpo/packet-categories/{$categoryHematId}", [
            'name' => '  Kategori   Premium  ',
        ])->assertOk()
            ->assertJsonPath('data.name', 'Kategori Premium');

        // Soft delete (cascading soft delete to default_packages & ingredients activates when those models exist)
        $this->getJson('/api/v1/modules/cpo/packet-categories')->assertOk();
        $this->getJson('/api/v1/modules/cpo')->assertOk();
        expect(Cache::has(PacketCategoryService::CACHE_KEY_LIST))->toBeTrue();
        expect(Cache::has(CpoService::CACHE_KEY))->toBeTrue();

        $this->deleteJson("/api/v1/modules/cpo/packet-categories/{$categoryHematId}")
            ->assertOk()
            ->assertJsonStructure(['message']);

        expect(Cache::has(PacketCategoryService::CACHE_KEY_LIST))->toBeFalse();
        expect(Cache::has(CpoService::CACHE_KEY))->toBeFalse();
        $this->assertSoftDeleted('packet_categories', ['id' => $categoryHematId]);
        $this->getJson("/api/v1/modules/cpo/packet-categories/{$categoryHematId}")->assertNotFound();
    });

    it('enforces validation bounds, active-duplicate rejection (case & whitespace), and reuse after soft delete', function () {
        // Missing, empty / whitespace-only & >150-char names fail with 422
        $this->postJson('/api/v1/modules/cpo/packet-categories', [])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['name']);

        $this->postJson('/api/v1/modules/cpo/packet-categories', [
            'name' => '   ',
        ])->assertUnprocessable()->assertJsonValidationErrors(['name']);

        $this->postJson('/api/v1/modules/cpo/packet-categories', [
            'name' => str_repeat('K', 151),
        ])->assertUnprocessable()->assertJsonValidationErrors(['name']);

        // Create active packet category with normalized spacing
        $first = $this->postJson('/api/v1/modules/cpo/packet-categories', [
            'name' => '  Kategori   Bundling  ',
        ])->assertCreated()
            ->assertJsonPath('data.name', 'Kategori Bundling');

        $firstId = $first->json('data.id');

        // Exact, case-variant, and whitespace-padded duplicates fail with 422
        $this->postJson('/api/v1/modules/cpo/packet-categories', [
            'name' => 'Kategori Bundling',
        ])->assertUnprocessable()->assertJsonValidationErrors(['name']);

        $this->postJson('/api/v1/modules/cpo/packet-categories', [
            'name' => 'kategori bundling',
        ])->assertUnprocessable()->assertJsonValidationErrors(['name']);

        $this->postJson('/api/v1/modules/cpo/packet-categories', [
            'name' => '  KATEGORI   BUNDLING ',
        ])->assertUnprocessable()->assertJsonValidationErrors(['name']);

        // Updating another packet category to a colliding name (PUT & PATCH) fails with 422
        $second = $this->postJson('/api/v1/modules/cpo/packet-categories', [
            'name' => 'Kategori Ekonomi',
        ])->assertCreated();

        $secondId = $second->json('data.id');

        $this->putJson("/api/v1/modules/cpo/packet-categories/{$secondId}", [
            'name' => 'kategori bundling',
        ])->assertUnprocessable()->assertJsonValidationErrors(['name']);

        $this->patchJson("/api/v1/modules/cpo/packet-categories/{$secondId}", [
            'name' => '  KATEGORI   BUNDLING  ',
        ])->assertUnprocessable()->assertJsonValidationErrors(['name']);

        // Soft delete frees the name for re-creation
        $this->deleteJson("/api/v1/modules/cpo/packet-categories/{$firstId}")->assertOk();

        $recreated = $this->postJson('/api/v1/modules/cpo/packet-categories', [
            'name' => 'Kategori Bundling',
        ])->assertCreated()
            ->assertJsonPath('data.name', 'Kategori Bundling');

        expect($recreated->json('data.id'))->not->toBe($firstId);
    });

    it('renders PacketCategoryResource conditional relations cleanly and serves OpenAPI docs', function () {
        $packetCategory = PacketCategory::factory()->create(['name' => 'Kategori Nama Resource Test']);

        $unloaded = (new PacketCategoryResource($packetCategory))->resolve(Request::create('/'));
        expect($unloaded)
            ->toHaveKeys(['id', 'name', 'created_at', 'updated_at', 'deleted_at'])
            ->not->toHaveKey('default_packages');

        $packetCategory->setRelation('defaultPackages', collect([['id' => 1, 'name' => 'Sample Package']]));
        $loaded = (new PacketCategoryResource($packetCategory))->resolve(Request::create('/'));
        expect($loaded['default_packages'])->toHaveCount(1);

        $this->getJson('/docs/api.json')
            ->assertOk()
            ->assertJsonPath('openapi', fn ($v) => is_string($v) && $v !== '');
    });
});
