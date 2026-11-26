<?php

use App\Http\Resources\PacketNameResource;
use App\Models\PacketName;
use App\Modules\CPO\Services\CpoService;
use App\Modules\CPO\Services\PacketNameService;
use App\Support\IndexQuery;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

describe('PacketName CPO module', function () {
    beforeEach(function () {
        Cache::flush();
        actingAsErpUser();
    });

    it('supports CRUD, QueryBuilder filtering/sorting/pagination, caching, and JsonResource structure', function () {
        // Warm dependent CPO overview cache to confirm writes invalidate it
        $this->getJson('/api/v1/modules/cpo')->assertOk();
        expect(Cache::has(CpoService::CACHE_KEY))->toBeTrue();

        // Create via SavePacketNameRequest + DB::transaction (company-agnostic)
        $createRes = $this->postJson('/api/v1/modules/cpo/packet-names', [
            'name' => '  Paket   100%  Hemat  ',
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
            ->assertJsonPath('data.name', 'Paket 100% Hemat');

        expect(Cache::has(CpoService::CACHE_KEY))->toBeFalse();

        $paketHematId = $createRes->json('data.id');
        $paketA = PacketName::factory()->create(['name' => 'Paket Alpha_Lab']);
        $paketB = PacketName::factory()->create(['name' => 'Paket Beta']);

        // Unfiltered list uses defaultSort('name', 'id') and populates cache
        expect(Cache::has(PacketNameService::CACHE_KEY_LIST))->toBeFalse();

        $this->getJson('/api/v1/modules/cpo/packet-names')
            ->assertOk()
            ->assertJsonCount(3, 'data')
            ->assertJsonPath('meta.cache_key', PacketNameService::CACHE_KEY_LIST)
            ->assertJsonPath('data.0.id', $paketHematId)
            ->assertJsonPath('data.1.id', $paketA->id)
            ->assertJsonPath('data.2.id', $paketB->id);

        expect(Cache::has(PacketNameService::CACHE_KEY_LIST))->toBeTrue();

        // Filter by name and search with LIKE wildcard escaping & whitespace-only skipping
        $this->getJson('/api/v1/modules/cpo/packet-names?filter[name]='.urlencode('100%'))
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $paketHematId);

        $this->getJson('/api/v1/modules/cpo/packet-names?filter[search]='.urlencode('Alpha_'))
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $paketA->id);

        $this->getJson('/api/v1/modules/cpo/packet-names?search=Beta')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $paketB->id);

        $this->getJson('/api/v1/modules/cpo/packet-names?filter[name]=%20%20%20')
            ->assertOk()
            ->assertJsonCount(3, 'data');

        // Sort & pagination + per_page cap
        $this->getJson('/api/v1/modules/cpo/packet-names?sort=-name&per_page=2&page=1')
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('meta.total', 3)
            ->assertJsonPath('meta.per_page', 2)
            ->assertJsonPath('data.0.id', $paketB->id)
            ->assertJsonPath('data.1.id', $paketA->id);

        $this->getJson('/api/v1/modules/cpo/packet-names?sort=id&page=1&per_page=99999')
            ->assertOk()
            ->assertJsonPath('meta.per_page', IndexQuery::MAX_PER_PAGE)
            ->assertJsonPath('data.0.id', $paketHematId);

        $this->getJson('/api/v1/modules/cpo/packet-names?sort=-created_at')
            ->assertOk()
            ->assertJsonCount(3, 'data');

        // Show single packet name
        $this->getJson("/api/v1/modules/cpo/packet-names/{$paketHematId}")
            ->assertOk()
            ->assertJsonPath('data.id', $paketHematId)
            ->assertJsonPath('data.name', 'Paket 100% Hemat');

        // PUT update keeping same name works and invalidates cache
        $this->putJson("/api/v1/modules/cpo/packet-names/{$paketHematId}", [
            'name' => 'Paket 100% Hemat',
        ])->assertOk()
            ->assertJsonPath('data.name', 'Paket 100% Hemat');

        expect(Cache::has(PacketNameService::CACHE_KEY_LIST))->toBeFalse();

        // PUT update changing name
        $this->putJson("/api/v1/modules/cpo/packet-names/{$paketHematId}", [
            'name' => 'Paket Reguler',
        ])->assertOk()
            ->assertJsonPath('data.name', 'Paket Reguler');

        // Partial PATCH with empty payload keeps existing values
        $this->patchJson("/api/v1/modules/cpo/packet-names/{$paketHematId}", [])
            ->assertOk()
            ->assertJsonPath('data.name', 'Paket Reguler');

        // Partial PATCH updating name
        $this->patchJson("/api/v1/modules/cpo/packet-names/{$paketHematId}", [
            'name' => '  Paket   Premium  ',
        ])->assertOk()
            ->assertJsonPath('data.name', 'Paket Premium');

        // Soft delete (cascading soft delete to default_packages & ingredients activates when those models exist)
        $this->getJson('/api/v1/modules/cpo/packet-names')->assertOk();
        $this->getJson('/api/v1/modules/cpo')->assertOk();
        expect(Cache::has(PacketNameService::CACHE_KEY_LIST))->toBeTrue();
        expect(Cache::has(CpoService::CACHE_KEY))->toBeTrue();

        $this->deleteJson("/api/v1/modules/cpo/packet-names/{$paketHematId}")
            ->assertOk()
            ->assertJsonStructure(['message']);

        expect(Cache::has(PacketNameService::CACHE_KEY_LIST))->toBeFalse();
        expect(Cache::has(CpoService::CACHE_KEY))->toBeFalse();
        $this->assertSoftDeleted('packet_names', ['id' => $paketHematId]);
        $this->getJson("/api/v1/modules/cpo/packet-names/{$paketHematId}")->assertNotFound();
    });

    it('enforces validation bounds, active-duplicate rejection (case & whitespace), and reuse after soft delete', function () {
        // Missing, empty / whitespace-only & >150-char names fail with 422
        $this->postJson('/api/v1/modules/cpo/packet-names', [])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['name']);

        $this->postJson('/api/v1/modules/cpo/packet-names', [
            'name' => '   ',
        ])->assertUnprocessable()->assertJsonValidationErrors(['name']);

        $this->postJson('/api/v1/modules/cpo/packet-names', [
            'name' => str_repeat('P', 151),
        ])->assertUnprocessable()->assertJsonValidationErrors(['name']);

        // Create active packet name with normalized spacing
        $first = $this->postJson('/api/v1/modules/cpo/packet-names', [
            'name' => '  Paket   Bundling  ',
        ])->assertCreated()
            ->assertJsonPath('data.name', 'Paket Bundling');

        $firstId = $first->json('data.id');

        // Exact, case-variant, and whitespace-padded duplicates fail with 422
        $this->postJson('/api/v1/modules/cpo/packet-names', [
            'name' => 'Paket Bundling',
        ])->assertUnprocessable()->assertJsonValidationErrors(['name']);

        $this->postJson('/api/v1/modules/cpo/packet-names', [
            'name' => 'paket bundling',
        ])->assertUnprocessable()->assertJsonValidationErrors(['name']);

        $this->postJson('/api/v1/modules/cpo/packet-names', [
            'name' => '  PAKET   BUNDLING ',
        ])->assertUnprocessable()->assertJsonValidationErrors(['name']);

        // Updating another packet name to a colliding name (PUT & PATCH) fails with 422
        $second = $this->postJson('/api/v1/modules/cpo/packet-names', [
            'name' => 'Paket Ekonomi',
        ])->assertCreated();

        $secondId = $second->json('data.id');

        $this->putJson("/api/v1/modules/cpo/packet-names/{$secondId}", [
            'name' => 'paket bundling',
        ])->assertUnprocessable()->assertJsonValidationErrors(['name']);

        $this->patchJson("/api/v1/modules/cpo/packet-names/{$secondId}", [
            'name' => '  PAKET   BUNDLING  ',
        ])->assertUnprocessable()->assertJsonValidationErrors(['name']);

        // Soft delete frees the name for re-creation
        $this->deleteJson("/api/v1/modules/cpo/packet-names/{$firstId}")->assertOk();

        $recreated = $this->postJson('/api/v1/modules/cpo/packet-names', [
            'name' => 'Paket Bundling',
        ])->assertCreated()
            ->assertJsonPath('data.name', 'Paket Bundling');

        expect($recreated->json('data.id'))->not->toBe($firstId);
    });

    it('renders PacketNameResource conditional relations cleanly and serves OpenAPI docs', function () {
        $packetName = PacketName::factory()->create(['name' => 'Paket Nama Resource Test']);

        $unloaded = (new PacketNameResource($packetName))->resolve(Request::create('/'));
        expect($unloaded)
            ->toHaveKeys(['id', 'name', 'created_at', 'updated_at', 'deleted_at'])
            ->not->toHaveKey('default_packages');

        $packetName->setRelation('defaultPackages', collect([['id' => 1, 'name' => 'Sample Package']]));
        $loaded = (new PacketNameResource($packetName))->resolve(Request::create('/'));
        expect($loaded['default_packages'])->toHaveCount(1);

        $this->getJson('/docs/api.json')
            ->assertOk()
            ->assertJsonPath('openapi', fn ($v) => is_string($v) && $v !== '');
    });
});
