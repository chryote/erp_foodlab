<?php

use App\Http\Resources\ItemPacketResource;
use App\Models\Company;
use App\Models\Item;
use App\Models\ItemPacket;
use App\Models\Packet;
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
        $apple = Item::factory()->create(['name' => 'Apple']);
        $banana = Item::factory()->create(['name' => 'Banana']);
        $orange = Item::factory()->create(['name' => 'Orange']);

        // Warm dependent caches to verify writes invalidate CPO overview, Packets, and Items caches
        $this->getJson('/api/v1/modules/cpo')->assertOk();
        $this->getJson('/api/v1/modules/cpo/packets')->assertOk();
        $this->getJson('/api/v1/modules/cpo/items')->assertOk();
        expect(Cache::has(CpoService::CACHE_KEY))->toBeTrue();
        expect(Cache::has(PacketService::CACHE_KEY_LIST))->toBeTrue();
        expect(Cache::has(ItemService::CACHE_KEY_LIST))->toBeTrue();

        // Create via SaveItemPacketRequest + DB::transaction (default quantity = 1 when omitted)
        $createDefaultRes = $this->postJson('/api/v1/modules/cpo/item-packets', [
            'packet_id' => $packetA->id,
            'item_id' => $apple->id,
        ]);

        $createDefaultRes->assertCreated()
            ->assertJsonStructure([
                'data' => [
                    'id',
                    'packet_id',
                    'item_id',
                    'quantity',
                    'packet' => ['id', 'name'],
                    'item' => ['id', 'name'],
                    'created_at',
                    'updated_at',
                    'deleted_at',
                ],
            ])
            ->assertJsonMissingPath('data.active_flag')
            ->assertJsonMissingPath('data.company_id')
            ->assertJsonPath('data.packet_id', $packetA->id)
            ->assertJsonPath('data.item_id', $apple->id)
            ->assertJsonPath('data.quantity', 1)
            ->assertJsonPath('data.packet.name', 'Paket Alpha')
            ->assertJsonPath('data.item.name', 'Apple');

        expect(Cache::has(CpoService::CACHE_KEY))->toBeFalse();
        expect(Cache::has(PacketService::CACHE_KEY_LIST))->toBeFalse();
        expect(Cache::has(ItemService::CACHE_KEY_LIST))->toBeFalse();

        $firstId = $createDefaultRes->json('data.id');

        // Create additional records with explicit quantities
        $second = $this->postJson('/api/v1/modules/cpo/item-packets', [
            'packet_id' => $packetA->id,
            'item_id' => $banana->id,
            'quantity' => 5,
        ])->assertCreated()->assertJsonPath('data.quantity', 5);

        $third = $this->postJson('/api/v1/modules/cpo/item-packets', [
            'packet_id' => $packetB->id,
            'item_id' => $orange->id,
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

        // Company-agnostic: ?active_company=1 does not filter item-packets out
        $this->getJson('/api/v1/modules/cpo/item-packets?active_company=1', [
            'X-Active-Company-Id' => (string) $companyA->id,
        ])->assertOk()->assertJsonCount(3, 'data');

        $this->getJson('/api/v1/modules/cpo/item-packets?active_company=1', [
            'X-Active-Company-Id' => (string) $companyB->id,
        ])->assertOk()->assertJsonCount(3, 'data');

        // Filters: packet_id, item_id, quantity_min, quantity_max
        $this->getJson("/api/v1/modules/cpo/item-packets?filter[packet_id]={$packetA->id}")
            ->assertOk()
            ->assertJsonCount(2, 'data');

        $this->getJson("/api/v1/modules/cpo/item-packets?filter[item_id]={$orange->id}")
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $thirdId);

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
            ->assertJsonMissingPath('data.0.item');

        $this->getJson('/api/v1/modules/cpo/item-packets?include=packet,item')
            ->assertOk()
            ->assertJsonPath('data.0.packet.id', $packetA->id)
            ->assertJsonPath('data.0.item.id', $apple->id);

        // Show single item_packet
        $this->getJson("/api/v1/modules/cpo/item-packets/{$firstId}")
            ->assertOk()
            ->assertJsonPath('data.id', $firstId)
            ->assertJsonPath('data.packet.name', 'Paket Alpha')
            ->assertJsonPath('data.item.name', 'Apple');

        // PUT update keeping same (packet_id, item_id) and updating quantity
        $this->putJson("/api/v1/modules/cpo/item-packets/{$firstId}", [
            'packet_id' => $packetA->id,
            'item_id' => $apple->id,
            'quantity' => 3,
        ])->assertOk()
            ->assertJsonPath('data.quantity', 3);

        expect(Cache::has(ItemPacketService::CACHE_KEY_LIST))->toBeFalse();

        // Partial PATCH with empty payload keeps existing values
        $this->patchJson("/api/v1/modules/cpo/item-packets/{$firstId}", [])
            ->assertOk()
            ->assertJsonPath('data.packet_id', $packetA->id)
            ->assertJsonPath('data.item_id', $apple->id)
            ->assertJsonPath('data.quantity', 3);

        // Partial PATCH updating only quantity preserves packet_id and item_id
        $this->patchJson("/api/v1/modules/cpo/item-packets/{$firstId}", [
            'quantity' => 7,
        ])->assertOk()
            ->assertJsonPath('data.packet_id', $packetA->id)
            ->assertJsonPath('data.item_id', $apple->id)
            ->assertJsonPath('data.quantity', 7);

        // Partial PATCH updating only packet_id preserves item_id and quantity
        $this->patchJson("/api/v1/modules/cpo/item-packets/{$firstId}", [
            'packet_id' => $packetB->id,
        ])->assertOk()
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

    it('enforces quantity bounds, soft-deleted parent rejection, active-duplicate rejection, and reuse after soft delete', function () {
        $packetA = Packet::factory()->create(['name' => 'Paket Satu']);
        $packetB = Packet::factory()->create(['name' => 'Paket Dua']);
        $itemA = Item::factory()->create(['name' => 'Item Satu']);
        $itemB = Item::factory()->create(['name' => 'Item Dua']);

        // Quantity bounds: 0, negative, non-integer, and > 4294967295 fail with 422
        $this->postJson('/api/v1/modules/cpo/item-packets', [
            'packet_id' => $packetA->id,
            'item_id' => $itemA->id,
            'quantity' => 0,
        ])->assertUnprocessable()->assertJsonValidationErrors(['quantity']);

        $this->postJson('/api/v1/modules/cpo/item-packets', [
            'packet_id' => $packetA->id,
            'item_id' => $itemA->id,
            'quantity' => -5,
        ])->assertUnprocessable()->assertJsonValidationErrors(['quantity']);

        $this->postJson('/api/v1/modules/cpo/item-packets', [
            'packet_id' => $packetA->id,
            'item_id' => $itemA->id,
            'quantity' => 4294967296,
        ])->assertUnprocessable()->assertJsonValidationErrors(['quantity']);

        // Boundary 4294967295 is valid
        $maxRes = $this->postJson('/api/v1/modules/cpo/item-packets', [
            'packet_id' => $packetB->id,
            'item_id' => $itemB->id,
            'quantity' => 4294967295,
        ])->assertCreated();
        expect($maxRes->json('data.quantity'))->toBe(4294967295);
        $this->deleteJson('/api/v1/modules/cpo/item-packets/'.$maxRes->json('data.id'))->assertOk();

        // Soft-deleted parent rejection
        $deletedPacket = Packet::factory()->create(['name' => 'Paket Terhapus']);
        $deletedPacket->delete();
        $deletedItem = Item::factory()->create(['name' => 'Item Terhapus']);
        $deletedItem->delete();

        $this->postJson('/api/v1/modules/cpo/item-packets', [
            'packet_id' => $deletedPacket->id,
            'item_id' => $itemA->id,
            'quantity' => 1,
        ])->assertUnprocessable()->assertJsonValidationErrors(['packet_id']);

        $this->postJson('/api/v1/modules/cpo/item-packets', [
            'packet_id' => $packetA->id,
            'item_id' => $deletedItem->id,
            'quantity' => 1,
        ])->assertUnprocessable()->assertJsonValidationErrors(['item_id']);

        // Create active pair (packetA, itemA)
        $first = $this->postJson('/api/v1/modules/cpo/item-packets', [
            'packet_id' => $packetA->id,
            'item_id' => $itemA->id,
            'quantity' => 2,
        ])->assertCreated();
        $firstId = $first->json('data.id');

        // Duplicate (packetA, itemA) fails with 422
        $this->postJson('/api/v1/modules/cpo/item-packets', [
            'packet_id' => $packetA->id,
            'item_id' => $itemA->id,
            'quantity' => 4,
        ])->assertUnprocessable()->assertJsonValidationErrors(['item_id']);

        // Same item in different packet succeeds
        $second = $this->postJson('/api/v1/modules/cpo/item-packets', [
            'packet_id' => $packetB->id,
            'item_id' => $itemA->id,
            'quantity' => 3,
        ])->assertCreated();
        $secondId = $second->json('data.id');

        // Updating via PUT or partial PATCH into colliding (packetA, itemA) fails with 422
        $this->putJson("/api/v1/modules/cpo/item-packets/{$secondId}", [
            'packet_id' => $packetA->id,
            'item_id' => $itemA->id,
            'quantity' => 3,
        ])->assertUnprocessable()->assertJsonValidationErrors(['item_id']);

        $this->patchJson("/api/v1/modules/cpo/item-packets/{$secondId}", [
            'packet_id' => $packetA->id,
        ])->assertUnprocessable()->assertJsonValidationErrors(['item_id']);

        // Soft-deleting (packetA, itemA) frees the pair for re-creation
        $this->deleteJson("/api/v1/modules/cpo/item-packets/{$firstId}")->assertOk();

        $recreated = $this->postJson('/api/v1/modules/cpo/item-packets', [
            'packet_id' => $packetA->id,
            'item_id' => $itemA->id,
            'quantity' => 9,
        ])->assertCreated()->assertJsonPath('data.quantity', 9);

        expect($recreated->json('data.id'))->not->toBe($firstId);
    });

    it('cascades parent packet or item soft-delete to item_packet rows and clears caches', function () {
        $packet = Packet::factory()->create(['name' => 'Paket Cascade']);
        $item = Item::factory()->create(['name' => 'Item Cascade']);
        $item2 = Item::factory()->create(['name' => 'Item Cascade 2']);

        $pivot1 = ItemPacket::factory()->create([
            'packet_id' => $packet->id,
            'item_id' => $item->id,
            'quantity' => 2,
        ]);
        $pivot2 = ItemPacket::factory()->create([
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
    });

    it('renders ItemPacketResource conditional relations cleanly and serves OpenAPI docs', function () {
        $packet = Packet::factory()->create(['name' => 'Paket Resource']);
        $item = Item::factory()->create(['name' => 'Item Resource']);
        $itemPacket = ItemPacket::factory()->create([
            'packet_id' => $packet->id,
            'item_id' => $item->id,
            'quantity' => 3,
        ]);

        $unloaded = (new ItemPacketResource($itemPacket))->resolve(Request::create('/'));
        expect($unloaded)
            ->toHaveKeys(['id', 'packet_id', 'item_id', 'quantity', 'created_at', 'updated_at', 'deleted_at'])
            ->not->toHaveKey('packet')
            ->not->toHaveKey('item');

        $itemPacket->load(['packet', 'item']);
        $loaded = (new ItemPacketResource($itemPacket))->resolve(Request::create('/'));
        expect($loaded['packet']['name'])->toBe('Paket Resource');
        expect($loaded['item']['name'])->toBe('Item Resource');

        $this->getJson('/docs/api.json')
            ->assertOk()
            ->assertJsonPath('openapi', fn ($v) => is_string($v) && $v !== '');
    });
});
