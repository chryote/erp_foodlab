<?php

use App\Enums\ItemType;
use App\Http\Resources\ItemPacketResource;
use App\Models\Company;
use App\Models\Item;
use App\Models\ItemPacket;
use App\Models\Packet;
use App\Models\PacketVendor;
use App\Modules\CPO\Services\CpoService;
use App\Modules\CPO\Services\ItemPacketService;
use App\Modules\CPO\Services\ItemService;
use App\Modules\CPO\Services\PacketService;
use App\Support\IndexQuery;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

describe('ItemPacket CPO module', function () {
    beforeEach(function () {
        Cache::flush();
        actingAsErpUser();
    });

    it('supports CRUD, QueryBuilder filtering/sorting/includes/pagination, caching, and JsonResource structure', function () {
        $companyA = Company::factory()->create(['name' => 'PT. Foodlab Alpha']);
        $companyB = Company::factory()->create(['name' => 'PT. Foodlab Beta']);

        $packetA = Packet::factory()->create(['name' => 'Paket Alpha']);
        $packetB = Packet::factory()->create(['name' => 'Paket Beta']);
        $apple = Item::factory()->create([
            'company_id' => $companyA->id,
            'name' => 'Apple 100%',
            'type' => ItemType::Bahan,
        ]);
        $banana = Item::factory()->create([
            'company_id' => $companyA->id,
            'name' => 'Banana',
            'type' => ItemType::Bahan,
        ]);
        $mixer = Item::factory()->create([
            'company_id' => $companyB->id,
            'name' => 'Mixer Lab',
            'type' => ItemType::Kelengkapan,
        ]);

        // Warm dependent caches to verify writes invalidate CPO overview, Packets, and Items caches
        $this->getJson('/api/v1/modules/cpo')->assertOk();
        $this->getJson('/api/v1/modules/cpo/packets')->assertOk();
        $this->getJson('/api/v1/modules/cpo/items')->assertOk();
        expect(Cache::has(CpoService::CACHE_KEY))->toBeTrue();
        expect(Cache::has(PacketService::CACHE_KEY_LIST))->toBeTrue();
        expect(Cache::has(ItemService::CACHE_KEY_LIST))->toBeTrue();

        // Create via SaveItemPacketRequest + DB::transaction (default quantity = 1 when omitted)
        $createDefaultRes = $this->postJson('/api/v1/modules/cpo/item-packets', [
            'company_id' => $companyA->id,
            'packet_id' => $packetA->id,
            'item_id' => $apple->id,
        ]);

        $createDefaultRes->assertCreated()
            ->assertJsonStructure([
                'data' => [
                    'id',
                    'company_id',
                    'packet_id',
                    'item_id',
                    'quantity',
                    'company' => ['id', 'name'],
                    'packet' => ['id', 'name'],
                    'item' => ['id', 'company_id', 'name', 'type'],
                    'created_at',
                    'updated_at',
                    'deleted_at',
                ],
            ])
            ->assertJsonMissingPath('data.active_flag')
            ->assertJsonPath('data.company_id', $companyA->id)
            ->assertJsonPath('data.packet_id', $packetA->id)
            ->assertJsonPath('data.item_id', $apple->id)
            ->assertJsonPath('data.quantity', 1)
            ->assertJsonPath('data.company.name', 'PT. Foodlab Alpha')
            ->assertJsonPath('data.packet.name', 'Paket Alpha')
            ->assertJsonPath('data.item.name', 'Apple 100%');

        expect(Cache::has(CpoService::CACHE_KEY))->toBeFalse();
        expect(Cache::has(PacketService::CACHE_KEY_LIST))->toBeFalse();
        expect(Cache::has(ItemService::CACHE_KEY_LIST))->toBeFalse();

        $firstId = $createDefaultRes->json('data.id');

        // Create additional records with explicit quantities across companies
        $second = $this->postJson('/api/v1/modules/cpo/item-packets', [
            'company_id' => $companyA->id,
            'packet_id' => $packetA->id,
            'item_id' => $banana->id,
            'quantity' => 5,
        ])->assertCreated()->assertJsonPath('data.quantity', 5);

        $third = $this->postJson('/api/v1/modules/cpo/item-packets', [
            'company_id' => $companyB->id,
            'packet_id' => $packetB->id,
            'item_id' => $mixer->id,
            'quantity' => 10,
        ])->assertCreated()->assertJsonPath('data.quantity', 10);

        $secondId = $second->json('data.id');
        $thirdId = $third->json('data.id');

        // Unfiltered list uses defaultSort('id') and populates cache
        expect(Cache::has(ItemPacketService::CACHE_KEY_LIST))->toBeFalse();

        $this->getJson('/api/v1/modules/cpo/item-packets')
            ->assertOk()
            ->assertJsonCount(3, 'data')
            ->assertJsonPath('meta.cache_key', ItemPacketService::CACHE_KEY_LIST)
            ->assertJsonPath('data.0.id', $firstId)
            ->assertJsonPath('data.1.id', $secondId)
            ->assertJsonPath('data.2.id', $thirdId);

        expect(Cache::has(ItemPacketService::CACHE_KEY_LIST))->toBeTrue();

        // Tenant-scoped ?active_company=1 filters item-packets to the active company
        $this->getJson('/api/v1/modules/cpo/item-packets?active_company=1', [
            'X-Active-Company-Id' => (string) $companyA->id,
        ])->assertOk()->assertJsonCount(2, 'data');

        $this->getJson('/api/v1/modules/cpo/item-packets?active_company=1', [
            'X-Active-Company-Id' => (string) $companyB->id,
        ])->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $thirdId);

        // Filters: company_id, packet_id, item_id, item_type, search, quantity_min, quantity_max
        $this->getJson("/api/v1/modules/cpo/item-packets?filter[company_id]={$companyB->id}")
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $thirdId);

        $this->getJson("/api/v1/modules/cpo/item-packets?filter[packet_id]={$packetA->id}")
            ->assertOk()
            ->assertJsonCount(2, 'data');

        $this->getJson("/api/v1/modules/cpo/item-packets?filter[item_id]={$mixer->id}")
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $thirdId);

        $this->getJson('/api/v1/modules/cpo/item-packets?filter[item_type]=Kelengkapan')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $thirdId);

        $this->getJson('/api/v1/modules/cpo/item-packets?filter[search]='.urlencode('100%'))
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $firstId);

        $this->getJson('/api/v1/modules/cpo/item-packets?filter[search]=%20%20%20')
            ->assertOk()
            ->assertJsonCount(3, 'data');

        $this->getJson('/api/v1/modules/cpo/item-packets?filter[quantity_min]=5&filter[quantity_max]=10')
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.id', $secondId)
            ->assertJsonPath('data.1.id', $thirdId);

        $this->getJson('/api/v1/modules/cpo/item-packets?filter[quantity_min]=2&filter[quantity_max]=6')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $secondId);

        // Flat legacy query filter aliases work without polluting cache
        $this->getJson("/api/v1/modules/cpo/item-packets?packet_id={$packetB->id}")
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $thirdId);

        // Sorts & includes & pagination cap
        $this->getJson('/api/v1/modules/cpo/item-packets?sort=-quantity&per_page=2&page=1')
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('meta.total', 3)
            ->assertJsonPath('meta.per_page', 2)
            ->assertJsonPath('data.0.id', $thirdId)
            ->assertJsonPath('data.1.id', $secondId);

        $this->getJson('/api/v1/modules/cpo/item-packets?sort=id&page=1&per_page=99999')
            ->assertOk()
            ->assertJsonPath('meta.per_page', IndexQuery::MAX_PER_PAGE)
            ->assertJsonPath('data.0.id', $firstId);

        $this->getJson('/api/v1/modules/cpo/item-packets?include=packet')
            ->assertOk()
            ->assertJsonCount(3, 'data')
            ->assertJsonPath('data.0.packet.id', $packetA->id)
            ->assertJsonMissingPath('data.0.item')
            ->assertJsonMissingPath('data.0.company');

        $this->getJson('/api/v1/modules/cpo/item-packets?include=company,packet,item')
            ->assertOk()
            ->assertJsonPath('data.0.company.id', $companyA->id)
            ->assertJsonPath('data.0.packet.id', $packetA->id)
            ->assertJsonPath('data.0.item.id', $apple->id);

        // Show single item_packet
        $this->getJson("/api/v1/modules/cpo/item-packets/{$firstId}")
            ->assertOk()
            ->assertJsonPath('data.id', $firstId)
            ->assertJsonPath('data.company.name', 'PT. Foodlab Alpha')
            ->assertJsonPath('data.packet.name', 'Paket Alpha')
            ->assertJsonPath('data.item.name', 'Apple 100%');

        // PUT update keeping same (company_id, packet_id, item_id) and updating quantity
        $this->putJson("/api/v1/modules/cpo/item-packets/{$firstId}", [
            'company_id' => $companyA->id,
            'packet_id' => $packetA->id,
            'item_id' => $apple->id,
            'quantity' => 3,
        ])->assertOk()
            ->assertJsonPath('data.quantity', 3);

        expect(Cache::has(ItemPacketService::CACHE_KEY_LIST))->toBeFalse();

        // Partial PATCH with empty payload keeps existing values
        $this->patchJson("/api/v1/modules/cpo/item-packets/{$firstId}", [])
            ->assertOk()
            ->assertJsonPath('data.company_id', $companyA->id)
            ->assertJsonPath('data.packet_id', $packetA->id)
            ->assertJsonPath('data.item_id', $apple->id)
            ->assertJsonPath('data.quantity', 3);

        // Partial PATCH updating only quantity preserves company_id, packet_id, and item_id
        $this->patchJson("/api/v1/modules/cpo/item-packets/{$firstId}", [
            'quantity' => 7,
        ])->assertOk()
            ->assertJsonPath('data.company_id', $companyA->id)
            ->assertJsonPath('data.packet_id', $packetA->id)
            ->assertJsonPath('data.item_id', $apple->id)
            ->assertJsonPath('data.quantity', 7);

        // Partial PATCH updating only packet_id preserves company_id, item_id, and quantity
        $this->patchJson("/api/v1/modules/cpo/item-packets/{$firstId}", [
            'packet_id' => $packetB->id,
        ])->assertOk()
            ->assertJsonPath('data.company_id', $companyA->id)
            ->assertJsonPath('data.packet_id', $packetB->id)
            ->assertJsonPath('data.item_id', $apple->id)
            ->assertJsonPath('data.quantity', 7);

        // Soft delete forgets item_packet, packets, items, and cpo caches
        $this->getJson('/api/v1/modules/cpo')->assertOk();
        $this->getJson('/api/v1/modules/cpo/packets')->assertOk();
        $this->getJson('/api/v1/modules/cpo/items')->assertOk();
        $this->getJson('/api/v1/modules/cpo/item-packets')->assertOk();
        expect(Cache::has(ItemPacketService::CACHE_KEY_LIST))->toBeTrue();

        $this->deleteJson("/api/v1/modules/cpo/item-packets/{$firstId}")
            ->assertOk()
            ->assertJsonStructure(['message']);

        expect(Cache::has(ItemPacketService::CACHE_KEY_LIST))->toBeFalse();
        expect(Cache::has(PacketService::CACHE_KEY_LIST))->toBeFalse();
        expect(Cache::has(ItemService::CACHE_KEY_LIST))->toBeFalse();
        expect(Cache::has(CpoService::CACHE_KEY))->toBeFalse();
        $this->assertSoftDeleted('item_packet', ['id' => $firstId]);
        $this->getJson("/api/v1/modules/cpo/item-packets/{$firstId}")->assertNotFound();
    });

    it('enforces quantity bounds, cross-company item rejection, soft-deleted parent rejection, active-duplicate rejection, and reuse after soft delete', function () {
        $companyA = Company::factory()->create(['name' => 'PT. Pivot Alpha']);
        $companyB = Company::factory()->create(['name' => 'PT. Pivot Beta']);

        $packetA = Packet::factory()->create(['name' => 'Paket Satu']);
        $packetB = Packet::factory()->create(['name' => 'Paket Dua']);
        $itemA = Item::factory()->create(['company_id' => $companyA->id, 'name' => 'Item Satu']);
        $itemB = Item::factory()->create(['company_id' => $companyA->id, 'name' => 'Item Dua']);
        $itemOtherCompany = Item::factory()->create(['company_id' => $companyB->id, 'name' => 'Item Beta']);

        // Quantity bounds: 0, negative, and > 4294967295 fail with 422
        $this->postJson('/api/v1/modules/cpo/item-packets', [
            'company_id' => $companyA->id,
            'packet_id' => $packetA->id,
            'item_id' => $itemA->id,
            'quantity' => 0,
        ])->assertUnprocessable()->assertJsonValidationErrors(['quantity']);

        $this->postJson('/api/v1/modules/cpo/item-packets', [
            'company_id' => $companyA->id,
            'packet_id' => $packetA->id,
            'item_id' => $itemA->id,
            'quantity' => -5,
        ])->assertUnprocessable()->assertJsonValidationErrors(['quantity']);

        $this->postJson('/api/v1/modules/cpo/item-packets', [
            'company_id' => $companyA->id,
            'packet_id' => $packetA->id,
            'item_id' => $itemA->id,
            'quantity' => 4294967296,
        ])->assertUnprocessable()->assertJsonValidationErrors(['quantity']);

        // Boundary 4294967295 is valid
        $maxRes = $this->postJson('/api/v1/modules/cpo/item-packets', [
            'company_id' => $companyA->id,
            'packet_id' => $packetB->id,
            'item_id' => $itemB->id,
            'quantity' => 4294967295,
        ])->assertCreated();
        expect($maxRes->json('data.quantity'))->toBe(4294967295);
        $this->deleteJson('/api/v1/modules/cpo/item-packets/'.$maxRes->json('data.id'))->assertOk();

        // Cross-company item_id is rejected with 422
        $this->postJson('/api/v1/modules/cpo/item-packets', [
            'company_id' => $companyA->id,
            'packet_id' => $packetA->id,
            'item_id' => $itemOtherCompany->id,
            'quantity' => 2,
        ])->assertUnprocessable()->assertJsonValidationErrors(['item_id']);

        // Soft-deleted parent rejection
        $deletedCompany = Company::factory()->create(['name' => 'PT. Terhapus']);
        $deletedCompany->delete();
        $deletedPacket = Packet::factory()->create(['name' => 'Paket Terhapus']);
        $deletedPacket->delete();
        $deletedItem = Item::factory()->create(['company_id' => $companyA->id, 'name' => 'Item Terhapus']);
        $deletedItem->delete();

        $this->postJson('/api/v1/modules/cpo/item-packets', [
            'company_id' => $deletedCompany->id,
            'packet_id' => $packetA->id,
            'item_id' => $itemA->id,
            'quantity' => 1,
        ])->assertUnprocessable()->assertJsonValidationErrors(['company_id']);

        $this->postJson('/api/v1/modules/cpo/item-packets', [
            'company_id' => $companyA->id,
            'packet_id' => $deletedPacket->id,
            'item_id' => $itemA->id,
            'quantity' => 1,
        ])->assertUnprocessable()->assertJsonValidationErrors(['packet_id']);

        $this->postJson('/api/v1/modules/cpo/item-packets', [
            'company_id' => $companyA->id,
            'packet_id' => $packetA->id,
            'item_id' => $deletedItem->id,
            'quantity' => 1,
        ])->assertUnprocessable()->assertJsonValidationErrors(['item_id']);

        // Create active tuple (companyA, packetA, itemA)
        $first = $this->postJson('/api/v1/modules/cpo/item-packets', [
            'company_id' => $companyA->id,
            'packet_id' => $packetA->id,
            'item_id' => $itemA->id,
            'quantity' => 2,
        ])->assertCreated();
        $firstId = $first->json('data.id');

        // Duplicate (companyA, packetA, itemA) fails with 422
        $this->postJson('/api/v1/modules/cpo/item-packets', [
            'company_id' => $companyA->id,
            'packet_id' => $packetA->id,
            'item_id' => $itemA->id,
            'quantity' => 4,
        ])->assertUnprocessable()->assertJsonValidationErrors(['item_id']);

        // Same item in different packet succeeds
        $second = $this->postJson('/api/v1/modules/cpo/item-packets', [
            'company_id' => $companyA->id,
            'packet_id' => $packetB->id,
            'item_id' => $itemA->id,
            'quantity' => 3,
        ])->assertCreated();
        $secondId = $second->json('data.id');

        // Same packet in a different company (with that company's own item) succeeds
        $this->postJson('/api/v1/modules/cpo/item-packets', [
            'company_id' => $companyB->id,
            'packet_id' => $packetA->id,
            'item_id' => $itemOtherCompany->id,
            'quantity' => 3,
        ])->assertCreated();

        // Updating via PUT or partial PATCH into colliding (companyA, packetA, itemA) fails with 422
        $this->putJson("/api/v1/modules/cpo/item-packets/{$secondId}", [
            'company_id' => $companyA->id,
            'packet_id' => $packetA->id,
            'item_id' => $itemA->id,
            'quantity' => 3,
        ])->assertUnprocessable()->assertJsonValidationErrors(['item_id']);

        $this->patchJson("/api/v1/modules/cpo/item-packets/{$secondId}", [
            'packet_id' => $packetA->id,
        ])->assertUnprocessable()->assertJsonValidationErrors(['item_id']);

        // Partial PATCH changing company_id to companyB without matching item fails cross-company check
        $this->patchJson("/api/v1/modules/cpo/item-packets/{$secondId}", [
            'company_id' => $companyB->id,
        ])->assertUnprocessable()->assertJsonValidationErrors(['item_id']);

        // Soft-deleting (companyA, packetA, itemA) frees the tuple for re-creation
        $this->deleteJson("/api/v1/modules/cpo/item-packets/{$firstId}")->assertOk();

        $recreated = $this->postJson('/api/v1/modules/cpo/item-packets', [
            'company_id' => $companyA->id,
            'packet_id' => $packetA->id,
            'item_id' => $itemA->id,
            'quantity' => 9,
        ])->assertCreated()->assertJsonPath('data.quantity', 9);

        expect($recreated->json('data.id'))->not->toBe($firstId);
    });

    it('cascades parent packet, item, or company soft-delete to dependent CPO rows and clears caches', function () {
        $company = Company::factory()->create(['name' => 'PT. Cascade']);
        $packet = Packet::factory()->create(['name' => 'Paket Cascade']);
        $item = Item::factory()->create(['company_id' => $company->id, 'name' => 'Item Cascade']);
        $item2 = Item::factory()->create(['company_id' => $company->id, 'name' => 'Item Cascade 2']);
        $item3 = Item::factory()->create(['company_id' => $company->id, 'name' => 'Item Cascade 3']);

        $pivot1 = ItemPacket::factory()->create([
            'company_id' => $company->id,
            'packet_id' => $packet->id,
            'item_id' => $item->id,
            'quantity' => 2,
        ]);
        $pivot2 = ItemPacket::factory()->create([
            'company_id' => $company->id,
            'packet_id' => $packet->id,
            'item_id' => $item2->id,
            'quantity' => 4,
        ]);

        // Deleting item soft-deletes its pivot row
        $this->getJson('/api/v1/modules/cpo/item-packets')->assertOk()->assertJsonCount(2, 'data');
        expect(Cache::has(ItemPacketService::CACHE_KEY_LIST))->toBeTrue();

        $this->deleteJson("/api/v1/modules/cpo/items/{$item->id}")->assertOk();
        $this->assertSoftDeleted('item_packet', ['id' => $pivot1->id]);
        expect(Cache::has(ItemPacketService::CACHE_KEY_LIST))->toBeFalse();

        // Deleting packet soft-deletes remaining pivot row
        $this->getJson('/api/v1/modules/cpo/item-packets')->assertOk()->assertJsonCount(1, 'data');
        $this->deleteJson("/api/v1/modules/cpo/packets/{$packet->id}")->assertOk();
        $this->assertSoftDeleted('item_packet', ['id' => $pivot2->id]);
        expect(Cache::has(ItemPacketService::CACHE_KEY_LIST))->toBeFalse();

        // Deleting company soft-deletes remaining items and item_packets and clears CPO caches
        $packet2 = Packet::factory()->create(['name' => 'Paket Company Cascade']);
        $pivot3 = ItemPacket::factory()->create([
            'company_id' => $company->id,
            'packet_id' => $packet2->id,
            'item_id' => $item3->id,
            'quantity' => 5,
        ]);

        $this->getJson('/api/v1/modules/cpo/items')->assertOk();
        $this->getJson('/api/v1/modules/cpo/item-packets')->assertOk();
        expect(Cache::has(ItemService::CACHE_KEY_LIST))->toBeTrue();
        expect(Cache::has(ItemPacketService::CACHE_KEY_LIST))->toBeTrue();

        $this->deleteJson("/api/v1/modules/cfo/companies/{$company->id}")->assertOk();

        $this->assertSoftDeleted('items', ['id' => $item2->id]);
        $this->assertSoftDeleted('items', ['id' => $item3->id]);
        $this->assertSoftDeleted('item_packet', ['id' => $pivot3->id]);
        expect(Cache::has(ItemService::CACHE_KEY_LIST))->toBeFalse();
        expect(Cache::has(ItemPacketService::CACHE_KEY_LIST))->toBeFalse();
    });

    it('renders ItemPacketResource conditional relations cleanly and serves OpenAPI docs', function () {
        $company = Company::factory()->create(['name' => 'PT. Resource']);
        $packet = Packet::factory()->create(['name' => 'Paket Resource']);
        $item = Item::factory()->create(['company_id' => $company->id, 'name' => 'Item Resource']);
        $itemPacket = ItemPacket::factory()->create([
            'company_id' => $company->id,
            'packet_id' => $packet->id,
            'item_id' => $item->id,
            'quantity' => 3,
        ]);

        $unloaded = (new ItemPacketResource($itemPacket))->resolve(Request::create('/'));
        expect($unloaded)
            ->toHaveKeys(['id', 'company_id', 'packet_vendor_id', 'packet_id', 'item_id', 'quantity', 'created_at', 'updated_at', 'deleted_at'])
            ->not->toHaveKey('company')
            ->not->toHaveKey('packet_vendor')
            ->not->toHaveKey('packet')
            ->not->toHaveKey('item');

        $itemPacket->load(['company', 'packet', 'item']);
        $loaded = (new ItemPacketResource($itemPacket))->resolve(Request::create('/'));
        expect($loaded['company']['name'])->toBe('PT. Resource');
        expect($loaded['packet']['name'])->toBe('Paket Resource');
        expect($loaded['item']['name'])->toBe('Item Resource');

        $this->getJson('/docs/api.json')
            ->assertOk()
            ->assertJsonPath('openapi', fn ($v) => is_string($v) && $v !== '');
    });

    it('supports exclusive PacketVendor ownership on ItemPacket, enforces owner-matching Item validation, and cascades soft deletes', function () {
        $company = Company::factory()->create(['name' => 'PT. Pivot Owner']);
        $vendorA = PacketVendor::factory()->create(['name' => 'Vendor Pivot Alpha']);
        $vendorB = PacketVendor::factory()->create(['name' => 'Vendor Pivot Beta']);
        $packetA = Packet::factory()->create(['name' => 'Paket Exclusive A']);
        $packetB = Packet::factory()->create(['name' => 'Paket Exclusive B']);

        $companyItem = Item::factory()->create(['company_id' => $company->id, 'name' => 'Company Owned Item']);
        $vendorAItem = Item::factory()->forPacketVendor($vendorA)->create(['name' => 'Vendor A Owned Item']);
        $vendorBItem = Item::factory()->forPacketVendor($vendorB)->create(['name' => 'Vendor B Owned Item']);

        // Dual owner or missing owner on POST fails with 422
        $this->postJson('/api/v1/modules/cpo/item-packets', [
            'company_id' => $company->id,
            'packet_vendor_id' => $vendorA->id,
            'packet_id' => $packetA->id,
            'item_id' => $vendorAItem->id,
        ])->assertUnprocessable()->assertJsonValidationErrors(['company_id', 'packet_vendor_id']);

        $this->postJson('/api/v1/modules/cpo/item-packets', [
            'packet_id' => $packetA->id,
            'item_id' => $vendorAItem->id,
        ])->assertUnprocessable()->assertJsonValidationErrors(['company_id', 'packet_vendor_id']);

        // Cross-owner item mismatch fails with 422 (Company -> Vendor item, Vendor -> Company item, Vendor A -> Vendor B item)
        $this->postJson('/api/v1/modules/cpo/item-packets', [
            'company_id' => $company->id,
            'packet_id' => $packetA->id,
            'item_id' => $vendorAItem->id,
        ])->assertUnprocessable()->assertJsonValidationErrors(['item_id']);

        $this->postJson('/api/v1/modules/cpo/item-packets', [
            'packet_vendor_id' => $vendorA->id,
            'packet_id' => $packetA->id,
            'item_id' => $companyItem->id,
        ])->assertUnprocessable()->assertJsonValidationErrors(['item_id']);

        $this->postJson('/api/v1/modules/cpo/item-packets', [
            'packet_vendor_id' => $vendorA->id,
            'packet_id' => $packetA->id,
            'item_id' => $vendorBItem->id,
        ])->assertUnprocessable()->assertJsonValidationErrors(['item_id']);

        // Soft-deleted PacketVendor fails with 422
        $deletedVendor = PacketVendor::factory()->create(['name' => 'Vendor Terhapus']);
        $deletedVendor->delete();

        $this->postJson('/api/v1/modules/cpo/item-packets', [
            'packet_vendor_id' => $deletedVendor->id,
            'packet_id' => $packetA->id,
            'item_id' => $vendorAItem->id,
        ])->assertUnprocessable()->assertJsonValidationErrors(['packet_vendor_id']);

        // Create valid PacketVendor-owned ItemPacket
        $created = $this->postJson('/api/v1/modules/cpo/item-packets', [
            'packet_vendor_id' => $vendorA->id,
            'packet_id' => $packetA->id,
            'item_id' => $vendorAItem->id,
            'quantity' => 4,
        ])->assertCreated()
            ->assertJsonPath('data.company_id', null)
            ->assertJsonPath('data.packet_vendor_id', $vendorA->id)
            ->assertJsonPath('data.company', null)
            ->assertJsonPath('data.packet_vendor.id', $vendorA->id)
            ->assertJsonPath('data.quantity', 4);

        $vendorPivotId = $created->json('data.id');

        // Duplicate (packet_vendor_id, packet_id, item_id) fails with 422
        $this->postJson('/api/v1/modules/cpo/item-packets', [
            'packet_vendor_id' => $vendorA->id,
            'packet_id' => $packetA->id,
            'item_id' => $vendorAItem->id,
            'quantity' => 10,
        ])->assertUnprocessable()->assertJsonValidationErrors(['item_id']);

        // Filtering by packet_vendor_id & ?active_company=1 exclusion
        $this->getJson("/api/v1/modules/cpo/item-packets?filter[packet_vendor_id]={$vendorA->id}")
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $vendorPivotId);

        $this->getJson("/api/v1/modules/cpo/item-packets?packet_vendor_id={$vendorA->id}")
            ->assertOk()
            ->assertJsonCount(1, 'data');

        $this->getJson('/api/v1/modules/cpo/item-packets?active_company=1', [
            'X-Active-Company-Id' => (string) $company->id,
        ])->assertOk()->assertJsonCount(0, 'data');

        // Switching ItemPacket owner on PATCH without updating item_id fails cross-owner check
        $this->patchJson("/api/v1/modules/cpo/item-packets/{$vendorPivotId}", [
            'company_id' => $company->id,
        ])->assertUnprocessable()->assertJsonValidationErrors(['item_id']);

        // Switching ItemPacket owner together with matching item_id succeeds and clears packet_vendor_id
        $this->patchJson("/api/v1/modules/cpo/item-packets/{$vendorPivotId}", [
            'company_id' => $company->id,
            'packet_id' => $packetB->id,
            'item_id' => $companyItem->id,
        ])->assertOk()
            ->assertJsonPath('data.company_id', $company->id)
            ->assertJsonPath('data.packet_vendor_id', null)
            ->assertJsonPath('data.packet_vendor', null);

        // Switching back to PacketVendor + vendorAItem succeeds and clears company_id
        $this->patchJson("/api/v1/modules/cpo/item-packets/{$vendorPivotId}", [
            'packet_vendor_id' => $vendorA->id,
            'item_id' => $vendorAItem->id,
        ])->assertOk()
            ->assertJsonPath('data.company_id', null)
            ->assertJsonPath('data.packet_vendor_id', $vendorA->id)
            ->assertJsonPath('data.company', null);

        // Soft-deleting vendorPivot frees (packet_vendor_id, packet_id, item_id) for re-creation
        $this->deleteJson("/api/v1/modules/cpo/item-packets/{$vendorPivotId}")->assertOk();
        $recreated = $this->postJson('/api/v1/modules/cpo/item-packets', [
            'packet_vendor_id' => $vendorA->id,
            'packet_id' => $packetB->id,
            'item_id' => $vendorAItem->id,
            'quantity' => 6,
        ])->assertCreated();

        // Soft-deleting PacketVendor cascades to its items and item_packet rows
        $this->deleteJson("/api/v1/modules/cpo/packet-vendors/{$vendorA->id}")->assertOk();
        $this->assertSoftDeleted('items', ['id' => $vendorAItem->id]);
        $this->assertSoftDeleted('item_packet', ['id' => $recreated->json('data.id')]);
    });
});
