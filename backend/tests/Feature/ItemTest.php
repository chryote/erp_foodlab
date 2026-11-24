<?php

use App\Models\Company;
use App\Models\Item;
use App\Modules\CPO\Services\CpoService;
use App\Modules\CPO\Services\ItemService;
use App\Support\IndexQuery;
use Illuminate\Support\Facades\Cache;

describe('Item CPO module', function () {
    beforeEach(function () {
        Cache::flush();
        actingAsErpUser();
    });

    it('supports CRUD, QueryBuilder filtering/sorting/pagination, caching, and JsonResource structure', function () {
        $companyA = Company::factory()->create(['name' => 'PT. Foodlab Alpha']);
        $companyB = Company::factory()->create(['name' => 'PT. Foodlab Beta']);

        // Warm overview cache to confirm writes invalidate dependent CPO overview cache too
        $this->getJson('/api/v1/modules/cpo')->assertOk();
        expect(Cache::has(CpoService::CACHE_KEY))->toBeTrue();

        // Create via FormRequest + DB::transaction (company-agnostic)
        $createRes = $this->postJson('/api/v1/modules/cpo/items', [
            'name' => '  Sugar   100%  Pure  ',
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
            ->assertJsonPath('data.name', 'Sugar 100% Pure');

        expect(Cache::has(CpoService::CACHE_KEY))->toBeFalse();

        $sugarId = $createRes->json('data.id');
        $apple = Item::factory()->create(['name' => 'Apple_Organic']);
        $banana = Item::factory()->create(['name' => 'Banana']);

        // Unfiltered list uses defaultSort('name', 'id') and populates cache
        expect(Cache::has(ItemService::CACHE_KEY_LIST))->toBeFalse();

        $this->getJson('/api/v1/modules/cpo/items')
            ->assertOk()
            ->assertJsonCount(3, 'data')
            ->assertJsonPath('meta.cache_key', ItemService::CACHE_KEY_LIST)
            ->assertJsonPath('data.0.id', $apple->id)
            ->assertJsonPath('data.1.id', $banana->id)
            ->assertJsonPath('data.2.id', $sugarId);

        expect(Cache::has(ItemService::CACHE_KEY_LIST))->toBeTrue();

        // Company-agnostic: ?active_company=1 does not filter items out
        $this->getJson('/api/v1/modules/cpo/items?active_company=1', [
            'X-Active-Company-Id' => (string) $companyA->id,
        ])->assertOk()->assertJsonCount(3, 'data');

        $this->getJson('/api/v1/modules/cpo/items?active_company=1', [
            'X-Active-Company-Id' => (string) $companyB->id,
        ])->assertOk()->assertJsonCount(3, 'data');

        // Filter by name and search with LIKE wildcard escaping & whitespace-only skipping
        $this->getJson('/api/v1/modules/cpo/items?filter[name]='.urlencode('100%'))
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $sugarId);

        $this->getJson('/api/v1/modules/cpo/items?filter[search]='.urlencode('Apple_'))
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $apple->id);

        $this->getJson('/api/v1/modules/cpo/items?search=Banana')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $banana->id);

        $this->getJson('/api/v1/modules/cpo/items?filter[search]=%20%20%20')
            ->assertOk()
            ->assertJsonCount(3, 'data');

        // Sort & pagination + per_page cap
        $this->getJson('/api/v1/modules/cpo/items?sort=-name&per_page=2&page=1')
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('meta.total', 3)
            ->assertJsonPath('meta.per_page', 2)
            ->assertJsonPath('data.0.id', $sugarId)
            ->assertJsonPath('data.1.id', $banana->id);

        $this->getJson('/api/v1/modules/cpo/items?sort=id&page=1&per_page=99999')
            ->assertOk()
            ->assertJsonPath('meta.per_page', IndexQuery::MAX_PER_PAGE)
            ->assertJsonPath('data.0.id', $sugarId);

        // Show single item
        $this->getJson("/api/v1/modules/cpo/items/{$sugarId}")
            ->assertOk()
            ->assertJsonPath('data.id', $sugarId)
            ->assertJsonPath('data.name', 'Sugar 100% Pure');

        // PUT update keeping same name works and invalidates cache
        $this->putJson("/api/v1/modules/cpo/items/{$sugarId}", [
            'name' => 'Sugar 100% Pure',
        ])->assertOk()
            ->assertJsonPath('data.name', 'Sugar 100% Pure');

        expect(Cache::has(ItemService::CACHE_KEY_LIST))->toBeFalse();

        // PUT update changing name
        $this->putJson("/api/v1/modules/cpo/items/{$sugarId}", [
            'name' => 'Brown Sugar',
        ])->assertOk()
            ->assertJsonPath('data.name', 'Brown Sugar');

        // Partial PATCH with empty payload keeps existing values
        $this->patchJson("/api/v1/modules/cpo/items/{$sugarId}", [])
            ->assertOk()
            ->assertJsonPath('data.name', 'Brown Sugar');

        // Partial PATCH updating name
        $this->patchJson("/api/v1/modules/cpo/items/{$sugarId}", [
            'name' => '  Cane   Sugar  ',
        ])->assertOk()
            ->assertJsonPath('data.name', 'Cane Sugar');

        // Soft delete (cascading soft delete to item_packet deferred until ItemPacket exists)
        $this->getJson('/api/v1/modules/cpo/items')->assertOk();
        expect(Cache::has(ItemService::CACHE_KEY_LIST))->toBeTrue();

        $this->deleteJson("/api/v1/modules/cpo/items/{$sugarId}")
            ->assertOk()
            ->assertJsonStructure(['message']);

        expect(Cache::has(ItemService::CACHE_KEY_LIST))->toBeFalse();
        $this->assertSoftDeleted('items', ['id' => $sugarId]);
        $this->getJson("/api/v1/modules/cpo/items/{$sugarId}")->assertNotFound();
    });

    it('enforces validation bounds, active-duplicate rejection (case & whitespace), and reuse after soft delete', function () {
        // Empty / whitespace-only & >150-char names fail with 422
        $this->postJson('/api/v1/modules/cpo/items', [
            'name' => '   ',
        ])->assertUnprocessable()->assertJsonValidationErrors(['name']);

        $this->postJson('/api/v1/modules/cpo/items', [
            'name' => str_repeat('A', 151),
        ])->assertUnprocessable()->assertJsonValidationErrors(['name']);

        // Create active item with normalized spacing
        $first = $this->postJson('/api/v1/modules/cpo/items', [
            'name' => '  Jackfruit   Kering  ',
        ])->assertCreated()
            ->assertJsonPath('data.name', 'Jackfruit Kering');

        $firstId = $first->json('data.id');

        // Exact, case-variant, and whitespace-padded duplicates fail with 422
        $this->postJson('/api/v1/modules/cpo/items', [
            'name' => 'Jackfruit Kering',
        ])->assertUnprocessable()->assertJsonValidationErrors(['name']);

        $this->postJson('/api/v1/modules/cpo/items', [
            'name' => 'jackfruit kering',
        ])->assertUnprocessable()->assertJsonValidationErrors(['name']);

        $this->postJson('/api/v1/modules/cpo/items', [
            'name' => '  JACKFRUIT   KERING ',
        ])->assertUnprocessable()->assertJsonValidationErrors(['name']);

        // Updating another item to a colliding name (PUT & PATCH) fails with 422
        $second = $this->postJson('/api/v1/modules/cpo/items', [
            'name' => 'Orange Peel',
        ])->assertCreated();

        $secondId = $second->json('data.id');

        $this->putJson("/api/v1/modules/cpo/items/{$secondId}", [
            'name' => 'jackfruit kering',
        ])->assertUnprocessable()->assertJsonValidationErrors(['name']);

        $this->patchJson("/api/v1/modules/cpo/items/{$secondId}", [
            'name' => '  JACKFRUIT   KERING  ',
        ])->assertUnprocessable()->assertJsonValidationErrors(['name']);

        // Soft delete frees the name for re-creation
        $this->deleteJson("/api/v1/modules/cpo/items/{$firstId}")->assertOk();

        $recreated = $this->postJson('/api/v1/modules/cpo/items', [
            'name' => 'Jackfruit Kering',
        ])->assertCreated()
            ->assertJsonPath('data.name', 'Jackfruit Kering');

        expect($recreated->json('data.id'))->not->toBe($firstId);
    });
});
