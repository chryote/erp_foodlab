<?php

namespace App\Modules\CPO\Services;

use App\Enums\PacketVendorType;
use App\Models\DefaultPackage;
use App\Models\Ingredient;
use App\Models\Item;
use App\Models\ItemPacket;
use App\Models\PacketVendor;
use App\Support\CompanyOwnerScope;
use App\Support\IndexQuery;
use App\Support\InputNormalizer;
use App\Support\WriteGuard;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\ValidationException;
use Spatie\QueryBuilder\AllowedFilter;
use Spatie\QueryBuilder\QueryBuilder;

class PacketVendorService
{
    public const CACHE_KEY_LIST = 'erp_foodlab:cpo:packet_vendors:list';

    private const CACHE_KEY_DEFAULT_PACKAGES_LIST = 'erp_foodlab:cpo:default_packages:list';

    private const CACHE_KEY_INGREDIENTS_LIST = 'erp_foodlab:cpo:ingredients:list';

    /**
     * @var array<int, string>
     */
    private const RELATIONS = [];

    /**
     * @return LengthAwarePaginator|Collection<int, PacketVendor>
     */
    public function list(Request $request): LengthAwarePaginator|Collection
    {
        $query = IndexQuery::withDefaultRelations($this->query($request), $request, self::RELATIONS);

        $ownerId = CompanyOwnerScope::applyListFilter($query->getEloquentBuilder(), $request);

        if (IndexQuery::isPaginated($request)) {
            return IndexQuery::paginate($query, $request);
        }

        if (IndexQuery::isCacheable($request)) {
            return Cache::remember(
                CompanyOwnerScope::listCacheKey(self::CACHE_KEY_LIST, $ownerId),
                60,
                fn () => $query->get()
            );
        }

        return $query->get();
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    public function createPacketVendor(array $attributes): PacketVendor
    {
        $attributes['name'] = InputNormalizer::text((string) $attributes['name']) ?? '';
        $attributes['type'] = $this->resolveTypeValue($attributes['type'] ?? PacketVendorType::Bahan->value);
        $companyOwnerId = CompanyOwnerScope::resolveId($attributes);
        if ($companyOwnerId !== null) {
            $attributes['company_owner_id'] = $companyOwnerId;
        }

        $packetVendor = DB::transaction(function () use ($attributes, $companyOwnerId): PacketVendor {
            CompanyOwnerScope::assertActiveOwner($companyOwnerId);
            $this->assertNameUnique($companyOwnerId, $attributes['name']);

            return PacketVendor::query()->create($attributes);
        });

        $this->forgetDependentCaches($companyOwnerId);

        return $packetVendor;
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    public function updatePacketVendor(PacketVendor $packetVendor, array $attributes): PacketVendor
    {
        if (array_key_exists('name', $attributes)) {
            $attributes['name'] = InputNormalizer::text((string) $attributes['name']) ?? '';
        }

        if (array_key_exists('type', $attributes)) {
            $attributes['type'] = $this->resolveTypeValue($attributes['type']);
        }

        $oldOwnerId = $packetVendor->company_owner_id !== null ? (int) $packetVendor->company_owner_id : null;

        $updated = DB::transaction(function () use ($packetVendor, $attributes): PacketVendor {
            $locked = PacketVendor::query()->lockForUpdate()->findOrFail($packetVendor->getKey());

            $targetOwnerId = CompanyOwnerScope::resolveId($attributes, $locked);
            if ($targetOwnerId !== null && array_key_exists('company_owner_id', $attributes)) {
                $attributes['company_owner_id'] = $targetOwnerId;
            }

            CompanyOwnerScope::assertActiveOwner($targetOwnerId);
            $targetName = (string) ($attributes['name'] ?? $locked->name);
            $this->assertNameUnique($targetOwnerId, $targetName, $locked->getKey());

            $locked->update($attributes);

            return $locked;
        });

        $newOwnerId = $updated->company_owner_id !== null ? (int) $updated->company_owner_id : null;
        $this->forgetDependentCaches($oldOwnerId);
        if ($newOwnerId !== $oldOwnerId) {
            $this->forgetDependentCaches($newOwnerId);
        }

        return $updated->refresh();
    }

    public function deletePacketVendor(PacketVendor $packetVendor): void
    {
        $ownerId = DB::transaction(function () use ($packetVendor): ?int {
            $locked = PacketVendor::query()->lockForUpdate()->findOrFail($packetVendor->getKey());

            if (
                class_exists(DefaultPackage::class)
                && Schema::hasTable('default_packages')
                && method_exists($locked, 'defaultPackages')
            ) {
                $defaultPackages = $locked->defaultPackages()->lockForUpdate()->get();

                if ($defaultPackages->isNotEmpty()) {
                    if (class_exists(Ingredient::class) && Schema::hasTable('ingredients')) {
                        foreach ($defaultPackages as $defaultPackage) {
                            $defaultPackage->ingredients()->delete();
                        }
                    }

                    $locked->defaultPackages()->delete();
                }
            }

            if (
                class_exists(ItemPacket::class)
                && Schema::hasTable('item_packet')
                && method_exists($locked, 'itemPackets')
            ) {
                $itemPacketIds = $locked->itemPackets()->lockForUpdate()->pluck('id')->all();
                DefaultPackageService::softDeleteForItemPacketIds(array_map('intval', $itemPacketIds));
                $locked->itemPackets()->delete();
            }

            if (
                class_exists(Item::class)
                && Schema::hasTable('items')
                && method_exists($locked, 'items')
            ) {
                $vendorItems = $locked->items()->lockForUpdate()->get();

                foreach ($vendorItems as $vendorItem) {
                    if (class_exists(ItemPacket::class) && Schema::hasTable('item_packet')) {
                        $vendorItemPacketIds = $vendorItem->itemPackets()->lockForUpdate()->pluck('id')->all();
                        DefaultPackageService::softDeleteForItemPacketIds(array_map('intval', $vendorItemPacketIds));
                        $vendorItem->itemPackets()->delete();
                    }

                    if (class_exists(Ingredient::class) && Schema::hasTable('ingredients')) {
                        $vendorItem->ingredients()->delete();
                    }
                }

                $locked->items()->delete();
            }

            $ownerId = $locked->company_owner_id !== null ? (int) $locked->company_owner_id : null;
            $locked->delete();

            return $ownerId;
        });

        $this->forgetDependentCaches($ownerId);

        if (in_array((string) config('scout.driver', 'null'), ['meilisearch', 'collection'], true)) {
            Item::onlyTrashed()->where('packet_vendor_id', $packetVendor->getKey())->unsearchable();
        }
    }

    private function query(Request $request): QueryBuilder
    {
        $query = IndexQuery::make(PacketVendor::class, $request)
            ->allowedFilters([
                AllowedFilter::exact('company_owner_id'),
                AllowedFilter::exact('type'),
                AllowedFilter::callback('name', function (Builder $query, mixed $value): void {
                    $escaped = IndexQuery::escapeLike($value);
                    if ($escaped === null) {
                        return;
                    }

                    IndexQuery::whereLike($query, 'name', $escaped);
                }),
                AllowedFilter::callback('search', function (Builder $query, mixed $value): void {
                    $escaped = IndexQuery::escapeLike($value);
                    if ($escaped === null) {
                        return;
                    }

                    IndexQuery::whereLike($query, 'name', $escaped);
                }),
            ])
            ->allowedSorts(['id', 'company_owner_id', 'name', 'type', 'created_at', 'updated_at'])
            ->defaultSort('name', 'id');

        $availableIncludes = array_values(array_filter([
            'companyOwner',
            class_exists(Item::class) ? 'items' : null,
            class_exists(ItemPacket::class) ? 'itemPackets' : null,
            class_exists(DefaultPackage::class) ? 'defaultPackages' : null,
        ]));

        if ($availableIncludes !== []) {
            $query->allowedIncludes($availableIncludes);
        }

        return $query;
    }

    private function resolveTypeValue(mixed $rawType): string
    {
        $typeValue = $rawType instanceof PacketVendorType
            ? $rawType->value
            : (string) $rawType;

        if (PacketVendorType::tryFrom($typeValue) === null) {
            throw ValidationException::withMessages([
                'type' => ['The selected type is invalid.'],
            ]);
        }

        return $typeValue;
    }

    private function assertNameUnique(?int $companyOwnerId, string $name, mixed $ignoreKey = null): void
    {
        WriteGuard::assertUniqueActive(
            PacketVendor::query(),
            'name',
            $name,
            CompanyOwnerScope::scopeFilters($companyOwnerId),
            'name',
            'Nama vendor paket yang sama sudah terdaftar.',
            $ignoreKey,
            true
        );
    }

    private function forgetDependentCaches(?int $ownerId = null): void
    {
        CompanyOwnerScope::forgetListCache(self::CACHE_KEY_LIST, $ownerId);
        Cache::forget(CpoService::CACHE_KEY);
        CompanyOwnerScope::forgetListCache(ItemService::CACHE_KEY_LIST, $ownerId);
        CompanyOwnerScope::forgetListCache(ItemPacketService::CACHE_KEY_LIST, $ownerId);
        CompanyOwnerScope::forgetListCache(PacketService::CACHE_KEY_LIST, $ownerId);
        CompanyOwnerScope::forgetListCache(self::CACHE_KEY_DEFAULT_PACKAGES_LIST, $ownerId);
        CompanyOwnerScope::forgetListCache(self::CACHE_KEY_INGREDIENTS_LIST, $ownerId);
    }
}
