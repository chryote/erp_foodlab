<?php

use App\Http\Resources\PacketVendorResource;
use App\Models\PacketVendor;
use App\Modules\CPO\Services\CpoService;
use App\Modules\CPO\Services\PacketVendorService;
use App\Support\IndexQuery;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

describe('PacketVendor CPO module', function () {
    beforeEach(function () {
        Cache::flush();
        actingAsErpUser();
    });

    it('supports CRUD, QueryBuilder filtering/sorting/pagination, caching, and JsonResource structure', function () {
        // Warm dependent CPO overview cache to confirm writes invalidate it
        $this->getJson('/api/v1/modules/cpo')->assertOk();
        expect(Cache::has(CpoService::CACHE_KEY))->toBeTrue();

        // Create via SavePacketVendorRequest + DB::transaction (company-agnostic)
        $createRes = $this->postJson('/api/v1/modules/cpo/packet-vendors', [
            'name' => '  Vendor   100%  Hemat  ',
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
            ->assertJsonPath('data.name', 'Vendor 100% Hemat');

        expect(Cache::has(CpoService::CACHE_KEY))->toBeFalse();

        $vendorHematId = $createRes->json('data.id');
        $vendorA = PacketVendor::factory()->create(['name' => 'Vendor Alpha_Lab']);
        $vendorB = PacketVendor::factory()->create(['name' => 'Vendor Beta']);

        // Unfiltered list uses defaultSort('name', 'id') and populates cache
        expect(Cache::has(PacketVendorService::CACHE_KEY_LIST))->toBeFalse();

        $this->getJson('/api/v1/modules/cpo/packet-vendors')
            ->assertOk()
            ->assertJsonCount(3, 'data')
            ->assertJsonPath('meta.cache_key', PacketVendorService::CACHE_KEY_LIST)
            ->assertJsonPath('data.0.id', $vendorHematId)
            ->assertJsonPath('data.1.id', $vendorA->id)
            ->assertJsonPath('data.2.id', $vendorB->id);

        expect(Cache::has(PacketVendorService::CACHE_KEY_LIST))->toBeTrue();

        // Filter by name and search with LIKE wildcard escaping & whitespace-only skipping
        $this->getJson('/api/v1/modules/cpo/packet-vendors?filter[name]='.urlencode('100%'))
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $vendorHematId);

        $this->getJson('/api/v1/modules/cpo/packet-vendors?filter[search]='.urlencode('Alpha_'))
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $vendorA->id);

        $this->getJson('/api/v1/modules/cpo/packet-vendors?search=Beta')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $vendorB->id);

        $this->getJson('/api/v1/modules/cpo/packet-vendors?filter[name]=%20%20%20')
            ->assertOk()
            ->assertJsonCount(3, 'data');

        // Sort & pagination + per_page cap
        $this->getJson('/api/v1/modules/cpo/packet-vendors?sort=-name&per_page=2&page=1')
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('meta.total', 3)
            ->assertJsonPath('meta.per_page', 2)
            ->assertJsonPath('data.0.id', $vendorB->id)
            ->assertJsonPath('data.1.id', $vendorA->id);

        $this->getJson('/api/v1/modules/cpo/packet-vendors?sort=id&page=1&per_page=99999')
            ->assertOk()
            ->assertJsonPath('meta.per_page', IndexQuery::MAX_PER_PAGE)
            ->assertJsonPath('data.0.id', $vendorHematId);

        $this->getJson('/api/v1/modules/cpo/packet-vendors?sort=-created_at')
            ->assertOk()
            ->assertJsonCount(3, 'data');

        // Show single packet vendor
        $this->getJson("/api/v1/modules/cpo/packet-vendors/{$vendorHematId}")
            ->assertOk()
            ->assertJsonPath('data.id', $vendorHematId)
            ->assertJsonPath('data.name', 'Vendor 100% Hemat');

        // PUT update keeping same name works and invalidates cache
        $this->putJson("/api/v1/modules/cpo/packet-vendors/{$vendorHematId}", [
            'name' => 'Vendor 100% Hemat',
        ])->assertOk()
            ->assertJsonPath('data.name', 'Vendor 100% Hemat');

        expect(Cache::has(PacketVendorService::CACHE_KEY_LIST))->toBeFalse();

        // PUT update changing name
        $this->putJson("/api/v1/modules/cpo/packet-vendors/{$vendorHematId}", [
            'name' => 'Vendor Reguler',
        ])->assertOk()
            ->assertJsonPath('data.name', 'Vendor Reguler');

        // Partial PATCH with empty payload keeps existing values
        $this->patchJson("/api/v1/modules/cpo/packet-vendors/{$vendorHematId}", [])
            ->assertOk()
            ->assertJsonPath('data.name', 'Vendor Reguler');

        // Partial PATCH updating name
        $this->patchJson("/api/v1/modules/cpo/packet-vendors/{$vendorHematId}", [
            'name' => '  Vendor   Premium  ',
        ])->assertOk()
            ->assertJsonPath('data.name', 'Vendor Premium');

        // Soft delete (cascading soft delete to default_packages & ingredients activates when those models exist)
        $this->getJson('/api/v1/modules/cpo/packet-vendors')->assertOk();
        $this->getJson('/api/v1/modules/cpo')->assertOk();
        expect(Cache::has(PacketVendorService::CACHE_KEY_LIST))->toBeTrue();
        expect(Cache::has(CpoService::CACHE_KEY))->toBeTrue();

        $this->deleteJson("/api/v1/modules/cpo/packet-vendors/{$vendorHematId}")
            ->assertOk()
            ->assertJsonStructure(['message']);

        expect(Cache::has(PacketVendorService::CACHE_KEY_LIST))->toBeFalse();
        expect(Cache::has(CpoService::CACHE_KEY))->toBeFalse();
        $this->assertSoftDeleted('packet_vendors', ['id' => $vendorHematId]);
        $this->getJson("/api/v1/modules/cpo/packet-vendors/{$vendorHematId}")->assertNotFound();
    });

    it('enforces validation bounds, active-duplicate rejection (case & whitespace), and reuse after soft delete', function () {
        // Missing, empty / whitespace-only & >150-char names fail with 422
        $this->postJson('/api/v1/modules/cpo/packet-vendors', [])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['name']);

        $this->postJson('/api/v1/modules/cpo/packet-vendors', [
            'name' => '   ',
        ])->assertUnprocessable()->assertJsonValidationErrors(['name']);

        $this->postJson('/api/v1/modules/cpo/packet-vendors', [
            'name' => str_repeat('V', 151),
        ])->assertUnprocessable()->assertJsonValidationErrors(['name']);

        // Create active packet vendor with normalized spacing
        $first = $this->postJson('/api/v1/modules/cpo/packet-vendors', [
            'name' => '  Vendor   Bundling  ',
        ])->assertCreated()
            ->assertJsonPath('data.name', 'Vendor Bundling');

        $firstId = $first->json('data.id');

        // Exact, case-variant, and whitespace-padded duplicates fail with 422
        $this->postJson('/api/v1/modules/cpo/packet-vendors', [
            'name' => 'Vendor Bundling',
        ])->assertUnprocessable()->assertJsonValidationErrors(['name']);

        $this->postJson('/api/v1/modules/cpo/packet-vendors', [
            'name' => 'vendor bundling',
        ])->assertUnprocessable()->assertJsonValidationErrors(['name']);

        $this->postJson('/api/v1/modules/cpo/packet-vendors', [
            'name' => '  VENDOR   BUNDLING ',
        ])->assertUnprocessable()->assertJsonValidationErrors(['name']);

        // Updating another packet vendor to a colliding name (PUT & PATCH) fails with 422
        $second = $this->postJson('/api/v1/modules/cpo/packet-vendors', [
            'name' => 'Vendor Ekonomi',
        ])->assertCreated();

        $secondId = $second->json('data.id');

        $this->putJson("/api/v1/modules/cpo/packet-vendors/{$secondId}", [
            'name' => 'vendor bundling',
        ])->assertUnprocessable()->assertJsonValidationErrors(['name']);

        $this->patchJson("/api/v1/modules/cpo/packet-vendors/{$secondId}", [
            'name' => '  VENDOR   BUNDLING  ',
        ])->assertUnprocessable()->assertJsonValidationErrors(['name']);

        // Soft delete frees the name for re-creation
        $this->deleteJson("/api/v1/modules/cpo/packet-vendors/{$firstId}")->assertOk();

        $recreated = $this->postJson('/api/v1/modules/cpo/packet-vendors', [
            'name' => 'Vendor Bundling',
        ])->assertCreated()
            ->assertJsonPath('data.name', 'Vendor Bundling');

        expect($recreated->json('data.id'))->not->toBe($firstId);
    });

    it('renders PacketVendorResource conditional relations cleanly and serves OpenAPI docs', function () {
        $packetVendor = PacketVendor::factory()->create(['name' => 'Vendor Nama Resource Test']);

        $unloaded = (new PacketVendorResource($packetVendor))->resolve(Request::create('/'));
        expect($unloaded)
            ->toHaveKeys(['id', 'name', 'created_at', 'updated_at', 'deleted_at'])
            ->not->toHaveKey('default_packages');

        $packetVendor->setRelation('defaultPackages', collect([['id' => 1, 'name' => 'Sample Package']]));
        $loaded = (new PacketVendorResource($packetVendor))->resolve(Request::create('/'));
        expect($loaded['default_packages'])->toHaveCount(1);

        $this->getJson('/docs/api.json')
            ->assertOk()
            ->assertJsonPath('openapi', fn ($v) => is_string($v) && $v !== '');
    });
});
