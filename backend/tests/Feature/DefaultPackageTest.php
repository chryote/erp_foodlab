<?php

use App\Http\Resources\DefaultPackageResource;
use App\Models\Company;
use App\Models\DefaultPackage;
use App\Models\Ingredient;
use App\Models\Item;
use App\Models\ItemPacket;
use App\Models\Packet;
use App\Models\PacketCategory;
use App\Models\PacketName;
use App\Models\PacketVendor;
use App\Modules\CPO\Services\CpoService;
use App\Modules\CPO\Services\DefaultPackageService;
use App\Modules\CPO\Services\IngredientService;
use App\Modules\CPO\Services\ItemPacketService;
use App\Modules\CPO\Services\PacketCategoryService;
use App\Modules\CPO\Services\PacketNameService;
use App\Modules\CPO\Services\PacketService;
use App\Modules\CPO\Services\PacketVendorService;
use App\Support\IndexQuery;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

describe('DefaultPackage CPO module', function () {
    beforeEach(function () {
        Cache::flush();
        actingAsErpUser();
    });

    it('supports CRUD, QueryBuilder filtering/sorting/includes/pagination, caching, and JsonResource structure', function () {
        $company = Company::factory()->create(['name' => 'PT. DefaultPackage Foodlab']);
        $packet = Packet::factory()->create(['name' => 'Paket Dasar']);
        $item = Item::factory()->create(['company_id' => $company->id, 'name' => 'Bahan Dasar']);
        $itemPacketA = ItemPacket::factory()->create([
            'company_id' => $company->id,
            'packet_id' => $packet->id,
            'item_id' => $item->id,
            'quantity' => 2,
        ]);
        $itemPacketB = ItemPacket::factory()->create([
            'company_id' => $company->id,
            'packet_id' => $packet->id,
            'quantity' => 4,
        ]);

        $packetNameA = PacketName::factory()->create(['name' => 'Paket A']);
        $packetNameB = PacketName::factory()->create(['name' => 'Paket B']);
        $packetVendorA = PacketVendor::factory()->create(['name' => 'Vendor A']);
        $packetVendorB = PacketVendor::factory()->create(['name' => 'Vendor B']);
        $packetCategoryA = PacketCategory::factory()->create(['name' => 'Kategori A']);
        $packetCategoryB = PacketCategory::factory()->create(['name' => 'Kategori B']);

        // Warm dependent caches to confirm writes invalidate them
        $this->getJson('/api/v1/modules/cpo')->assertOk();
        $this->getJson('/api/v1/modules/cpo/packet-names')->assertOk();
        $this->getJson('/api/v1/modules/cpo/packet-vendors')->assertOk();
        $this->getJson('/api/v1/modules/cpo/packet-categories')->assertOk();
        $this->getJson('/api/v1/modules/cpo/item-packets')->assertOk();
        expect(Cache::has(CpoService::CACHE_KEY))->toBeTrue();
        expect(Cache::has(PacketNameService::CACHE_KEY_LIST))->toBeTrue();
        expect(Cache::has(PacketVendorService::CACHE_KEY_LIST))->toBeTrue();
        expect(Cache::has(PacketCategoryService::CACHE_KEY_LIST))->toBeTrue();
        expect(Cache::has(ItemPacketService::CACHE_KEY_LIST))->toBeTrue();

        // Create via SaveDefaultPackageRequest + DB::transaction (omitted price defaults to 0.00)
        $createDefaultPriceRes = $this->postJson('/api/v1/modules/cpo/default-packages', [
            'brand_name' => '  Brand   100%  Hemat  ',
            'packet_name_id' => $packetNameA->id,
            'packet_vendor_id' => $packetVendorA->id,
            'packet_category_id' => $packetCategoryA->id,
            'item_packet_id' => $itemPacketA->id,
        ]);

        $createDefaultPriceRes->assertCreated()
            ->assertJsonStructure([
                'data' => [
                    'id',
                    'brand_name',
                    'packet_name_id',
                    'packet_vendor_id',
                    'packet_category_id',
                    'item_packet_id',
                    'price',
                    'packet_name' => ['id', 'name'],
                    'packet_vendor' => ['id', 'name'],
                    'packet_category' => ['id', 'name'],
                    'item_packet' => ['id', 'company_id', 'packet_id', 'item_id', 'quantity'],
                    'created_at',
                    'updated_at',
                    'deleted_at',
                ],
            ])
            ->assertJsonMissingPath('data.active_flag')
            ->assertJsonMissingPath('data.ingredients')
            ->assertJsonPath('data.brand_name', 'Brand 100% Hemat')
            ->assertJsonPath('data.price', 0)
            ->assertJsonPath('data.packet_name.name', 'Paket A')
            ->assertJsonPath('data.packet_vendor.name', 'Vendor A')
            ->assertJsonPath('data.packet_category.name', 'Kategori A')
            ->assertJsonPath('data.item_packet.id', $itemPacketA->id);

        expect(Cache::has(CpoService::CACHE_KEY))->toBeFalse();
        expect(Cache::has(PacketNameService::CACHE_KEY_LIST))->toBeFalse();
        expect(Cache::has(PacketVendorService::CACHE_KEY_LIST))->toBeFalse();
        expect(Cache::has(PacketCategoryService::CACHE_KEY_LIST))->toBeFalse();
        expect(Cache::has(ItemPacketService::CACHE_KEY_LIST))->toBeFalse();

        $firstId = $createDefaultPriceRes->json('data.id');

        $secondRes = $this->postJson('/api/v1/modules/cpo/default-packages', [
            'brand_name' => 'Brand Alpha_Lab',
            'packet_name_id' => $packetNameB->id,
            'packet_vendor_id' => $packetVendorA->id,
            'packet_category_id' => $packetCategoryB->id,
            'item_packet_id' => $itemPacketB->id,
            'price' => 15000.50,
        ])->assertCreated();

        $thirdRes = $this->postJson('/api/v1/modules/cpo/default-packages', [
            'brand_name' => 'Brand Beta',
            'packet_name_id' => $packetNameB->id,
            'packet_vendor_id' => $packetVendorB->id,
            'packet_category_id' => $packetCategoryB->id,
            'item_packet_id' => $itemPacketB->id,
            'price' => 30000.00,
        ])->assertCreated();

        $secondId = $secondRes->json('data.id');
        $thirdId = $thirdRes->json('data.id');

        // Unfiltered list uses defaultSort('brand_name', 'id') and populates cache
        expect(Cache::has(DefaultPackageService::CACHE_KEY_LIST))->toBeFalse();

        $this->getJson('/api/v1/modules/cpo/default-packages')
            ->assertOk()
            ->assertJsonCount(3, 'data')
            ->assertJsonPath('meta.cache_key', DefaultPackageService::CACHE_KEY_LIST)
            ->assertJsonPath('data.0.id', $firstId)
            ->assertJsonPath('data.1.id', $secondId)
            ->assertJsonPath('data.2.id', $thirdId);

        expect(Cache::has(DefaultPackageService::CACHE_KEY_LIST))->toBeTrue();

        // Filters: brand_name (with LIKE escaping & whitespace skip), FKs, min_price, max_price, legacy flat aliases
        $this->getJson('/api/v1/modules/cpo/default-packages?filter[brand_name]='.urlencode('100%'))
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $firstId);

        $this->getJson('/api/v1/modules/cpo/default-packages?filter[brand_name]='.urlencode('Alpha_'))
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $secondId);

        $this->getJson('/api/v1/modules/cpo/default-packages?filter[brand_name]=%20%20%20')
            ->assertOk()
            ->assertJsonCount(3, 'data');

        $this->getJson("/api/v1/modules/cpo/default-packages?filter[packet_name_id]={$packetNameA->id}")
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $firstId);

        $this->getJson("/api/v1/modules/cpo/default-packages?filter[packet_vendor_id]={$packetVendorB->id}")
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $thirdId);

        $this->getJson("/api/v1/modules/cpo/default-packages?filter[packet_category_id]={$packetCategoryB->id}")
            ->assertOk()
            ->assertJsonCount(2, 'data');

        $this->getJson("/api/v1/modules/cpo/default-packages?filter[item_packet_id]={$itemPacketA->id}")
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $firstId);

        $this->getJson('/api/v1/modules/cpo/default-packages?filter[min_price]=15000&filter[max_price]=25000')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $secondId);

        $this->getJson("/api/v1/modules/cpo/default-packages?packet_vendor_id={$packetVendorB->id}")
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $thirdId);

        // Sorts, pagination cap & nested includes
        $this->getJson('/api/v1/modules/cpo/default-packages?sort=-price&per_page=2&page=1')
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('meta.total', 3)
            ->assertJsonPath('meta.per_page', 2)
            ->assertJsonPath('data.0.id', $thirdId)
            ->assertJsonPath('data.1.id', $secondId);

        $this->getJson('/api/v1/modules/cpo/default-packages?sort=id&page=1&per_page=99999')
            ->assertOk()
            ->assertJsonPath('meta.per_page', IndexQuery::MAX_PER_PAGE)
            ->assertJsonPath('data.0.id', $firstId);

        $this->getJson('/api/v1/modules/cpo/default-packages?sort=-created_at')
            ->assertOk()
            ->assertJsonCount(3, 'data');

        $this->getJson('/api/v1/modules/cpo/default-packages?include=itemPacket.packet,itemPacket.item')
            ->assertOk()
            ->assertJsonPath('data.0.item_packet.packet.name', 'Paket Dasar')
            ->assertJsonPath('data.0.item_packet.item.name', 'Bahan Dasar')
            ->assertJsonMissingPath('data.0.packet_name');

        // Show single default package
        $this->getJson("/api/v1/modules/cpo/default-packages/{$firstId}")
            ->assertOk()
            ->assertJsonPath('data.id', $firstId)
            ->assertJsonPath('data.brand_name', 'Brand 100% Hemat')
            ->assertJsonPath('data.packet_name.name', 'Paket A');

        // PUT update keeping same combination and updating price
        $this->putJson("/api/v1/modules/cpo/default-packages/{$firstId}", [
            'brand_name' => 'Brand 100% Hemat',
            'packet_name_id' => $packetNameA->id,
            'packet_vendor_id' => $packetVendorA->id,
            'packet_category_id' => $packetCategoryA->id,
            'item_packet_id' => $itemPacketA->id,
            'price' => 17500.25,
        ])->assertOk()
            ->assertJsonPath('data.price', 17500.25);

        expect(Cache::has(DefaultPackageService::CACHE_KEY_LIST))->toBeFalse();

        // Partial PATCH with empty payload preserves existing values
        $this->patchJson("/api/v1/modules/cpo/default-packages/{$firstId}", [])
            ->assertOk()
            ->assertJsonPath('data.brand_name', 'Brand 100% Hemat')
            ->assertJsonPath('data.price', 17500.25);

        // Partial PATCH updating only price preserves FKs and brand_name
        $this->patchJson("/api/v1/modules/cpo/default-packages/{$firstId}", [
            'price' => 22500.75,
        ])->assertOk()
            ->assertJsonPath('data.brand_name', 'Brand 100% Hemat')
            ->assertJsonPath('data.packet_name_id', $packetNameA->id)
            ->assertJsonPath('data.price', 22500.75);

        // Partial PATCH updating brand_name normalizes whitespace
        $this->patchJson("/api/v1/modules/cpo/default-packages/{$firstId}", [
            'brand_name' => '  Brand   Premium  ',
        ])->assertOk()
            ->assertJsonPath('data.brand_name', 'Brand Premium')
            ->assertJsonPath('data.price', 22500.75);

        // Soft delete clears caches and hides record
        $this->getJson('/api/v1/modules/cpo')->assertOk();
        $this->getJson('/api/v1/modules/cpo/default-packages')->assertOk();
        expect(Cache::has(DefaultPackageService::CACHE_KEY_LIST))->toBeTrue();
        expect(Cache::has(CpoService::CACHE_KEY))->toBeTrue();

        $this->deleteJson("/api/v1/modules/cpo/default-packages/{$firstId}")
            ->assertOk()
            ->assertJsonStructure(['message']);

        expect(Cache::has(DefaultPackageService::CACHE_KEY_LIST))->toBeFalse();
        expect(Cache::has(CpoService::CACHE_KEY))->toBeFalse();
        $this->assertSoftDeleted('default_packages', ['id' => $firstId]);
        $this->getJson("/api/v1/modules/cpo/default-packages/{$firstId}")->assertNotFound();
    });

    it('enforces decimal bounds, inactive/missing parent rejection, active-duplicate rejection (case & whitespace), and re-create after soft delete', function () {
        $itemPacket = ItemPacket::factory()->create();
        $packetName = PacketName::factory()->create(['name' => 'Paket Utama']);
        $packetVendor = PacketVendor::factory()->create(['name' => 'Vendor Utama']);
        $packetCategory = PacketCategory::factory()->create(['name' => 'Kategori Utama']);
        $packetCategoryAlt = PacketCategory::factory()->create(['name' => 'Kategori Alternatif']);

        // Missing required fields fail with 422
        $this->postJson('/api/v1/modules/cpo/default-packages', [])
            ->assertUnprocessable()
            ->assertJsonValidationErrors([
                'brand_name',
                'packet_name_id',
                'company_id',
                'packet_vendor_id',
                'packet_category_id',
            ]);

        // Whitespace-only & >150-char brand_name fail with 422
        $this->postJson('/api/v1/modules/cpo/default-packages', [
            'brand_name' => '   ',
            'packet_name_id' => $packetName->id,
            'packet_vendor_id' => $packetVendor->id,
            'packet_category_id' => $packetCategory->id,
            'item_packet_id' => $itemPacket->id,
            'price' => 1000,
        ])->assertUnprocessable()->assertJsonValidationErrors(['brand_name']);

        $this->postJson('/api/v1/modules/cpo/default-packages', [
            'brand_name' => str_repeat('B', 151),
            'packet_name_id' => $packetName->id,
            'packet_vendor_id' => $packetVendor->id,
            'packet_category_id' => $packetCategory->id,
            'item_packet_id' => $itemPacket->id,
            'price' => 1000,
        ])->assertUnprocessable()->assertJsonValidationErrors(['brand_name']);

        // Price bounds: negative, > 2 decimal places, and > max decimal(18,2) fail with 422
        foreach ([-1, 100.123, '99999999999999999.99', null] as $invalidPrice) {
            $this->postJson('/api/v1/modules/cpo/default-packages', [
                'brand_name' => 'Brand Valid',
                'packet_name_id' => $packetName->id,
                'packet_vendor_id' => $packetVendor->id,
                'packet_category_id' => $packetCategory->id,
                'item_packet_id' => $itemPacket->id,
                'price' => $invalidPrice,
            ])->assertUnprocessable()->assertJsonValidationErrors(['price']);
        }

        // Missing / soft-deleted parents fail with 422
        $this->postJson('/api/v1/modules/cpo/default-packages', [
            'brand_name' => 'Brand Missing FKs',
            'packet_name_id' => 999999,
            'packet_vendor_id' => 999999,
            'packet_category_id' => 999999,
            'item_packet_id' => 999999,
            'price' => 5000,
        ])->assertUnprocessable()->assertJsonValidationErrors([
            'packet_name_id',
            'packet_vendor_id',
            'packet_category_id',
            'item_packet_id',
        ]);

        $deletedName = PacketName::factory()->create();
        $deletedName->delete();
        $deletedVendor = PacketVendor::factory()->create();
        $deletedVendor->delete();
        $deletedCategory = PacketCategory::factory()->create();
        $deletedCategory->delete();
        $deletedItemPacket = ItemPacket::factory()->create();
        $deletedItemPacket->delete();

        $this->postJson('/api/v1/modules/cpo/default-packages', [
            'brand_name' => 'Brand Deleted Parents',
            'packet_name_id' => $deletedName->id,
            'packet_vendor_id' => $deletedVendor->id,
            'packet_category_id' => $deletedCategory->id,
            'item_packet_id' => $deletedItemPacket->id,
            'price' => 5000,
        ])->assertUnprocessable()->assertJsonValidationErrors([
            'packet_name_id',
            'packet_vendor_id',
            'packet_category_id',
            'item_packet_id',
        ]);

        // Create active default package with normalized spacing
        $first = $this->postJson('/api/v1/modules/cpo/default-packages', [
            'brand_name' => '  Brand   Bundling  ',
            'packet_name_id' => $packetName->id,
            'packet_vendor_id' => $packetVendor->id,
            'packet_category_id' => $packetCategory->id,
            'item_packet_id' => $itemPacket->id,
            'price' => 15000.00,
        ])->assertCreated()
            ->assertJsonPath('data.brand_name', 'Brand Bundling');

        $firstId = $first->json('data.id');

        // Exact, case-variant, and whitespace-padded duplicates fail with 422
        foreach (['Brand Bundling', 'brand bundling', '  BRAND   BUNDLING '] as $duplicateBrand) {
            $this->postJson('/api/v1/modules/cpo/default-packages', [
                'brand_name' => $duplicateBrand,
                'packet_name_id' => $packetName->id,
                'packet_vendor_id' => $packetVendor->id,
                'packet_category_id' => $packetCategory->id,
                'item_packet_id' => $itemPacket->id,
                'price' => 20000,
            ])->assertUnprocessable()->assertJsonValidationErrors(['brand_name']);
        }

        // Different category with same brand_name is allowed
        $second = $this->postJson('/api/v1/modules/cpo/default-packages', [
            'brand_name' => 'Brand Bundling',
            'packet_name_id' => $packetName->id,
            'packet_vendor_id' => $packetVendor->id,
            'packet_category_id' => $packetCategoryAlt->id,
            'item_packet_id' => $itemPacket->id,
            'price' => 18000,
        ])->assertCreated();

        $secondId = $second->json('data.id');

        // Updating via PUT or partial PATCH into colliding tuple fails with 422
        $this->putJson("/api/v1/modules/cpo/default-packages/{$secondId}", [
            'brand_name' => 'brand bundling',
            'packet_name_id' => $packetName->id,
            'packet_vendor_id' => $packetVendor->id,
            'packet_category_id' => $packetCategory->id,
            'item_packet_id' => $itemPacket->id,
            'price' => 18000,
        ])->assertUnprocessable()->assertJsonValidationErrors(['brand_name']);

        $this->patchJson("/api/v1/modules/cpo/default-packages/{$secondId}", [
            'packet_category_id' => $packetCategory->id,
        ])->assertUnprocessable()->assertJsonValidationErrors(['brand_name']);

        // Soft delete frees the combination for re-creation
        $this->deleteJson("/api/v1/modules/cpo/default-packages/{$firstId}")->assertOk();

        $recreated = $this->postJson('/api/v1/modules/cpo/default-packages', [
            'brand_name' => 'Brand Bundling',
            'packet_name_id' => $packetName->id,
            'packet_vendor_id' => $packetVendor->id,
            'packet_category_id' => $packetCategory->id,
            'item_packet_id' => $itemPacket->id,
            'price' => 19500,
        ])->assertCreated()
            ->assertJsonPath('data.brand_name', 'Brand Bundling');

        expect($recreated->json('data.id'))->not->toBe($firstId);
    });

    it('cascades parent soft-deletes to dependent DefaultPackage rows and clears caches', function () {
        $packetName = PacketName::factory()->create();
        $packetVendor = PacketVendor::factory()->create();
        $packetCategory = PacketCategory::factory()->create();
        $itemPacket1 = ItemPacket::factory()->create();
        $itemPacket2 = ItemPacket::factory()->create();
        $itemPacket3 = ItemPacket::factory()->create();
        $itemPacket4 = ItemPacket::factory()->create();

        $dpByName = DefaultPackage::factory()->create(['packet_name_id' => $packetName->id]);
        $dpByVendor = DefaultPackage::factory()->create(['packet_vendor_id' => $packetVendor->id]);
        $dpByCategory = DefaultPackage::factory()->create(['packet_category_id' => $packetCategory->id]);
        $dpByItemPacket = DefaultPackage::factory()->create(['item_packet_id' => $itemPacket1->id]);
        $dpByItem = DefaultPackage::factory()->create(['item_packet_id' => $itemPacket2->id]);
        $dpByPacket = DefaultPackage::factory()->create(['item_packet_id' => $itemPacket3->id]);
        $dpByCompany = DefaultPackage::factory()->create(['item_packet_id' => $itemPacket4->id]);

        $this->getJson('/api/v1/modules/cpo/default-packages')->assertOk()->assertJsonCount(7, 'data');
        expect(Cache::has(DefaultPackageService::CACHE_KEY_LIST))->toBeTrue();

        $this->deleteJson("/api/v1/modules/cpo/packet-names/{$packetName->id}")->assertOk();
        $this->assertSoftDeleted('default_packages', ['id' => $dpByName->id]);
        expect(Cache::has(DefaultPackageService::CACHE_KEY_LIST))->toBeFalse();

        $this->getJson('/api/v1/modules/cpo/default-packages')->assertOk();
        $this->deleteJson("/api/v1/modules/cpo/packet-vendors/{$packetVendor->id}")->assertOk();
        $this->assertSoftDeleted('default_packages', ['id' => $dpByVendor->id]);
        expect(Cache::has(DefaultPackageService::CACHE_KEY_LIST))->toBeFalse();

        $this->getJson('/api/v1/modules/cpo/default-packages')->assertOk();
        $this->deleteJson("/api/v1/modules/cpo/packet-categories/{$packetCategory->id}")->assertOk();
        $this->assertSoftDeleted('default_packages', ['id' => $dpByCategory->id]);
        expect(Cache::has(DefaultPackageService::CACHE_KEY_LIST))->toBeFalse();

        $this->getJson('/api/v1/modules/cpo/default-packages')->assertOk();
        $this->deleteJson("/api/v1/modules/cpo/item-packets/{$itemPacket1->id}")->assertOk();
        $this->assertSoftDeleted('default_packages', ['id' => $dpByItemPacket->id]);
        expect(Cache::has(DefaultPackageService::CACHE_KEY_LIST))->toBeFalse();

        $this->getJson('/api/v1/modules/cpo/default-packages')->assertOk();
        $this->deleteJson("/api/v1/modules/cpo/items/{$itemPacket2->item_id}")->assertOk();
        $this->assertSoftDeleted('default_packages', ['id' => $dpByItem->id]);
        expect(Cache::has(DefaultPackageService::CACHE_KEY_LIST))->toBeFalse();

        $this->getJson('/api/v1/modules/cpo/default-packages')->assertOk();
        $this->deleteJson("/api/v1/modules/cpo/packets/{$itemPacket3->packet_id}")->assertOk();
        $this->assertSoftDeleted('default_packages', ['id' => $dpByPacket->id]);
        expect(Cache::has(DefaultPackageService::CACHE_KEY_LIST))->toBeFalse();

        $this->getJson('/api/v1/modules/cpo/default-packages')->assertOk();
        $this->deleteJson("/api/v1/modules/cfo/companies/{$itemPacket4->company_id}")->assertOk();
        $this->assertSoftDeleted('default_packages', ['id' => $dpByCompany->id]);
        expect(Cache::has(DefaultPackageService::CACHE_KEY_LIST))->toBeFalse();
    });

    it('renders DefaultPackageResource conditional relations cleanly and serves OpenAPI docs', function () {
        $defaultPackage = DefaultPackage::factory()->create([
            'brand_name' => 'Brand Resource Test',
            'price' => 15000.00,
        ]);

        $unloaded = (new DefaultPackageResource($defaultPackage))->resolve(Request::create('/'));
        expect($unloaded)
            ->toHaveKeys([
                'id',
                'brand_name',
                'packet_name_id',
                'packet_vendor_id',
                'packet_category_id',
                'item_packet_id',
                'price',
                'created_at',
                'updated_at',
                'deleted_at',
            ])
            ->not->toHaveKey('packet_name')
            ->not->toHaveKey('packet_vendor')
            ->not->toHaveKey('packet_category')
            ->not->toHaveKey('item_packet')
            ->not->toHaveKey('ingredients');

        $defaultPackage->load(['packetName', 'packetVendor', 'packetCategory', 'itemPacket']);
        $defaultPackage->setRelation('ingredients', collect([['id' => 1, 'name' => 'Sample Ingredient']]));
        $loaded = (new DefaultPackageResource($defaultPackage))->resolve(Request::create('/'));
        expect($loaded['packet_name'])->not->toBeNull();
        expect($loaded['packet_vendor'])->not->toBeNull();
        expect($loaded['packet_category'])->not->toBeNull();
        expect($loaded['item_packet'])->not->toBeNull();
        expect($loaded['ingredients'])->toHaveCount(1);

        $this->getJson('/docs/api.json')
            ->assertOk()
            ->assertJsonPath('openapi', fn ($v) => is_string($v) && $v !== '');
    });

    it('supports exclusive Company vs PacketVendor ownership on DefaultPackage and atomic 3-screen wizard persistence with rollback on failure', function () {
        $company = Company::factory()->create(['name' => 'PT. Wizard Company']);
        $vendorA = PacketVendor::factory()->create(['name' => 'CV. Wizard Vendor A']);
        $vendorB = PacketVendor::factory()->create(['name' => 'CV. Wizard Vendor B']);

        $companyItem1 = Item::factory()->create([
            'company_id' => $company->id,
            'code' => 'CMP-01',
            'name' => 'Tepung Internal',
        ]);
        $companyItem2 = Item::factory()->create([
            'company_id' => $company->id,
            'code' => 'CMP-02',
            'name' => 'Gula Internal',
        ]);
        $vendorAItem1 = Item::factory()->forPacketVendor($vendorA)->create([
            'code' => 'VND-01',
            'name' => 'Kopi Vendor A',
        ]);
        $vendorAItem2 = Item::factory()->forPacketVendor($vendorA)->create([
            'code' => 'VND-02',
            'name' => 'Krimer Vendor A',
        ]);
        $vendorBItem = Item::factory()->forPacketVendor($vendorB)->create([
            'code' => 'VND-B1',
            'name' => 'Susu Vendor B',
        ]);

        // Warm all dependent caches to confirm wizard clears them
        $this->getJson('/api/v1/modules/cpo')->assertOk();
        $this->getJson('/api/v1/modules/cpo/packet-names')->assertOk();
        $this->getJson('/api/v1/modules/cpo/packet-categories')->assertOk();
        $this->getJson('/api/v1/modules/cpo/packets')->assertOk();
        $this->getJson('/api/v1/modules/cpo/item-packets')->assertOk();
        $this->getJson('/api/v1/modules/cpo/default-packages')->assertOk();
        $this->getJson('/api/v1/modules/cpo/ingredients')->assertOk();

        // 1. Cross-owner item in wizard fails with 422 and rolls back PacketName/PacketCategory/Packet cleanly
        $this->postJson('/api/v1/modules/cpo/default-packages/wizard', [
            'packet_name' => 'Paket Rollback Uji',
            'packet_category' => 'Kategori Rollback Uji',
            'brand_name' => 'Brand Rollback',
            'company_id' => $company->id,
            'price' => 8000,
            'items' => [
                ['item_id' => $companyItem1->id, 'quantity' => 2],
                ['item_id' => $vendorAItem1->id, 'quantity' => 1],
            ],
        ])->assertUnprocessable()->assertJsonValidationErrors(['items.1.item_id']);

        expect(PacketName::query()->where('name', 'Paket Rollback Uji')->exists())->toBeFalse();
        expect(PacketCategory::query()->where('name', 'Kategori Rollback Uji')->exists())->toBeFalse();
        expect(Packet::query()->where('name', 'Paket Rollback Uji')->exists())->toBeFalse();
        expect(DefaultPackage::query()->where('brand_name', 'Brand Rollback')->exists())->toBeFalse();

        // 2. Dual owner, missing owner, empty items, duplicate item_id, and invalid price fail with 422
        $this->postJson('/api/v1/modules/cpo/default-packages/wizard', [
            'packet_name' => 'Paket Invalid',
            'packet_category' => 'Kategori Invalid',
            'brand_name' => 'Brand Invalid',
            'company_id' => $company->id,
            'packet_vendor_id' => $vendorA->id,
            'price' => 1000,
            'items' => [['item_id' => $companyItem1->id, 'quantity' => 1]],
        ])->assertUnprocessable()->assertJsonValidationErrors(['company_id', 'packet_vendor_id']);

        $this->postJson('/api/v1/modules/cpo/default-packages/wizard', [
            'packet_name' => 'Paket Invalid',
            'packet_category' => 'Kategori Invalid',
            'brand_name' => 'Brand Invalid',
            'price' => 1000,
            'items' => [],
        ])->assertUnprocessable()->assertJsonValidationErrors(['company_id', 'packet_vendor_id', 'items']);

        $this->postJson('/api/v1/modules/cpo/default-packages/wizard', [
            'packet_name' => 'Paket Invalid',
            'packet_category' => 'Kategori Invalid',
            'brand_name' => 'Brand Invalid',
            'packet_vendor_id' => $vendorA->id,
            'price' => 3000,
            'items' => [
                ['item_id' => $vendorAItem1->id, 'quantity' => 1],
                ['item_id' => $vendorAItem1->id, 'quantity' => 2],
            ],
        ])->assertUnprocessable()->assertJsonValidationErrors(['items.0.item_id', 'items.1.item_id']);

        $this->postJson('/api/v1/modules/cpo/default-packages/wizard', [
            'packet_name' => 'Paket Invalid',
            'packet_category' => 'Kategori Invalid',
            'brand_name' => 'Brand Invalid',
            'packet_vendor_id' => $vendorB->id,
            'price' => -5,
            'items' => [['item_id' => $vendorBItem->id, 'quantity' => 1]],
        ])->assertUnprocessable()->assertJsonValidationErrors(['price']);

        // 3. Company-owned wizard submission creates PacketName, PacketCategory, Packet, ItemPackets, DefaultPackage, and Ingredients (price 0) atomically
        $idemHeaders = ['Idempotency-Key' => 'idem-wizard-company-001'];
        $companyWizardPayload = [
            'packet_name' => '  Paket   Internal Hemat  ',
            'packet_category' => '  Kategori   Internal  ',
            'brand_name' => '  Brand   Internal Prima  ',
            'company_id' => $company->id,
            'price' => 20000,
            'items' => [
                ['item_id' => $companyItem1->id, 'quantity' => 2],
                ['item_id' => $companyItem2->id, 'quantity' => 3],
            ],
        ];

        $companyWizardRes = $this->postJson('/api/v1/modules/cpo/default-packages/wizard', $companyWizardPayload, $idemHeaders);
        $companyWizardRes->assertCreated()
            ->assertJsonPath('data.brand_name', 'Brand Internal Prima')
            ->assertJsonPath('data.company_id', $company->id)
            ->assertJsonPath('data.packet_vendor_id', null)
            ->assertJsonPath('data.price', 20000)
            ->assertJsonPath('data.packet_name.name', 'Paket Internal Hemat')
            ->assertJsonPath('data.packet_category.name', 'Kategori Internal')
            ->assertJsonPath('data.packet.name', 'Paket Internal Hemat')
            ->assertJsonCount(2, 'data.ingredients')
            ->assertJsonPath('data.ingredients.0.price', 0)
            ->assertJsonPath('data.ingredients.1.price', 0);

        // Idempotency-Key replay returns same record without duplicating
        $replayWizardRes = $this->postJson('/api/v1/modules/cpo/default-packages/wizard', $companyWizardPayload, $idemHeaders)
            ->assertCreated();
        expect($replayWizardRes->json('data.id'))->toBe($companyWizardRes->json('data.id'));

        expect(Cache::has(CpoService::CACHE_KEY))->toBeFalse();
        expect(Cache::has(PacketNameService::CACHE_KEY_LIST))->toBeFalse();
        expect(Cache::has(PacketCategoryService::CACHE_KEY_LIST))->toBeFalse();
        expect(Cache::has(PacketService::CACHE_KEY_LIST))->toBeFalse();
        expect(Cache::has(ItemPacketService::CACHE_KEY_LIST))->toBeFalse();
        expect(Cache::has(DefaultPackageService::CACHE_KEY_LIST))->toBeFalse();
        expect(Cache::has(IngredientService::CACHE_KEY_LIST))->toBeFalse();

        $companyDpId = $companyWizardRes->json('data.id');
        expect(ItemPacket::query()->where('company_id', $company->id)->count())->toBe(2);
        expect(Ingredient::query()->where('default_package_id', $companyDpId)->count())->toBe(2);

        // 4. PacketVendor wizard submission reuses existing PacketName & PacketCategory (case-insensitive) and creates vendor ItemPackets + Ingredients
        $existingVendorName = PacketName::factory()->create(['name' => 'Paket Vendor Kopi']);
        $existingVendorCat = PacketCategory::factory()->create(['name' => 'Kategori Minuman']);

        $vendorWizardRes = $this->postJson('/api/v1/modules/cpo/default-packages/wizard', [
            'packet_name' => '  paket   vendor kopi  ',
            'packet_category' => 'KATEGORI MINUMAN',
            'brand_name' => 'Brand Kopi Nusantara',
            'packet_vendor_id' => $vendorA->id,
            'price' => 25000,
            'items' => [
                ['item_id' => $vendorAItem1->id, 'quantity' => 4],
                ['item_id' => $vendorAItem2->id, 'quantity' => 2],
            ],
        ])->assertCreated()
            ->assertJsonPath('data.company_id', null)
            ->assertJsonPath('data.packet_vendor_id', $vendorA->id)
            ->assertJsonPath('data.packet_name_id', $existingVendorName->id)
            ->assertJsonPath('data.packet_category_id', $existingVendorCat->id)
            ->assertJsonPath('data.price', 25000)
            ->assertJsonCount(2, 'data.ingredients')
            ->assertJsonPath('data.ingredients.0.price', 0)
            ->assertJsonPath('data.ingredients.1.price', 0);

        expect(PacketName::query()->whereRaw('LOWER(name) = ?', ['paket vendor kopi'])->count())->toBe(1);
        expect(PacketCategory::query()->whereRaw('LOWER(name) = ?', ['kategori minuman'])->count())->toBe(1);
        expect(ItemPacket::query()->where('packet_vendor_id', $vendorA->id)->count())->toBe(2);

        // 5. Duplicate wizard combination (same brand + packet_name + owner + category + packet) fails with 422
        $this->postJson('/api/v1/modules/cpo/default-packages/wizard', [
            'packet_name' => 'paket vendor kopi',
            'packet_category' => 'kategori minuman',
            'brand_name' => '  BRAND   KOPI NUSANTARA ',
            'packet_vendor_id' => $vendorA->id,
            'price' => 5000,
            'items' => [
                ['item_id' => $vendorAItem1->id, 'quantity' => 1],
            ],
        ])->assertUnprocessable()->assertJsonValidationErrors(['brand_name']);

        // 6. Edit existing wizard (update brand/name/category/items/qty/price, remove item & prune unused ItemPacket, allow same tuple, reject collision & owner mismatch)
        $vendorDpId = $vendorWizardRes->json('data.id');
        $vendorPacketId = $vendorWizardRes->json('data.packet_id');

        // 6a. Re-saving with identical tuple on same record succeeds (no self-collision)
        $this->putJson("/api/v1/modules/cpo/default-packages/{$companyDpId}/wizard", [
            'packet_name' => 'Paket Internal Hemat',
            'packet_category' => 'Kategori Internal',
            'brand_name' => 'Brand Internal Prima',
            'company_id' => $company->id,
            'price' => 15000,
            'items' => [
                ['item_id' => $companyItem1->id, 'quantity' => 5],
            ],
        ])->assertOk()
            ->assertJsonPath('data.brand_name', 'Brand Internal Prima')
            ->assertJsonPath('data.price', 15000)
            ->assertJsonCount(1, 'data.ingredients')
            ->assertJsonPath('data.ingredients.0.price', 0);

        // Removed $companyItem2 Ingredient is gone and unused ItemPacket is soft-deleted
        expect(Ingredient::query()->where('default_package_id', $companyDpId)->count())->toBe(1);
        expect(ItemPacket::query()->where('company_id', $company->id)->where('item_id', $companyItem2->id)->count())->toBe(0);
        expect(ItemPacket::withTrashed()->where('company_id', $company->id)->where('item_id', $companyItem2->id)->first()?->trashed())->toBeTrue();

        // 6b. Colliding with ANOTHER active DefaultPackage fails 422 and rolls back changes
        $this->putJson("/api/v1/modules/cpo/default-packages/{$companyDpId}/wizard", [
            'packet_name' => 'paket vendor kopi',
            'packet_category' => 'kategori minuman',
            'brand_name' => 'BRAND KOPI NUSANTARA',
            'packet_vendor_id' => $vendorA->id,
            'price' => 5000,
            'items' => [
                ['item_id' => $vendorAItem1->id, 'quantity' => 1],
            ],
        ])->assertUnprocessable()->assertJsonValidationErrors(['brand_name']);

        expect(DefaultPackage::query()->find($companyDpId)?->brand_name)->toBe('Brand Internal Prima');
        expect(DefaultPackage::query()->find($companyDpId)?->company_id)->toBe($company->id);

        // 6c. Mismatched owner vs items fails 422 and rolls back
        $this->putJson("/api/v1/modules/cpo/default-packages/{$companyDpId}/wizard", [
            'packet_name' => 'Paket Switch Invalid',
            'packet_category' => 'Kategori Switch',
            'brand_name' => 'Brand Switch Invalid',
            'packet_vendor_id' => $vendorA->id,
            'price' => 5000,
            'items' => [
                ['item_id' => $companyItem1->id, 'quantity' => 1],
            ],
        ])->assertUnprocessable()->assertJsonValidationErrors(['items.0.item_id']);

        // 6d. Switching owner from Company to PacketVendor with matching items updates cleanly and prunes old company ItemPacket
        $this->putJson("/api/v1/modules/cpo/default-packages/{$companyDpId}/wizard", [
            'packet_name' => 'Paket Edited Vendor',
            'packet_category' => 'Kategori Edited',
            'brand_name' => 'Brand Edited Vendor',
            'packet_vendor_id' => $vendorA->id,
            'price' => 30000,
            'items' => [
                ['item_id' => $vendorAItem1->id, 'quantity' => 7],
            ],
        ])->assertOk()
            ->assertJsonPath('data.brand_name', 'Brand Edited Vendor')
            ->assertJsonPath('data.company_id', null)
            ->assertJsonPath('data.packet_vendor_id', $vendorA->id)
            ->assertJsonPath('data.price', 30000)
            ->assertJsonCount(1, 'data.ingredients')
            ->assertJsonPath('data.ingredients.0.price', 0);

        expect(ItemPacket::query()->where('company_id', $company->id)->where('item_id', $companyItem1->id)->count())->toBe(0);

        // 7. Deleting Packet cascades to DefaultPackage linked via packet_id (and its Ingredients)
        $this->deleteJson("/api/v1/modules/cpo/packets/{$vendorPacketId}")->assertOk();
        $this->assertSoftDeleted('default_packages', ['id' => $vendorDpId]);
        expect(Ingredient::query()->where('default_package_id', $vendorDpId)->count())->toBe(0);
    });
});
