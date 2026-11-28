<?php

use App\Http\Resources\PacketResource;
use App\Models\Company;
use App\Models\Item;
use App\Models\Packet;
use App\Modules\CPO\Services\CpoService;
use App\Modules\CPO\Services\ItemService;
use App\Modules\CPO\Services\PacketService;
use App\Support\IndexQuery;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

describe('Packet CPO module', function () {
    beforeEach(function () {
        Cache::flush();
        actingAsErpUser();
    });

    it('supports CRUD, QueryBuilder filtering/sorting/pagination, caching, and JsonResource structure', function () {
        $companyA = Company::factory()->create(['name' => 'PT. Foodlab Alpha']);
        $companyB = Company::factory()->create(['name' => 'PT. Foodlab Beta']);

        // Warm dependent caches to confirm writes invalidate CPO overview and Items caches too
        $this->getJson('/api/v1/modules/cpo')->assertOk();
        $this->getJson('/api/v1/modules/cpo/items')->assertOk();
        expect(Cache::has(CpoService::CACHE_KEY))->toBeTrue();
        expect(Cache::has(ItemService::CACHE_KEY_LIST))->toBeTrue();

        // Create via SavePacketRequest + DB::transaction (company-agnostic)
        $createRes = $this->postJson('/api/v1/modules/cpo/packets', [
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
            ->assertJsonMissingPath('data.items')
            ->assertJsonMissingPath('data.item_packets')
            ->assertJsonPath('data.name', 'Paket 100% Hemat');

        expect(Cache::has(CpoService::CACHE_KEY))->toBeFalse();
        expect(Cache::has(ItemService::CACHE_KEY_LIST))->toBeFalse();

        $paketHematId = $createRes->json('data.id');
        Packet::query()->whereKey($paketHematId)->update(['company_owner_id' => $companyA->id]);
        $paketA = Packet::factory()->create(['company_owner_id' => $companyA->id, 'name' => 'Paket Alpha_Lab']);
        $paketB = Packet::factory()->create(['company_owner_id' => $companyB->id, 'name' => 'Paket Beta']);

        // Unfiltered list uses defaultSort('name', 'id') and populates cache
        expect(Cache::has(PacketService::CACHE_KEY_LIST))->toBeFalse();

        $this->getJson('/api/v1/modules/cpo/packets')
            ->assertOk()
            ->assertJsonCount(3, 'data')
            ->assertJsonPath('meta.cache_key', PacketService::CACHE_KEY_LIST)
            ->assertJsonPath('data.0.id', $paketHematId)
            ->assertJsonPath('data.1.id', $paketA->id)
            ->assertJsonPath('data.2.id', $paketB->id);

        expect(Cache::has(PacketService::CACHE_KEY_LIST))->toBeTrue();

        // Tenant-scoped: ?active_company=1 filters packets to the active company owner
        $this->getJson('/api/v1/modules/cpo/packets?active_company=1', [
            'X-Active-Company-Id' => (string) $companyA->id,
        ])->assertOk()->assertJsonCount(2, 'data');

        $this->getJson('/api/v1/modules/cpo/packets?active_company=1', [
            'X-Active-Company-Id' => (string) $companyB->id,
        ])->assertOk()->assertJsonCount(1, 'data');

        // Filter by name and search with LIKE wildcard escaping & whitespace-only skipping
        $this->getJson('/api/v1/modules/cpo/packets?filter[name]='.urlencode('100%'))
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $paketHematId);

        $this->getJson('/api/v1/modules/cpo/packets?filter[search]='.urlencode('Alpha_'))
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $paketA->id);

        $this->getJson('/api/v1/modules/cpo/packets?search=Beta')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $paketB->id);

        $this->getJson('/api/v1/modules/cpo/packets?filter[search]=%20%20%20')
            ->assertOk()
            ->assertJsonCount(3, 'data');

        // Sort & pagination + per_page cap
        $this->getJson('/api/v1/modules/cpo/packets?sort=-name&per_page=2&page=1')
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('meta.total', 3)
            ->assertJsonPath('meta.per_page', 2)
            ->assertJsonPath('data.0.id', $paketB->id)
            ->assertJsonPath('data.1.id', $paketA->id);

        $this->getJson('/api/v1/modules/cpo/packets?sort=id&page=1&per_page=99999')
            ->assertOk()
            ->assertJsonPath('meta.per_page', IndexQuery::MAX_PER_PAGE)
            ->assertJsonPath('data.0.id', $paketHematId);

        // Show single packet
        $this->getJson("/api/v1/modules/cpo/packets/{$paketHematId}")
            ->assertOk()
            ->assertJsonPath('data.id', $paketHematId)
            ->assertJsonPath('data.name', 'Paket 100% Hemat');

        // PUT update keeping same name works and invalidates cache
        $this->putJson("/api/v1/modules/cpo/packets/{$paketHematId}", [
            'name' => 'Paket 100% Hemat',
        ])->assertOk()
            ->assertJsonPath('data.name', 'Paket 100% Hemat');

        expect(Cache::has(PacketService::CACHE_KEY_LIST))->toBeFalse();

        // PUT update changing name
        $this->putJson("/api/v1/modules/cpo/packets/{$paketHematId}", [
            'name' => 'Paket Reguler',
        ])->assertOk()
            ->assertJsonPath('data.name', 'Paket Reguler');

        // Partial PATCH with empty payload keeps existing values
        $this->patchJson("/api/v1/modules/cpo/packets/{$paketHematId}", [])
            ->assertOk()
            ->assertJsonPath('data.name', 'Paket Reguler');

        // Partial PATCH updating name
        $this->patchJson("/api/v1/modules/cpo/packets/{$paketHematId}", [
            'name' => '  Paket   Premium  ',
        ])->assertOk()
            ->assertJsonPath('data.name', 'Paket Premium');

        // Soft delete (cascading soft delete to item_packet activates when ItemPacket exists)
        $this->getJson('/api/v1/modules/cpo/packets')->assertOk();
        $this->getJson('/api/v1/modules/cpo/items')->assertOk();
        expect(Cache::has(PacketService::CACHE_KEY_LIST))->toBeTrue();
        expect(Cache::has(ItemService::CACHE_KEY_LIST))->toBeTrue();

        $this->deleteJson("/api/v1/modules/cpo/packets/{$paketHematId}")
            ->assertOk()
            ->assertJsonStructure(['message']);

        expect(Cache::has(PacketService::CACHE_KEY_LIST))->toBeFalse();
        expect(Cache::has(ItemService::CACHE_KEY_LIST))->toBeFalse();
        expect(Cache::has(CpoService::CACHE_KEY))->toBeFalse();
        $this->assertSoftDeleted('packets', ['id' => $paketHematId]);
        $this->getJson("/api/v1/modules/cpo/packets/{$paketHematId}")->assertNotFound();
    });

    it('enforces validation bounds, active-duplicate rejection (case & whitespace), and reuse after soft delete', function () {
        // Empty / whitespace-only & >150-char names fail with 422
        $this->postJson('/api/v1/modules/cpo/packets', [
            'name' => '   ',
        ])->assertUnprocessable()->assertJsonValidationErrors(['name']);

        $this->postJson('/api/v1/modules/cpo/packets', [
            'name' => str_repeat('P', 151),
        ])->assertUnprocessable()->assertJsonValidationErrors(['name']);

        // Create active packet with normalized spacing
        $first = $this->postJson('/api/v1/modules/cpo/packets', [
            'name' => '  Paket   Bundling  ',
        ])->assertCreated()
            ->assertJsonPath('data.name', 'Paket Bundling');

        $firstId = $first->json('data.id');

        // Exact, case-variant, and whitespace-padded duplicates fail with 422
        $this->postJson('/api/v1/modules/cpo/packets', [
            'name' => 'Paket Bundling',
        ])->assertUnprocessable()->assertJsonValidationErrors(['name']);

        $this->postJson('/api/v1/modules/cpo/packets', [
            'name' => 'paket bundling',
        ])->assertUnprocessable()->assertJsonValidationErrors(['name']);

        $this->postJson('/api/v1/modules/cpo/packets', [
            'name' => '  PAKET   BUNDLING ',
        ])->assertUnprocessable()->assertJsonValidationErrors(['name']);

        // Updating another packet to a colliding name (PUT & PATCH) fails with 422
        $second = $this->postJson('/api/v1/modules/cpo/packets', [
            'name' => 'Paket Ekonomi',
        ])->assertCreated();

        $secondId = $second->json('data.id');

        $this->putJson("/api/v1/modules/cpo/packets/{$secondId}", [
            'name' => 'paket bundling',
        ])->assertUnprocessable()->assertJsonValidationErrors(['name']);

        $this->patchJson("/api/v1/modules/cpo/packets/{$secondId}", [
            'name' => '  PAKET   BUNDLING  ',
        ])->assertUnprocessable()->assertJsonValidationErrors(['name']);

        // Soft delete frees the name for re-creation
        $this->deleteJson("/api/v1/modules/cpo/packets/{$firstId}")->assertOk();

        $recreated = $this->postJson('/api/v1/modules/cpo/packets', [
            'name' => 'Paket Bundling',
        ])->assertCreated()
            ->assertJsonPath('data.name', 'Paket Bundling');

        expect($recreated->json('data.id'))->not->toBe($firstId);
    });

    it('renders PacketResource conditional relations cleanly and serves OpenAPI docs', function () {
        $packet = Packet::factory()->create(['name' => 'Paket Resource Test']);
        $item = Item::factory()->create(['name' => 'Item Resource Test']);

        $unloaded = (new PacketResource($packet))->resolve(Request::create('/'));
        expect($unloaded)
            ->toHaveKeys(['id', 'name', 'created_at', 'updated_at', 'deleted_at'])
            ->not->toHaveKey('items')
            ->not->toHaveKey('item_packets');

        $packet->setRelation('items', collect([$item]));
        $loaded = (new PacketResource($packet))->resolve(Request::create('/'));
        expect($loaded['items'])->toHaveCount(1);
        expect($loaded['items'][0]['name'])->toBe('Item Resource Test');

        $this->getJson('/docs/api.json')
            ->assertOk()
            ->assertJsonPath('openapi', fn ($v) => is_string($v) && $v !== '');
    });
});
