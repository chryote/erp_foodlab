<?php

use App\Enums\ItemType;
use App\Models\Company;
use App\Models\Item;
use App\Models\ItemPacket;
use App\Models\Packet;
use App\Models\PacketVendor;
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
            'code' => '  itm-100%  ',
            'name' => '  Sugar   100%  Pure  ',
        ]);

        $createRes->assertCreated()
            ->assertJsonStructure([
                'data' => [
                    'id',
                    'company_id',
                    'code',
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
            ->assertJsonPath('data.code', 'itm-100%')
            ->assertJsonPath('data.name', 'Sugar 100% Pure')
            ->assertJsonPath('data.type', ItemType::Bahan->value)
            ->assertJsonPath('data.company.name', 'PT. Foodlab Alpha');

        expect(Cache::has(CpoService::CACHE_KEY))->toBeFalse();

        $sugarId = $createRes->json('data.id');
        $apple = Item::factory()->create([
            'company_owner_id' => $companyA->id,
            'company_id' => $companyA->id,
            'code' => 'ITM-APL_1',
            'name' => 'Apple_Organic',
            'type' => ItemType::Bahan,
        ]);
        $blender = Item::factory()->create([
            'company_owner_id' => $companyB->id,
            'company_id' => $companyB->id,
            'code' => 'ITM-BLD-02',
            'name' => 'Blender Lab',
            'type' => ItemType::Kelengkapan,
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

        $this->getJson('/api/v1/modules/cpo/items?filter[type]=Kelengkapan')
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

        $this->getJson('/api/v1/modules/cpo/items?filter[code]='.urlencode('100%'))
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $sugarId);

        $this->getJson('/api/v1/modules/cpo/items?code='.urlencode('APL_'))
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $apple->id);

        $this->getJson('/api/v1/modules/cpo/items?filter[code]=%20%20%20')
            ->assertOk()
            ->assertJsonCount(3, 'data');

        $this->getJson('/api/v1/modules/cpo/items?filter[search]='.urlencode('Apple_'))
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $apple->id);

        $this->getJson('/api/v1/modules/cpo/items?filter[search]=ITM-BLD')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $blender->id);

        $this->getJson('/api/v1/modules/cpo/items?search=Blender')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $blender->id);

        $this->getJson('/api/v1/modules/cpo/items?filter[search]=%20%20%20')
            ->assertOk()
            ->assertJsonCount(3, 'data');

        // Sort (including code, type & company_id) & pagination + per_page cap
        $this->getJson('/api/v1/modules/cpo/items?sort=-code')
            ->assertOk()
            ->assertJsonPath('data.0.id', $sugarId)
            ->assertJsonPath('data.1.id', $blender->id)
            ->assertJsonPath('data.2.id', $apple->id);

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
            ->assertJsonPath('data.code', 'itm-100%')
            ->assertJsonPath('data.name', 'Sugar 100% Pure')
            ->assertJsonPath('data.type', 'Bahan')
            ->assertJsonPath('data.company.name', 'PT. Foodlab Alpha');

        // PUT update keeping same (company_id, code, name) works and invalidates cache
        $this->putJson("/api/v1/modules/cpo/items/{$sugarId}", [
            'company_id' => $companyA->id,
            'code' => 'ITM-SUGAR-01',
            'name' => 'Sugar 100% Pure',
            'type' => ItemType::Kelengkapan->value,
        ])->assertOk()
            ->assertJsonPath('data.code', 'ITM-SUGAR-01')
            ->assertJsonPath('data.name', 'Sugar 100% Pure')
            ->assertJsonPath('data.type', 'Kelengkapan');

        expect(Cache::has(ItemService::CACHE_KEY_LIST))->toBeFalse();

        // Partial PATCH with empty payload keeps existing values (including code)
        $this->patchJson("/api/v1/modules/cpo/items/{$sugarId}", [])
            ->assertOk()
            ->assertJsonPath('data.company_id', $companyA->id)
            ->assertJsonPath('data.code', 'ITM-SUGAR-01')
            ->assertJsonPath('data.name', 'Sugar 100% Pure')
            ->assertJsonPath('data.type', 'Kelengkapan');

        // Partial PATCH updating name and type omits code and preserves existing code
        $this->patchJson("/api/v1/modules/cpo/items/{$sugarId}", [
            'name' => '  Cane   Sugar  ',
            'type' => ItemType::Bahan->value,
        ])->assertOk()
            ->assertJsonPath('data.company_id', $companyA->id)
            ->assertJsonPath('data.code', 'ITM-SUGAR-01')
            ->assertJsonPath('data.name', 'Cane Sugar')
            ->assertJsonPath('data.type', 'Bahan');

        // Partial PATCH updating code and then explicitly clearing code to null
        $this->patchJson("/api/v1/modules/cpo/items/{$sugarId}", [
            'code' => '  ITM-CANE-01  ',
        ])->assertOk()
            ->assertJsonPath('data.code', 'ITM-CANE-01');

        $this->patchJson("/api/v1/modules/cpo/items/{$sugarId}", [
            'code' => null,
        ])->assertOk()
            ->assertJsonPath('data.code', null);

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

        // Missing company_id, invalid ItemType, >50-char/non-string code, empty/whitespace-only & >150-char names fail with 422
        $this->postJson('/api/v1/modules/cpo/items', [
            'code' => str_repeat('C', 51),
            'name' => '   ',
            'type' => 'InvalidType',
        ])->assertUnprocessable()->assertJsonValidationErrors(['company_id', 'code', 'name', 'type']);

        $this->postJson('/api/v1/modules/cpo/items', [
            'company_id' => $companyA->id,
            'code' => ['not-a-string'],
            'name' => str_repeat('A', 151),
            'type' => 'Invalid',
        ])->assertUnprocessable()->assertJsonValidationErrors(['code', 'name', 'type']);

        // Multiple null/blank-normalized code items are allowed within the same company
        $this->postJson('/api/v1/modules/cpo/items', [
            'company_id' => $companyA->id,
            'code' => '   ',
            'name' => 'Null Code Item 1',
        ])->assertCreated()->assertJsonPath('data.code', null);

        $this->postJson('/api/v1/modules/cpo/items', [
            'company_id' => $companyA->id,
            'code' => null,
            'name' => 'Null Code Item 2',
        ])->assertCreated()->assertJsonPath('data.code', null);

        // Create active item with normalized spacing and explicit Kelengkapan type
        $first = $this->postJson('/api/v1/modules/cpo/items', [
            'company_id' => $companyA->id,
            'code' => '  ITM-001  ',
            'name' => '  Jackfruit   Kering  ',
            'type' => ItemType::Kelengkapan->value,
        ])->assertCreated()
            ->assertJsonPath('data.code', 'ITM-001')
            ->assertJsonPath('data.name', 'Jackfruit Kering')
            ->assertJsonPath('data.type', 'Kelengkapan');

        $firstId = $first->json('data.id');

        // Exact, case-variant, and whitespace-padded code duplicates within same company fail with 422
        $this->postJson('/api/v1/modules/cpo/items', [
            'company_id' => $companyA->id,
            'code' => 'ITM-001',
            'name' => 'Unique Name A',
        ])->assertUnprocessable()->assertJsonValidationErrors(['code']);

        $this->postJson('/api/v1/modules/cpo/items', [
            'company_id' => $companyA->id,
            'code' => 'itm-001',
            'name' => 'Unique Name B',
        ])->assertUnprocessable()->assertJsonValidationErrors(['code']);

        $this->postJson('/api/v1/modules/cpo/items', [
            'company_id' => $companyA->id,
            'code' => '  itm-001  ',
            'name' => 'Unique Name C',
        ])->assertUnprocessable()->assertJsonValidationErrors(['code']);

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

        // Same code and name in a DIFFERENT company is allowed
        $otherCompanyItem = $this->postJson('/api/v1/modules/cpo/items', [
            'company_id' => $companyB->id,
            'code' => 'ITM-001',
            'name' => 'Jackfruit Kering',
            'type' => ItemType::Bahan->value,
        ])->assertCreated()
            ->assertJsonPath('data.company_id', $companyB->id)
            ->assertJsonPath('data.code', 'ITM-001');

        expect($otherCompanyItem->json('data.id'))->not->toBe($firstId);

        // Updating another item in the same company to a colliding code or name (PUT & PATCH) fails with 422
        $second = $this->postJson('/api/v1/modules/cpo/items', [
            'company_id' => $companyA->id,
            'code' => 'ITM-002',
            'name' => 'Orange Peel',
        ])->assertCreated();

        $secondId = $second->json('data.id');

        $this->putJson("/api/v1/modules/cpo/items/{$secondId}", [
            'company_id' => $companyA->id,
            'code' => '  itm-001 ',
            'name' => 'Orange Peel',
        ])->assertUnprocessable()->assertJsonValidationErrors(['code']);

        $this->patchJson("/api/v1/modules/cpo/items/{$secondId}", [
            'code' => 'itm-001',
        ])->assertUnprocessable()->assertJsonValidationErrors(['code']);

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

        // Soft delete frees (company_id, code) and (company_id, name) for re-creation
        $this->deleteJson("/api/v1/modules/cpo/items/{$firstId}")->assertOk();

        $recreated = $this->postJson('/api/v1/modules/cpo/items', [
            'company_id' => $companyA->id,
            'code' => 'ITM-001',
            'name' => 'Jackfruit Kering',
            'type' => ItemType::Bahan->value,
        ])->assertCreated()
            ->assertJsonPath('data.code', 'ITM-001')
            ->assertJsonPath('data.name', 'Jackfruit Kering');

        expect($recreated->json('data.id'))->not->toBe($firstId);
    });

    it('exposes CPO ItemType enum options and accepts Sarpras on item creation', function () {
        $this->getJson('/api/v1/modules/cpo/enums')
            ->assertOk()
            ->assertJsonPath('data.item_type', ItemType::options());

        $company = Company::factory()->create();

        $this->postJson('/api/v1/modules/cpo/items', [
            'company_id' => $company->id,
            'code' => 'ITM-SRP-01',
            'name' => 'Booth Gerobak Usaha',
            'type' => ItemType::Sarpras->value,
        ])->assertCreated()
            ->assertJsonPath('data.type', ItemType::Sarpras->value);
    });

    it('supports exclusive PacketVendor ownership, XOR validation, owner switching edge cases, and vendor-scoped uniqueness', function () {
        $company = Company::factory()->create(['name' => 'PT. Owner Company']);
        $vendorA = PacketVendor::factory()->create(['name' => 'Vendor Alpha']);
        $vendorB = PacketVendor::factory()->create(['name' => 'Vendor Beta']);

        // Submitting both company_id and packet_vendor_id (even with identical numeric IDs) or neither fails with 422
        $this->postJson('/api/v1/modules/cpo/items', [
            'company_id' => $company->id,
            'packet_vendor_id' => $vendorA->id,
            'name' => 'Dual Owner Item',
        ])->assertUnprocessable()->assertJsonValidationErrors(['company_id', 'packet_vendor_id']);

        $this->postJson('/api/v1/modules/cpo/items', [
            'company_id' => null,
            'packet_vendor_id' => null,
            'name' => 'No Owner Item',
        ])->assertUnprocessable()->assertJsonValidationErrors(['company_id', 'packet_vendor_id']);

        // Soft-deleted packet_vendor_id fails with 422
        $deletedVendor = PacketVendor::factory()->create(['name' => 'Vendor Deleted']);
        $deletedVendor->delete();

        $this->postJson('/api/v1/modules/cpo/items', [
            'packet_vendor_id' => $deletedVendor->id,
            'name' => 'Deleted Vendor Item',
        ])->assertUnprocessable()->assertJsonValidationErrors(['packet_vendor_id']);

        // Create PacketVendor-owned item (company_id = null)
        $vendorRes = $this->postJson('/api/v1/modules/cpo/items', [
            'packet_vendor_id' => $vendorA->id,
            'code' => '  VND-001  ',
            'name' => '  Kemasan   Standing Pouch  ',
            'type' => ItemType::Kelengkapan->value,
        ])->assertCreated()
            ->assertJsonPath('data.company_id', null)
            ->assertJsonPath('data.packet_vendor_id', $vendorA->id)
            ->assertJsonPath('data.company', null)
            ->assertJsonPath('data.packet_vendor.id', $vendorA->id)
            ->assertJsonPath('data.code', 'VND-001')
            ->assertJsonPath('data.name', 'Kemasan Standing Pouch');

        $vendorItemId = $vendorRes->json('data.id');

        // Duplicate code/name within same PacketVendor fails with 422 (including case & whitespace variants)
        $this->postJson('/api/v1/modules/cpo/items', [
            'packet_vendor_id' => $vendorA->id,
            'code' => 'vnd-001',
            'name' => 'Kemasan Lain',
        ])->assertUnprocessable()->assertJsonValidationErrors(['code']);

        $this->postJson('/api/v1/modules/cpo/items', [
            'packet_vendor_id' => $vendorA->id,
            'name' => '  KEMASAN   STANDING POUCH ',
        ])->assertUnprocessable()->assertJsonValidationErrors(['name']);

        // Same code and name is allowed on Company AND on a different PacketVendor
        $companyItem = $this->postJson('/api/v1/modules/cpo/items', [
            'company_id' => $company->id,
            'code' => 'VND-001',
            'name' => 'Kemasan Standing Pouch',
        ])->assertCreated()
            ->assertJsonPath('data.company_id', $company->id)
            ->assertJsonPath('data.packet_vendor_id', null);

        $this->postJson('/api/v1/modules/cpo/items', [
            'packet_vendor_id' => $vendorB->id,
            'code' => 'VND-001',
            'name' => 'Kemasan Standing Pouch',
        ])->assertCreated()
            ->assertJsonPath('data.company_id', null)
            ->assertJsonPath('data.packet_vendor_id', $vendorB->id);

        // Filtering by packet_vendor_id & ?active_company=1 behavior
        $this->getJson("/api/v1/modules/cpo/items?filter[packet_vendor_id]={$vendorA->id}")
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $vendorItemId);

        $this->getJson("/api/v1/modules/cpo/items?packet_vendor_id={$vendorB->id}")
            ->assertOk()
            ->assertJsonCount(1, 'data');

        $this->getJson('/api/v1/modules/cpo/items?active_company=1', [
            'X-Active-Company-Id' => (string) $company->id,
        ])->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $companyItem->json('data.id'));

        // Clearing owner to null via PATCH without providing the other owner fails with 422
        $this->patchJson("/api/v1/modules/cpo/items/{$vendorItemId}", [
            'packet_vendor_id' => null,
        ])->assertUnprocessable()->assertJsonValidationErrors(['company_id', 'packet_vendor_id']);

        // Submitting both on PATCH fails with 422
        $this->patchJson("/api/v1/modules/cpo/items/{$vendorItemId}", [
            'company_id' => $company->id,
            'packet_vendor_id' => $vendorA->id,
        ])->assertUnprocessable()->assertJsonValidationErrors(['company_id', 'packet_vendor_id']);

        // Switching owner while active ItemPacket exists is blocked with 422
        $packet = Packet::factory()->create(['name' => 'Paket Vendor Lock']);
        $pivot = ItemPacket::factory()->forPacketVendor($vendorA)->create([
            'packet_id' => $packet->id,
            'item_id' => $vendorItemId,
            'quantity' => 2,
        ]);

        $this->patchJson("/api/v1/modules/cpo/items/{$vendorItemId}", [
            'company_id' => $company->id,
        ])->assertUnprocessable()->assertJsonValidationErrors(['company_id']);

        // After soft-deleting ItemPacket, switching PacketVendor -> Company (omitting packet_vendor_id) succeeds and clears packet_vendor_id
        $pivot->delete();
        $this->patchJson("/api/v1/modules/cpo/items/{$vendorItemId}", [
            'company_id' => $company->id,
            'code' => 'CMP-SWITCH-01',
            'name' => 'Switched Owner Item',
        ])->assertOk()
            ->assertJsonPath('data.company_id', $company->id)
            ->assertJsonPath('data.packet_vendor_id', null)
            ->assertJsonPath('data.packet_vendor', null);

        // Switching Company -> PacketVendor (with explicit company_id: null) clears company_id
        $this->patchJson("/api/v1/modules/cpo/items/{$vendorItemId}", [
            'company_id' => null,
            'packet_vendor_id' => $vendorA->id,
        ])->assertOk()
            ->assertJsonPath('data.company_id', null)
            ->assertJsonPath('data.packet_vendor_id', $vendorA->id)
            ->assertJsonPath('data.company', null);

        // Soft delete frees (packet_vendor_id, code) and (packet_vendor_id, name) for re-creation
        $this->deleteJson("/api/v1/modules/cpo/items/{$vendorItemId}")->assertOk();
        $this->postJson('/api/v1/modules/cpo/items', [
            'packet_vendor_id' => $vendorA->id,
            'code' => 'CMP-SWITCH-01',
            'name' => 'Switched Owner Item',
        ])->assertCreated();
    });
});
