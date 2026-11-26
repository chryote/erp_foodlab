<?php

use App\Http\Resources\IngredientResource;
use App\Models\Company;
use App\Models\DefaultPackage;
use App\Models\Ingredient;
use App\Models\Item;
use App\Models\ItemPacket;
use App\Models\PacketCategory;
use App\Models\PacketName;
use App\Models\PacketVendor;
use App\Modules\CPO\Services\CpoService;
use App\Modules\CPO\Services\DefaultPackageService;
use App\Modules\CPO\Services\IngredientService;
use App\Modules\CPO\Services\ItemService;
use App\Support\IndexQuery;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

describe('Ingredient CPO module', function () {
    beforeEach(function () {
        Cache::flush();
        actingAsErpUser();
    });

    it('supports CRUD, QueryBuilder filtering/sorting/includes/pagination, caching, and JsonResource structure', function () {
        $company = Company::factory()->create(['name' => 'PT. Ingredient Foodlab']);
        $defaultPackageA = DefaultPackage::factory()->create(['brand_name' => 'Paket Default A']);
        $defaultPackageB = DefaultPackage::factory()->create(['brand_name' => 'Paket Default B']);
        $itemA = Item::factory()->create(['company_id' => $company->id, 'name' => 'Tepung Terigu']);
        $itemB = Item::factory()->create(['company_id' => $company->id, 'name' => 'Gula Pasir']);

        // Warm dependent caches to confirm writes invalidate them
        $this->getJson('/api/v1/modules/cpo')->assertOk();
        $this->getJson('/api/v1/modules/cpo/default-packages')->assertOk();
        $this->getJson('/api/v1/modules/cpo/items')->assertOk();
        expect(Cache::has(CpoService::CACHE_KEY))->toBeTrue();
        expect(Cache::has(DefaultPackageService::CACHE_KEY_LIST))->toBeTrue();
        expect(Cache::has(ItemService::CACHE_KEY_LIST))->toBeTrue();

        // Create via SaveIngredientRequest + DB::transaction (omitted price defaults to 0.00)
        $createDefaultPriceRes = $this->postJson('/api/v1/modules/cpo/ingredients', [
            'default_package_id' => $defaultPackageA->id,
            'item_id' => $itemA->id,
        ]);

        $createDefaultPriceRes->assertCreated()
            ->assertJsonStructure([
                'data' => [
                    'id',
                    'default_package_id',
                    'item_id',
                    'price',
                    'default_package' => ['id', 'brand_name'],
                    'item' => ['id', 'name'],
                    'created_at',
                    'updated_at',
                    'deleted_at',
                ],
            ])
            ->assertJsonMissingPath('data.active_flag')
            ->assertJsonPath('data.default_package_id', $defaultPackageA->id)
            ->assertJsonPath('data.item_id', $itemA->id)
            ->assertJsonPath('data.price', 0)
            ->assertJsonPath('data.default_package.brand_name', 'Paket Default A')
            ->assertJsonPath('data.item.name', 'Tepung Terigu');

        expect(Cache::has(CpoService::CACHE_KEY))->toBeFalse();
        expect(Cache::has(DefaultPackageService::CACHE_KEY_LIST))->toBeFalse();
        expect(Cache::has(ItemService::CACHE_KEY_LIST))->toBeFalse();

        $firstId = $createDefaultPriceRes->json('data.id');

        $secondRes = $this->postJson('/api/v1/modules/cpo/ingredients', [
            'default_package_id' => $defaultPackageA->id,
            'item_id' => $itemB->id,
            'price' => 12500.50,
        ])->assertCreated();

        $thirdRes = $this->postJson('/api/v1/modules/cpo/ingredients', [
            'default_package_id' => $defaultPackageB->id,
            'item_id' => $itemB->id,
            'price' => 27500.00,
        ])->assertCreated();

        $secondId = $secondRes->json('data.id');
        $thirdId = $thirdRes->json('data.id');

        // Unfiltered list uses defaultSort('id') and populates cache
        expect(Cache::has(IngredientService::CACHE_KEY_LIST))->toBeFalse();

        $this->getJson('/api/v1/modules/cpo/ingredients')
            ->assertOk()
            ->assertJsonCount(3, 'data')
            ->assertJsonPath('meta.cache_key', IngredientService::CACHE_KEY_LIST)
            ->assertJsonPath('data.0.id', $firstId)
            ->assertJsonPath('data.1.id', $secondId)
            ->assertJsonPath('data.2.id', $thirdId);

        expect(Cache::has(IngredientService::CACHE_KEY_LIST))->toBeTrue();

        // Filters: default_package_id, item_id, min_price, max_price, legacy flat aliases, invalid numeric safety
        $this->getJson("/api/v1/modules/cpo/ingredients?filter[default_package_id]={$defaultPackageA->id}")
            ->assertOk()
            ->assertJsonCount(2, 'data');

        $this->getJson("/api/v1/modules/cpo/ingredients?default_package_id={$defaultPackageB->id}")
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $thirdId);

        $this->getJson("/api/v1/modules/cpo/ingredients?filter[item_id]={$itemA->id}")
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $firstId);

        $this->getJson("/api/v1/modules/cpo/ingredients?item_id={$itemB->id}")
            ->assertOk()
            ->assertJsonCount(2, 'data');

        $this->getJson('/api/v1/modules/cpo/ingredients?filter[min_price]=12000&filter[max_price]=20000')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $secondId);

        $this->getJson('/api/v1/modules/cpo/ingredients?filter[min_price]=not-a-number&filter[max_price]=%20%20')
            ->assertOk()
            ->assertJsonCount(3, 'data');

        // Sorts, pagination cap, and explicit includes
        $this->getJson('/api/v1/modules/cpo/ingredients?sort=-price&per_page=2&page=1')
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('meta.total', 3)
            ->assertJsonPath('meta.per_page', 2)
            ->assertJsonPath('data.0.id', $thirdId)
            ->assertJsonPath('data.1.id', $secondId);

        $this->getJson('/api/v1/modules/cpo/ingredients?sort=-default_package_id,-item_id')
            ->assertOk()
            ->assertJsonPath('data.0.id', $thirdId);

        $this->getJson('/api/v1/modules/cpo/ingredients?sort=-created_at')
            ->assertOk()
            ->assertJsonCount(3, 'data');

        $this->getJson('/api/v1/modules/cpo/ingredients?sort=id&page=1&per_page=99999')
            ->assertOk()
            ->assertJsonPath('meta.per_page', IndexQuery::MAX_PER_PAGE)
            ->assertJsonPath('data.0.id', $firstId);

        $this->getJson('/api/v1/modules/cpo/ingredients?include=item')
            ->assertOk()
            ->assertJsonPath('data.0.item.name', 'Tepung Terigu')
            ->assertJsonMissingPath('data.0.default_package');

        // Show single ingredient
        $this->getJson("/api/v1/modules/cpo/ingredients/{$firstId}")
            ->assertOk()
            ->assertJsonPath('data.id', $firstId)
            ->assertJsonPath('data.default_package.brand_name', 'Paket Default A')
            ->assertJsonPath('data.item.name', 'Tepung Terigu');

        // PUT update keeping same pair and updating price
        $this->putJson("/api/v1/modules/cpo/ingredients/{$firstId}", [
            'default_package_id' => $defaultPackageA->id,
            'item_id' => $itemA->id,
            'price' => 18500.25,
        ])->assertOk()
            ->assertJsonPath('data.price', 18500.25);

        expect(Cache::has(IngredientService::CACHE_KEY_LIST))->toBeFalse();

        // Partial PATCH with empty payload preserves existing values
        $this->patchJson("/api/v1/modules/cpo/ingredients/{$firstId}", [])
            ->assertOk()
            ->assertJsonPath('data.default_package_id', $defaultPackageA->id)
            ->assertJsonPath('data.item_id', $itemA->id)
            ->assertJsonPath('data.price', 18500.25);

        // Partial PATCH updating only price preserves FKs
        $this->patchJson("/api/v1/modules/cpo/ingredients/{$firstId}", [
            'price' => 21000.75,
        ])->assertOk()
            ->assertJsonPath('data.default_package_id', $defaultPackageA->id)
            ->assertJsonPath('data.item_id', $itemA->id)
            ->assertJsonPath('data.price', 21000.75);

        // Soft delete clears caches and hides record
        $this->getJson('/api/v1/modules/cpo')->assertOk();
        $this->getJson('/api/v1/modules/cpo/ingredients')->assertOk();
        expect(Cache::has(IngredientService::CACHE_KEY_LIST))->toBeTrue();
        expect(Cache::has(CpoService::CACHE_KEY))->toBeTrue();

        $this->deleteJson("/api/v1/modules/cpo/ingredients/{$firstId}")
            ->assertOk()
            ->assertJsonStructure(['message']);

        expect(Cache::has(IngredientService::CACHE_KEY_LIST))->toBeFalse();
        expect(Cache::has(CpoService::CACHE_KEY))->toBeFalse();
        $this->assertSoftDeleted('ingredients', ['id' => $firstId]);
        $this->getJson("/api/v1/modules/cpo/ingredients/{$firstId}")->assertNotFound();
    });

    it('enforces decimal bounds, inactive/missing parent rejection, active-duplicate rejection, and re-create after soft delete', function () {
        $defaultPackage = DefaultPackage::factory()->create();
        $defaultPackageAlt = DefaultPackage::factory()->create();
        $item = Item::factory()->create();
        $itemAlt = Item::factory()->create();

        // Missing required fields fail with 422
        $this->postJson('/api/v1/modules/cpo/ingredients', [])
            ->assertUnprocessable()
            ->assertJsonValidationErrors([
                'default_package_id',
                'item_id',
            ]);

        // Price bounds: negative, > 2 decimal places, > max decimal(18,2), null, non-numeric fail with 422
        foreach ([-1, 100.123, '99999999999999999.99', null, 'invalid-price'] as $invalidPrice) {
            $this->postJson('/api/v1/modules/cpo/ingredients', [
                'default_package_id' => $defaultPackage->id,
                'item_id' => $item->id,
                'price' => $invalidPrice,
            ])->assertUnprocessable()->assertJsonValidationErrors(['price']);
        }

        // Missing / soft-deleted parents fail with 422
        $this->postJson('/api/v1/modules/cpo/ingredients', [
            'default_package_id' => 999999,
            'item_id' => 999999,
            'price' => 5000,
        ])->assertUnprocessable()->assertJsonValidationErrors([
            'default_package_id',
            'item_id',
        ]);

        $deletedPackage = DefaultPackage::factory()->create();
        $deletedPackage->delete();
        $deletedItem = Item::factory()->create();
        $deletedItem->delete();

        $this->postJson('/api/v1/modules/cpo/ingredients', [
            'default_package_id' => $deletedPackage->id,
            'item_id' => $deletedItem->id,
            'price' => 5000,
        ])->assertUnprocessable()->assertJsonValidationErrors([
            'default_package_id',
            'item_id',
        ]);

        // Create active ingredient
        $first = $this->postJson('/api/v1/modules/cpo/ingredients', [
            'default_package_id' => $defaultPackage->id,
            'item_id' => $item->id,
            'price' => 15000.00,
        ])->assertCreated();

        $firstId = $first->json('data.id');

        // Duplicate (default_package_id, item_id) fails with 422
        $this->postJson('/api/v1/modules/cpo/ingredients', [
            'default_package_id' => $defaultPackage->id,
            'item_id' => $item->id,
            'price' => 20000,
        ])->assertUnprocessable()->assertJsonValidationErrors(['item_id']);

        // Different default_package_id or item_id is allowed
        $second = $this->postJson('/api/v1/modules/cpo/ingredients', [
            'default_package_id' => $defaultPackageAlt->id,
            'item_id' => $item->id,
            'price' => 18000,
        ])->assertCreated();

        $secondId = $second->json('data.id');

        // Updating via PUT or partial PATCH into colliding tuple fails with 422
        $this->putJson("/api/v1/modules/cpo/ingredients/{$secondId}", [
            'default_package_id' => $defaultPackage->id,
            'item_id' => $item->id,
            'price' => 18000,
        ])->assertUnprocessable()->assertJsonValidationErrors(['item_id']);

        $this->patchJson("/api/v1/modules/cpo/ingredients/{$secondId}", [
            'default_package_id' => $defaultPackage->id,
        ])->assertUnprocessable()->assertJsonValidationErrors(['item_id']);

        // Updating via PATCH to non-colliding item_id succeeds
        $this->patchJson("/api/v1/modules/cpo/ingredients/{$secondId}", [
            'item_id' => $itemAlt->id,
        ])->assertOk()
            ->assertJsonPath('data.item_id', $itemAlt->id);

        // Soft delete frees the pair for re-creation
        $this->deleteJson("/api/v1/modules/cpo/ingredients/{$firstId}")->assertOk();

        $recreated = $this->postJson('/api/v1/modules/cpo/ingredients', [
            'default_package_id' => $defaultPackage->id,
            'item_id' => $item->id,
            'price' => 19500,
        ])->assertCreated()
            ->assertJsonPath('data.price', 19500);

        expect($recreated->json('data.id'))->not->toBe($firstId);
    });

    it('cascades parent soft-deletes to dependent Ingredient rows and clears caches', function () {
        $packetName = PacketName::factory()->create();
        $packetVendor = PacketVendor::factory()->create();
        $packetCategory = PacketCategory::factory()->create();
        $itemPacket1 = ItemPacket::factory()->create();
        $itemPacket2 = ItemPacket::factory()->create();
        $itemPacket3 = ItemPacket::factory()->create();
        $itemPacket4 = ItemPacket::factory()->create();

        $dpDirect = DefaultPackage::factory()->create();
        $dpByName = DefaultPackage::factory()->create(['packet_name_id' => $packetName->id]);
        $dpByVendor = DefaultPackage::factory()->create(['packet_vendor_id' => $packetVendor->id]);
        $dpByCategory = DefaultPackage::factory()->create(['packet_category_id' => $packetCategory->id]);
        $dpByItemPacket = DefaultPackage::factory()->create(['item_packet_id' => $itemPacket1->id]);
        $dpByItemPacketItem = DefaultPackage::factory()->create(['item_packet_id' => $itemPacket2->id]);
        $dpByPacket = DefaultPackage::factory()->create(['item_packet_id' => $itemPacket3->id]);
        $dpByCompany = DefaultPackage::factory()->create(['item_packet_id' => $itemPacket4->id]);

        $directItem = Item::factory()->create();
        $companyItem = Item::factory()->create(['company_id' => $itemPacket4->company_id]);

        $ingByDp = Ingredient::factory()->create(['default_package_id' => $dpDirect->id]);
        $ingByDirectItem = Ingredient::factory()->create(['default_package_id' => DefaultPackage::factory()->create()->id, 'item_id' => $directItem->id]);
        $ingByName = Ingredient::factory()->create(['default_package_id' => $dpByName->id]);
        $ingByVendor = Ingredient::factory()->create(['default_package_id' => $dpByVendor->id]);
        $ingByCategory = Ingredient::factory()->create(['default_package_id' => $dpByCategory->id]);
        $ingByItemPacket = Ingredient::factory()->create(['default_package_id' => $dpByItemPacket->id]);
        $ingByItemPacketItem = Ingredient::factory()->create(['default_package_id' => $dpByItemPacketItem->id]);
        $ingByPacket = Ingredient::factory()->create(['default_package_id' => $dpByPacket->id]);
        $ingByCompanyIp = Ingredient::factory()->create(['default_package_id' => $dpByCompany->id]);
        $ingByCompanyItem = Ingredient::factory()->create(['default_package_id' => DefaultPackage::factory()->create()->id, 'item_id' => $companyItem->id]);

        $this->getJson('/api/v1/modules/cpo/ingredients')->assertOk()->assertJsonCount(10, 'data');
        expect(Cache::has(IngredientService::CACHE_KEY_LIST))->toBeTrue();

        $this->deleteJson("/api/v1/modules/cpo/default-packages/{$dpDirect->id}")->assertOk();
        $this->assertSoftDeleted('ingredients', ['id' => $ingByDp->id]);
        expect(Cache::has(IngredientService::CACHE_KEY_LIST))->toBeFalse();

        $this->getJson('/api/v1/modules/cpo/ingredients')->assertOk();
        $this->deleteJson("/api/v1/modules/cpo/items/{$directItem->id}")->assertOk();
        $this->assertSoftDeleted('ingredients', ['id' => $ingByDirectItem->id]);
        expect(Cache::has(IngredientService::CACHE_KEY_LIST))->toBeFalse();

        $this->getJson('/api/v1/modules/cpo/ingredients')->assertOk();
        $this->deleteJson("/api/v1/modules/cpo/packet-names/{$packetName->id}")->assertOk();
        $this->assertSoftDeleted('ingredients', ['id' => $ingByName->id]);
        expect(Cache::has(IngredientService::CACHE_KEY_LIST))->toBeFalse();

        $this->getJson('/api/v1/modules/cpo/ingredients')->assertOk();
        $this->deleteJson("/api/v1/modules/cpo/packet-vendors/{$packetVendor->id}")->assertOk();
        $this->assertSoftDeleted('ingredients', ['id' => $ingByVendor->id]);
        expect(Cache::has(IngredientService::CACHE_KEY_LIST))->toBeFalse();

        $this->getJson('/api/v1/modules/cpo/ingredients')->assertOk();
        $this->deleteJson("/api/v1/modules/cpo/packet-categories/{$packetCategory->id}")->assertOk();
        $this->assertSoftDeleted('ingredients', ['id' => $ingByCategory->id]);
        expect(Cache::has(IngredientService::CACHE_KEY_LIST))->toBeFalse();

        $this->getJson('/api/v1/modules/cpo/ingredients')->assertOk();
        $this->deleteJson("/api/v1/modules/cpo/item-packets/{$itemPacket1->id}")->assertOk();
        $this->assertSoftDeleted('ingredients', ['id' => $ingByItemPacket->id]);
        expect(Cache::has(IngredientService::CACHE_KEY_LIST))->toBeFalse();

        $this->getJson('/api/v1/modules/cpo/ingredients')->assertOk();
        $this->deleteJson("/api/v1/modules/cpo/items/{$itemPacket2->item_id}")->assertOk();
        $this->assertSoftDeleted('ingredients', ['id' => $ingByItemPacketItem->id]);
        expect(Cache::has(IngredientService::CACHE_KEY_LIST))->toBeFalse();

        $this->getJson('/api/v1/modules/cpo/ingredients')->assertOk();
        $this->deleteJson("/api/v1/modules/cpo/packets/{$itemPacket3->packet_id}")->assertOk();
        $this->assertSoftDeleted('ingredients', ['id' => $ingByPacket->id]);
        expect(Cache::has(IngredientService::CACHE_KEY_LIST))->toBeFalse();

        $this->getJson('/api/v1/modules/cpo/ingredients')->assertOk();
        $this->deleteJson("/api/v1/modules/cfo/companies/{$itemPacket4->company_id}")->assertOk();
        $this->assertSoftDeleted('ingredients', ['id' => $ingByCompanyIp->id]);
        $this->assertSoftDeleted('ingredients', ['id' => $ingByCompanyItem->id]);
        expect(Cache::has(IngredientService::CACHE_KEY_LIST))->toBeFalse();
    });

    it('renders IngredientResource conditional relations cleanly and serves OpenAPI docs', function () {
        $ingredient = Ingredient::factory()->create([
            'price' => 15000.00,
        ]);

        $unloaded = (new IngredientResource($ingredient))->resolve(Request::create('/'));
        expect($unloaded)
            ->toHaveKeys([
                'id',
                'default_package_id',
                'item_id',
                'price',
                'created_at',
                'updated_at',
                'deleted_at',
            ])
            ->not->toHaveKey('default_package')
            ->not->toHaveKey('item');

        $ingredient->load(['defaultPackage', 'item']);
        $loaded = (new IngredientResource($ingredient))->resolve(Request::create('/'));
        expect($loaded['default_package'])->not->toBeNull();
        expect($loaded['item'])->not->toBeNull();

        $this->getJson('/docs/api.json')
            ->assertOk()
            ->assertJsonPath('openapi', fn ($v) => is_string($v) && $v !== '');
    });
});
