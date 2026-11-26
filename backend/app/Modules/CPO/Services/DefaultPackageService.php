<?php

namespace App\Modules\CPO\Services;

use App\Models\DefaultPackage;
use App\Models\ItemPacket;
use App\Models\Packet;
use App\Models\PacketCategory;
use App\Models\PacketName;
use App\Support\ExclusiveOwner;
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

class DefaultPackageService
{
    public const CACHE_KEY_LIST = 'erp_foodlab:cpo:default_packages:list';

    private const CACHE_KEY_INGREDIENTS_LIST = 'erp_foodlab:cpo:ingredients:list';

    /**
     * @var array<int, string>
     */
    private const RELATIONS = [
        'packetName',
        'company',
        'packetVendor',
        'packetCategory',
        'packet',
        'itemPacket',
    ];

    /**
     * @return LengthAwarePaginator|Collection<int, DefaultPackage>
     */
    public function list(Request $request): LengthAwarePaginator|Collection
    {
        $query = IndexQuery::withDefaultRelations($this->query($request), $request, self::RELATIONS);

        if (IndexQuery::isPaginated($request)) {
            return IndexQuery::paginate($query, $request);
        }

        if (IndexQuery::isCacheable($request)) {
            return Cache::remember(self::CACHE_KEY_LIST, 60, fn () => $query->get());
        }

        return $query->get();
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    public function createDefaultPackage(array $attributes): DefaultPackage
    {
        $attributes['brand_name'] = InputNormalizer::text((string) $attributes['brand_name']) ?? '';
        $attributes['packet_name_id'] = (int) $attributes['packet_name_id'];
        $attributes['packet_category_id'] = (int) $attributes['packet_category_id'];
        $attributes['packet_id'] = isset($attributes['packet_id']) ? (int) $attributes['packet_id'] : null;
        $attributes['item_packet_id'] = isset($attributes['item_packet_id']) ? (int) $attributes['item_packet_id'] : null;
        $attributes['price'] = round((float) ($attributes['price'] ?? 0), 2);

        $resolved = ExclusiveOwner::resolveForService($attributes);
        $companyId = $resolved['company_id'];
        $vendorId = $resolved['packet_vendor_id'];
        $attributes = $resolved['attributes'];

        $defaultPackage = DB::transaction(function () use ($attributes, $companyId, $vendorId): DefaultPackage {
            $resolvedPacketId = $this->assertActiveParents(
                $attributes['packet_name_id'],
                $companyId,
                $vendorId,
                $attributes['packet_category_id'],
                $attributes['packet_id'],
                $attributes['item_packet_id']
            );

            $attributes['packet_id'] = $resolvedPacketId;

            $this->assertCombinationUnique(
                $attributes['brand_name'],
                $attributes['packet_name_id'],
                $companyId,
                $vendorId,
                $attributes['packet_category_id'],
                $resolvedPacketId,
                $attributes['item_packet_id']
            );

            return DefaultPackage::query()->create($attributes);
        });

        $this->forgetDependentCaches();

        return $defaultPackage->load(self::RELATIONS);
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    public function updateDefaultPackage(DefaultPackage $defaultPackage, array $attributes): DefaultPackage
    {
        if (array_key_exists('brand_name', $attributes)) {
            $attributes['brand_name'] = InputNormalizer::text((string) $attributes['brand_name']) ?? '';
        }

        foreach (['packet_name_id', 'packet_category_id'] as $intField) {
            if (array_key_exists($intField, $attributes)) {
                $attributes[$intField] = (int) $attributes[$intField];
            }
        }

        foreach (['packet_id', 'item_packet_id'] as $nullableIntField) {
            if (array_key_exists($nullableIntField, $attributes)) {
                $attributes[$nullableIntField] = $attributes[$nullableIntField] !== null
                    ? (int) $attributes[$nullableIntField]
                    : null;
            }
        }

        if (array_key_exists('price', $attributes)) {
            $attributes['price'] = round((float) $attributes['price'], 2);
        }

        $updated = DB::transaction(function () use ($defaultPackage, $attributes): DefaultPackage {
            $locked = DefaultPackage::query()->lockForUpdate()->findOrFail($defaultPackage->getKey());

            $resolved = ExclusiveOwner::resolveForService($attributes, $locked);
            $targetCompanyId = $resolved['company_id'];
            $targetVendorId = $resolved['packet_vendor_id'];
            $attributes = $resolved['attributes'];

            $targetBrandName = (string) ($attributes['brand_name'] ?? $locked->brand_name);
            $targetPacketNameId = (int) ($attributes['packet_name_id'] ?? $locked->packet_name_id);
            $targetPacketCategoryId = (int) ($attributes['packet_category_id'] ?? $locked->packet_category_id);
            $targetPacketId = array_key_exists('packet_id', $attributes)
                ? $attributes['packet_id']
                : ($locked->packet_id !== null ? (int) $locked->packet_id : null);
            $targetItemPacketId = array_key_exists('item_packet_id', $attributes)
                ? $attributes['item_packet_id']
                : ($locked->item_packet_id !== null ? (int) $locked->item_packet_id : null);

            $resolvedPacketId = $this->assertActiveParents(
                $targetPacketNameId,
                $targetCompanyId,
                $targetVendorId,
                $targetPacketCategoryId,
                $targetPacketId,
                $targetItemPacketId
            );

            if ($resolvedPacketId !== null) {
                $attributes['packet_id'] = $resolvedPacketId;
            }

            $this->assertCombinationUnique(
                $targetBrandName,
                $targetPacketNameId,
                $targetCompanyId,
                $targetVendorId,
                $targetPacketCategoryId,
                $resolvedPacketId,
                $targetItemPacketId,
                $locked->getKey()
            );

            $locked->update($attributes);

            return $locked;
        });

        $this->forgetDependentCaches();

        return $updated->refresh()->load(self::RELATIONS);
    }

    public function deleteDefaultPackage(DefaultPackage $defaultPackage): void
    {
        DB::transaction(function () use ($defaultPackage): void {
            $locked = DefaultPackage::query()->lockForUpdate()->findOrFail($defaultPackage->getKey());
            self::cascadeIngredientsFor([$locked]);
            $locked->delete();
        });

        $this->forgetDependentCaches();
    }

    /**
     * Soft-delete active default packages (and their ingredients if present) for given item_packet IDs.
     *
     * @param  array<int, int>  $itemPacketIds
     */
    public static function softDeleteForItemPacketIds(array $itemPacketIds): void
    {
        if ($itemPacketIds === [] || ! Schema::hasTable('default_packages')) {
            return;
        }

        $defaultPackages = DefaultPackage::query()
            ->whereIn('item_packet_id', $itemPacketIds)
            ->lockForUpdate()
            ->get();

        if ($defaultPackages->isEmpty()) {
            return;
        }

        self::cascadeIngredientsFor($defaultPackages->all());

        DefaultPackage::query()
            ->whereIn('id', $defaultPackages->pluck('id')->all())
            ->delete();
    }

    /**
     * Soft-delete active default packages (and their ingredients if present) for given packet IDs.
     *
     * @param  array<int, int>  $packetIds
     */
    public static function softDeleteForPacketIds(array $packetIds): void
    {
        if ($packetIds === [] || ! Schema::hasTable('default_packages')) {
            return;
        }

        $defaultPackages = DefaultPackage::query()
            ->whereIn('packet_id', $packetIds)
            ->lockForUpdate()
            ->get();

        if ($defaultPackages->isEmpty()) {
            return;
        }

        self::cascadeIngredientsFor($defaultPackages->all());

        DefaultPackage::query()
            ->whereIn('id', $defaultPackages->pluck('id')->all())
            ->delete();
    }

    /**
     * @param  iterable<int, DefaultPackage>  $defaultPackages
     */
    private static function cascadeIngredientsFor(iterable $defaultPackages): void
    {
        if (! class_exists('App\\Models\\Ingredient') || ! Schema::hasTable('ingredients')) {
            return;
        }

        foreach ($defaultPackages as $defaultPackage) {
            if (method_exists($defaultPackage, 'ingredients')) {
                $defaultPackage->ingredients()->delete();
            }
        }
    }

    private function query(Request $request): QueryBuilder
    {
        $query = IndexQuery::make(DefaultPackage::class, $request)
            ->allowedFilters([
                AllowedFilter::callback('brand_name', function (Builder $query, mixed $value): void {
                    if (is_array($value)) {
                        return;
                    }

                    $escaped = IndexQuery::escapeLike($value);
                    if ($escaped === null) {
                        return;
                    }

                    IndexQuery::whereLike($query, 'brand_name', $escaped);
                }),
                AllowedFilter::callback('search', function (Builder $query, mixed $value): void {
                    if (is_array($value)) {
                        return;
                    }

                    $escaped = IndexQuery::escapeLike($value);
                    if ($escaped === null) {
                        return;
                    }

                    $query->where(function (Builder $searchQuery) use ($escaped): void {
                        IndexQuery::whereLike($searchQuery, 'brand_name', $escaped);
                        $searchQuery->orWhereHas(
                            'packetName',
                            fn (Builder $q) => IndexQuery::whereLike($q, 'name', $escaped)
                        );
                        $searchQuery->orWhereHas(
                            'company',
                            fn (Builder $q) => IndexQuery::whereLike($q, 'name', $escaped)
                        );
                        $searchQuery->orWhereHas(
                            'packetVendor',
                            fn (Builder $q) => IndexQuery::whereLike($q, 'name', $escaped)
                        );
                        $searchQuery->orWhereHas(
                            'packetCategory',
                            fn (Builder $q) => IndexQuery::whereLike($q, 'name', $escaped)
                        );
                    });
                }),
                AllowedFilter::exact('packet_name_id'),
                AllowedFilter::exact('company_id'),
                AllowedFilter::exact('packet_vendor_id'),
                AllowedFilter::exact('packet_category_id'),
                AllowedFilter::exact('packet_id'),
                AllowedFilter::exact('item_packet_id'),
                AllowedFilter::callback('min_price', function (Builder $query, mixed $value): void {
                    if (is_array($value)) {
                        return;
                    }

                    $trimmed = trim((string) $value);
                    if ($trimmed === '' || ! is_numeric($trimmed)) {
                        return;
                    }

                    $query->where('price', '>=', round((float) $trimmed, 2));
                }),
                AllowedFilter::callback('max_price', function (Builder $query, mixed $value): void {
                    if (is_array($value)) {
                        return;
                    }

                    $trimmed = trim((string) $value);
                    if ($trimmed === '' || ! is_numeric($trimmed)) {
                        return;
                    }

                    $query->where('price', '<=', round((float) $trimmed, 2));
                }),
            ])
            ->allowedSorts(['id', 'brand_name', 'company_id', 'packet_vendor_id', 'packet_id', 'price', 'created_at'])
            ->defaultSort('brand_name', 'id');

        $availableIncludes = array_values(array_filter([
            'packetName',
            'company',
            'packetVendor',
            'packetCategory',
            'packet',
            'packet.itemPackets',
            'itemPacket',
            'itemPacket.packet',
            'itemPacket.item',
            class_exists('App\\Models\\Ingredient') ? 'ingredients' : null,
            class_exists('App\\Models\\Ingredient') ? 'ingredients.item' : null,
        ]));

        $query->allowedIncludes($availableIncludes);

        return $query;
    }

    private function assertActiveParents(
        int $packetNameId,
        ?int $companyId,
        ?int $packetVendorId,
        int $packetCategoryId,
        ?int $packetId,
        ?int $itemPacketId
    ): ?int {
        ExclusiveOwner::assertActiveOwner($companyId, $packetVendorId);

        if ($packetId === null && $itemPacketId === null) {
            throw ValidationException::withMessages([
                'item_packet_id' => ['Paket atau item paket wajib dipilih.'],
            ]);
        }

        if (! PacketName::query()->whereNull('deleted_at')->sharedLock()->whereKey($packetNameId)->exists()) {
            throw ValidationException::withMessages([
                'packet_name_id' => ['The selected packet name is invalid or has been deleted.'],
            ]);
        }

        if (! PacketCategory::query()->whereNull('deleted_at')->sharedLock()->whereKey($packetCategoryId)->exists()) {
            throw ValidationException::withMessages([
                'packet_category_id' => ['The selected packet category is invalid or has been deleted.'],
            ]);
        }

        if ($packetId !== null && ! Packet::query()->whereNull('deleted_at')->sharedLock()->whereKey($packetId)->exists()) {
            throw ValidationException::withMessages([
                'packet_id' => ['The selected packet is invalid or has been deleted.'],
            ]);
        }

        $derivedPacketId = $packetId;
        if ($itemPacketId !== null) {
            $itemPacket = ItemPacket::query()->whereNull('deleted_at')->sharedLock()->find($itemPacketId);
            if ($itemPacket === null) {
                throw ValidationException::withMessages([
                    'item_packet_id' => ['The selected item packet is invalid or has been deleted.'],
                ]);
            }

            if ($derivedPacketId === null) {
                $derivedPacketId = (int) $itemPacket->packet_id;
            }
        }

        return $derivedPacketId;
    }

    private function assertCombinationUnique(
        string $brandName,
        int $packetNameId,
        ?int $companyId,
        ?int $packetVendorId,
        int $packetCategoryId,
        ?int $packetId,
        ?int $itemPacketId,
        mixed $ignoreKey = null
    ): void {
        $baseScope = [
            'packet_name_id' => $packetNameId,
            ...ExclusiveOwner::scopeFilters($companyId, $packetVendorId),
            'packet_category_id' => $packetCategoryId,
        ];

        if ($itemPacketId !== null) {
            WriteGuard::assertUniqueActive(
                DefaultPackage::query(),
                'brand_name',
                $brandName,
                [...$baseScope, 'item_packet_id' => $itemPacketId],
                'brand_name',
                'Paket default dengan kombinasi merek, nama paket, pemilik, kategori, dan item paket yang sama sudah terdaftar.',
                $ignoreKey,
                true
            );
        }

        if ($packetId !== null) {
            WriteGuard::assertUniqueActive(
                DefaultPackage::query(),
                'brand_name',
                $brandName,
                [...$baseScope, 'packet_id' => $packetId],
                'brand_name',
                'Paket default dengan kombinasi merek, nama paket, pemilik, kategori, dan item paket yang sama sudah terdaftar.',
                $ignoreKey,
                true
            );
        }
    }

    public function forgetDependentCaches(): void
    {
        Cache::forget(self::CACHE_KEY_LIST);
        Cache::forget(CpoService::CACHE_KEY);
        Cache::forget(PacketNameService::CACHE_KEY_LIST);
        Cache::forget(PacketVendorService::CACHE_KEY_LIST);
        Cache::forget(PacketCategoryService::CACHE_KEY_LIST);
        Cache::forget(PacketService::CACHE_KEY_LIST);
        Cache::forget(ItemPacketService::CACHE_KEY_LIST);
        Cache::forget(self::CACHE_KEY_INGREDIENTS_LIST);
    }
}
