<?php

use App\Enums\ItemType;
use App\Models\Company;
use App\Models\Item;
use App\Models\ItemPacket;
use App\Models\Packet;
use App\Modules\CPO\Services\CpoService;
use App\Modules\CPO\Services\ItemPacketService;
use App\Modules\CPO\Services\ItemService;
use App\Support\IndexQuery;
use Illuminate\Support\Facades\Cache;

describe('Item CPO module', function () {
    beforeEach(function () {
        Cache::flush();
        actingAsErpUser();
    });

    it('supports CRUD, QueryBuilder filtering/sorting/includes/pagination, caching, and JsonResource structure', function () {
        $companyA = Company::factory()->create(['name' => 'PT. Foodlab Alpha']);
        $companyB = Company::factory()->create(['name' => 'PT. Foodlab Beta']);

        // Warm overview cache to confirm writes invalidate dependent CPO overview cache too
        $this->getJson('/api/v1/modules/cpo')->assertOk();
        expect(Cache::has(CpoService::CACHE_KEY))->toBeTrue();

        // Create via FormRequest + DB::transaction (default type = Bahan when omitted)
        $createRes = $this->postJson('/api/v1/modules/cpo/items', [
            'company_id' => $companyA->id,
            'name' => '  Sugar   100%  Pure  ',
        ]);

        $createRes->assertCreated()
            ->assertJsonStructure([
                'data' => [
                    'id',
                    'company_id',
                    'name',
                    'type',
                    'company' => ['id', 'name'],
                    'created_at',
                    'updated_at',
                    'deleted_at',
                ],
            ])
            ->assertJsonMissingPath('data.active_flag')
            ->assertJsonPath('data.company_id', $companyA->id)
            ->assertJsonPath('data.name', 'Sugar 100% Pure')
            ->assertJsonPath('data.type', ItemType::Bahan->value)
            ->assertJsonPath('data.company.name', 'PT. Foodlab Alpha');

        expect(Cache::has(CpoService::CACHE_KEY))->toBeFalse();

        $sugarId = $createRes->json('data.id');
        $apple = Item::factory()->create([
            'company_id' => $companyA->id,
            'name' => 'Apple_Organic',
            'type' => ItemType::Bahan,
        ]);
        $blender = Item::factory()->create([
            'company_id' => $companyB->id,
            'name' => 'Blender Lab',
            'type' => ItemType::Peralatan,
        ]);

        // Unfiltered list uses defaultSort('name', 'id') and populates cache
        expect(Cache::has(ItemService::CACHE_KEY_LIST))->toBeFalse();

        $this->getJson('/api/v1/modules/cpo/items')
            ->assertOk()
            ->assertJsonCount(3, 'data')
            ->assertJsonPath('meta.cache_key', ItemService::CACHE_KEY_LIST)
            ->assertJsonPath('data.0.id', $apple->id)
            ->assertJsonPath('data.1.id', $blender->id)
            ->assertJsonPath('data.2.id', $sugarId);

        expect(Cache::has(ItemService::CACHE_KEY_LIST))->toBeTrue();

        // Tenant-scoped ?active_company=1 filters items to the active company
        $this->getJson('/api/v1/modules/cpo/items?active_company=1', [
            'X-Active-Company-Id' => (string) $companyA->id,
        ])->assertOk()->assertJsonCount(2, 'data');

        $this->getJson('/api/v1/modules/cpo/items?active_company=1', [
            'X-Active-Company-Id' => (string) $companyB->id,
        ])->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $blender->id);

        // Filter by company_id, type, name, and search with LIKE wildcard escaping & whitespace-only skipping
        $this->getJson("/api/v1/modules/cpo/items?filter[company_id]={$companyB->id}")
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $blender->id);

        $this->getJson('/api/v1/modules/cpo/items?filter[type]=Peralatan')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $blender->id);

        $this->getJson('/api/v1/modules/cpo/items?type=Bahan')
            ->assertOk()
            ->assertJsonCount(2, 'data');

        $this->getJson('/api/v1/modules/cpo/items?filter[name]='.urlencode('100%'))
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $sugarId);

        $this->getJson('/api/v1/modules/cpo/items?filter[search]='.urlencode('Apple_'))
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $apple->id);

        $this->getJson('/api/v1/modules/cpo/items?search=Blender')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $blender->id);

        $this->getJson('/api/v1/modules/cpo/items?filter[search]=%20%20%20')
            ->assertOk()
            ->assertJsonCount(3, 'data');

        // Sort (including type & company_id) & pagination + per_page cap
        $this->getJson('/api/v1/modules/cpo/items?sort=-type,-name&per_page=2&page=1')
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('meta.total', 3)
            ->assertJsonPath('meta.per_page', 2)
            ->assertJsonPath('data.0.id', $blender->id)
            ->assertJsonPath('data.1.id', $sugarId);

        $this->getJson('/api/v1/modules/cpo/items?sort=id&page=1&per_page=99999')
            ->assertOk()
            ->assertJsonPath('meta.per_page', IndexQuery::MAX_PER_PAGE)
            ->assertJsonPath('data.0.id', $sugarId);

        // Includes (company, itemPackets, packets)
        $packet = Packet::factory()->create(['name' => 'Paket Uji']);
        $pivot = ItemPacket::factory()->create([
            'company_id' => $companyA->id,
            'packet_id' => $packet->id,
            'item_id' => $sugarId,
            'quantity' => 3,
        ]);

        $this->getJson("/api/v1/modules/cpo/items?filter[company_id]={$companyA->id}&include=company,itemPackets,packets")
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.1.id', $sugarId)
            ->assertJsonPath('data.1.company.id', $companyA->id)
            ->assertJsonPath('data.1.item_packets.0.id', $pivot->id)
            ->assertJsonPath('data.1.packets.0.id', $packet->id);

        // Show single item
        $this->getJson("/api/v1/modules/cpo/items/{$sugarId}")
            ->assertOk()
            ->assertJsonPath('data.id', $sugarId)
            ->assertJsonPath('data.company_id', $companyA->id)
            ->assertJsonPath('data.name', 'Sugar 100% Pure')
            ->assertJsonPath('data.type', 'Bahan')
            ->assertJsonPath('data.company.name', 'PT. Foodlab Alpha');

        // PUT update keeping same (company_id, name) works and invalidates cache
        $this->putJson("/api/v1/modules/cpo/items/{$sugarId}", [
            'company_id' => $companyA->id,
            'name' => 'Sugar 100% Pure',
            'type' => ItemType::Peralatan->value,
        ])->assertOk()
            ->assertJsonPath('data.name', 'Sugar 100% Pure')
            ->assertJsonPath('data.type', 'Peralatan');

        expect(Cache::has(ItemService::CACHE_KEY_LIST))->toBeFalse();

        // Partial PATCH with empty payload keeps existing values
        $this->patchJson("/api/v1/modules/cpo/items/{$sugarId}", [])
            ->assertOk()
            ->assertJsonPath('data.company_id', $companyA->id)
            ->assertJsonPath('data.name', 'Sugar 100% Pure')
            ->assertJsonPath('data.type', 'Peralatan');

        // Partial PATCH updating name and type preserves company_id
        $this->patchJson("/api/v1/modules/cpo/items/{$sugarId}", [
            'name' => '  Cane   Sugar  ',
            'type' => ItemType::Bahan->value,
        ])->assertOk()
            ->assertJsonPath('data.company_id', $companyA->id)
            ->assertJsonPath('data.name', 'Cane Sugar')
            ->assertJsonPath('data.type', 'Bahan');

        // Soft delete cascades to active item_packet rows and clears caches
        $this->getJson('/api/v1/modules/cpo/items')->assertOk();
        $this->getJson('/api/v1/modules/cpo/item-packets')->assertOk();
        expect(Cache::has(ItemService::CACHE_KEY_LIST))->toBeTrue();
        expect(Cache::has(ItemPacketService::CACHE_KEY_LIST))->toBeTrue();

        $this->deleteJson("/api/v1/modules/cpo/items/{$sugarId}")
            ->assertOk()
            ->assertJsonStructure(['message']);

        expect(Cache::has(ItemService::CACHE_KEY_LIST))->toBeFalse();
        expect(Cache::has(ItemPacketService::CACHE_KEY_LIST))->toBeFalse();
        $this->assertSoftDeleted('items', ['id' => $sugarId]);
        $this->assertSoftDeleted('item_packet', ['id' => $pivot->id]);
        $this->getJson("/api/v1/modules/cpo/items/{$sugarId}")->assertNotFound();
    });

    it('enforces validation bounds, ItemType enum, tenant uniqueness, company reassignment lock, and reuse after soft delete', function () {
        $companyA = Company::factory()->create(['name' => 'PT. Item Alpha']);
        $companyB = Company::factory()->create(['name' => 'PT. Item Beta']);

        // Missing company_id, invalid ItemType, empty/whitespace-only & >150-char names fail with 422
        $this->postJson('/api/v1/modules/cpo/items', [
            'name' => '   ',
            'type' => 'InvalidType',
        ])->assertUnprocessable()->assertJsonValidationErrors(['company_id', 'name', 'type']);

        $this->postJson('/api/v1/modules/cpo/items', [
            'company_id' => $companyA->id,
            'name' => str_repeat('A', 151),
            'type' => 'Invalid',
        ])->assertUnprocessable()->assertJsonValidationErrors(['name', 'type']);

        // Create active item with normalized spacing and explicit Peralatan type
        $first = $this->postJson('/api/v1/modules/cpo/items', [
            'company_id' => $companyA->id,
            'name' => '  Jackfruit   Kering  ',
            'type' => ItemType::Peralatan->value,
        ])->assertCreated()
            ->assertJsonPath('data.name', 'Jackfruit Kering')
            ->assertJsonPath('data.type', 'Peralatan');

        $firstId = $first->json('data.id');

        // Exact, case-variant, and whitespace-padded duplicates within same company fail with 422
        $this->postJson('/api/v1/modules/cpo/items', [
            'company_id' => $companyA->id,
            'name' => 'Jackfruit Kering',
        ])->assertUnprocessable()->assertJsonValidationErrors(['name']);

        $this->postJson('/api/v1/modules/cpo/items', [
            'company_id' => $companyA->id,
            'name' => 'jackfruit kering',
        ])->assertUnprocessable()->assertJsonValidationErrors(['name']);

        $this->postJson('/api/v1/modules/cpo/items', [
            'company_id' => $companyA->id,
            'name' => '  JACKFRUIT   KERING ',
        ])->assertUnprocessable()->assertJsonValidationErrors(['name']);

        // Same name in a DIFFERENT company is allowed
        $otherCompanyItem = $this->postJson('/api/v1/modules/cpo/items', [
            'company_id' => $companyB->id,
            'name' => 'Jackfruit Kering',
            'type' => ItemType::Bahan->value,
        ])->assertCreated()
            ->assertJsonPath('data.company_id', $companyB->id);

        expect($otherCompanyItem->json('data.id'))->not->toBe($firstId);

        // Updating another item in the same company to a colliding name (PUT & PATCH) fails with 422
        $second = $this->postJson('/api/v1/modules/cpo/items', [
            'company_id' => $companyA->id,
            'name' => 'Orange Peel',
        ])->assertCreated();

        $secondId = $second->json('data.id');

        $this->putJson("/api/v1/modules/cpo/items/{$secondId}", [
            'company_id' => $companyA->id,
            'name' => 'jackfruit kering',
        ])->assertUnprocessable()->assertJsonValidationErrors(['name']);

        $this->patchJson("/api/v1/modules/cpo/items/{$secondId}", [
            'name' => '  JACKFRUIT   KERING  ',
        ])->assertUnprocessable()->assertJsonValidationErrors(['name']);

        // Reassigning Item.company_id while active ItemPacket exists is rejected with 422
        $packet = Packet::factory()->create(['name' => 'Paket Lock']);
        $pivot = ItemPacket::factory()->create([
            'company_id' => $companyA->id,
            'packet_id' => $packet->id,
            'item_id' => $secondId,
            'quantity' => 2,
        ]);

        $this->patchJson("/api/v1/modules/cpo/items/{$secondId}", [
            'company_id' => $companyB->id,
        ])->assertUnprocessable()->assertJsonValidationErrors(['company_id']);

        // Once the active ItemPacket is soft-deleted, company_id reassignment succeeds
        $pivot->delete();
        $this->patchJson("/api/v1/modules/cpo/items/{$secondId}", [
            'company_id' => $companyB->id,
        ])->assertOk()->assertJsonPath('data.company_id', $companyB->id);

        // Soft delete frees (company_id, name) for re-creation
        $this->deleteJson("/api/v1/modules/cpo/items/{$firstId}")->assertOk();

        $recreated = $this->postJson('/api/v1/modules/cpo/items', [
            'company_id' => $companyA->id,
            'name' => 'Jackfruit Kering',
            'type' => ItemType::Bahan->value,
        ])->assertCreated()
            ->assertJsonPath('data.name', 'Jackfruit Kering');

        expect($recreated->json('data.id'))->not->toBe($firstId);
    });
});
