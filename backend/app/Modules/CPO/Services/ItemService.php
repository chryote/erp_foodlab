<?php

namespace App\Modules\CPO\Services;

use App\Enums\ItemType;
use App\Models\Item;
use App\Support\ActiveCompany;
use App\Support\CompanyOwnerScope;
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

class ItemService
{
    public const CACHE_KEY_LIST = 'erp_foodlab:cpo:items:list';

    private const CACHE_KEY_ITEM_PACKETS_LIST = 'erp_foodlab:cpo:item_packets:list';

    private const CACHE_KEY_PACKETS_LIST = 'erp_foodlab:cpo:packets:list';

    /**
     * @var array<int, string>
     */
    private const RELATIONS = ['company', 'packetVendor'];

    /**
     * @return LengthAwarePaginator|Collection<int, Item>
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
    public function createItem(array $attributes): Item
    {
        if (array_key_exists('code', $attributes)) {
            $attributes['code'] = $attributes['code'] !== null
                ? InputNormalizer::nullableText((string) $attributes['code'])
                : null;
        }
        $attributes['name'] = InputNormalizer::text((string) $attributes['name']) ?? '';
        $rawType = $attributes['type'] ?? null;
        $typeValue = $rawType instanceof ItemType
            ? $rawType->value
            : (string) ($rawType ?? ItemType::Bahan->value);

        if (ItemType::tryFrom($typeValue) === null) {
            throw ValidationException::withMessages([
                'type' => ['The selected type is invalid.'],
            ]);
        }

        $attributes['type'] = $typeValue;

        $resolved = ExclusiveOwner::resolveForService($attributes);
        $companyId = $resolved['company_id'];
        $vendorId = $resolved['packet_vendor_id'];
        $attributes = $resolved['attributes'];

        $companyOwnerId = CompanyOwnerScope::resolveId($attributes) ?? $companyId;
        if ($companyOwnerId !== null) {
            $attributes['company_owner_id'] = $companyOwnerId;
        }

        $item = DB::transaction(function () use ($attributes, $companyOwnerId, $companyId, $vendorId): Item {
            CompanyOwnerScope::assertActiveOwner($companyOwnerId);
            ExclusiveOwner::assertActiveOwner($companyId, $vendorId);

            if (($attributes['code'] ?? null) !== null && $attributes['code'] !== '') {
                $this->assertCodeUnique($companyOwnerId, $companyId, $vendorId, (string) $attributes['code']);
            }
            $this->assertNameUnique($companyOwnerId, $companyId, $vendorId, $attributes['name']);

            return Item::query()->create($attributes);
        });

        $this->forgetDependentCaches($companyOwnerId ?? $companyId);

        return $item->load(self::RELATIONS);
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    public function updateItem(Item $item, array $attributes): Item
    {
        if (array_key_exists('code', $attributes)) {
            $attributes['code'] = $attributes['code'] !== null
                ? InputNormalizer::nullableText((string) $attributes['code'])
                : null;
        }

        if (array_key_exists('name', $attributes)) {
            $attributes['name'] = InputNormalizer::text((string) $attributes['name']) ?? '';
        }

        if (array_key_exists('type', $attributes)) {
            $rawType = $attributes['type'];
            $typeValue = $rawType instanceof ItemType ? $rawType->value : (string) $rawType;

            if (ItemType::tryFrom($typeValue) === null) {
                throw ValidationException::withMessages([
                    'type' => ['The selected type is invalid.'],
                ]);
            }

            $attributes['type'] = $typeValue;
        }

        $oldCompanyId = $item->company_id !== null ? (int) $item->company_id : null;
        $oldOwnerId = $item->company_owner_id !== null ? (int) $item->company_owner_id : null;

        $updated = DB::transaction(function () use ($item, $attributes): Item {
            $locked = Item::query()->lockForUpdate()->findOrFail($item->getKey());

            $resolved = ExclusiveOwner::resolveForService($attributes, $locked);
            $targetCompanyId = $resolved['company_id'];
            $targetVendorId = $resolved['packet_vendor_id'];
            $attributes = $resolved['attributes'];

            $targetOwnerId = CompanyOwnerScope::resolveId($attributes, $locked) ?? $targetCompanyId;
            if ($targetOwnerId !== null && array_key_exists('company_owner_id', $attributes)) {
                $attributes['company_owner_id'] = $targetOwnerId;
            }

            $lockedCompanyId = $locked->company_id !== null ? (int) $locked->company_id : null;
            $lockedVendorId = $locked->packet_vendor_id !== null ? (int) $locked->packet_vendor_id : null;

            if (
                ($targetCompanyId !== $lockedCompanyId || $targetVendorId !== $lockedVendorId)
                && $locked->itemPackets()->lockForUpdate()->exists()
            ) {
                $errorField = $targetVendorId !== null && $lockedVendorId !== $targetVendorId
                    ? 'packet_vendor_id'
                    : 'company_id';

                throw ValidationException::withMessages([
                    $errorField => ['Tidak dapat mengubah pemilik karena item masih terhubung dengan paket aktif.'],
                ]);
            }

            CompanyOwnerScope::assertActiveOwner($targetOwnerId);
            ExclusiveOwner::assertActiveOwner($targetCompanyId, $targetVendorId);

            $targetCode = array_key_exists('code', $attributes) ? $attributes['code'] : $locked->code;
            if ($targetCode !== null && $targetCode !== '') {
                $this->assertCodeUnique($targetOwnerId, $targetCompanyId, $targetVendorId, (string) $targetCode, $locked->getKey());
            }

            $targetName = (string) ($attributes['name'] ?? $locked->name);
            $this->assertNameUnique($targetOwnerId, $targetCompanyId, $targetVendorId, $targetName, $locked->getKey());

            $locked->update($attributes);

            return $locked;
        });

        $newCompanyId = $updated->company_id !== null ? (int) $updated->company_id : null;
        $newOwnerId = $updated->company_owner_id !== null ? (int) $updated->company_owner_id : null;
        $this->forgetDependentCaches($oldOwnerId ?? $oldCompanyId);
        if ($newOwnerId !== $oldOwnerId || $newCompanyId !== $oldCompanyId) {
            $this->forgetDependentCaches($newOwnerId ?? $newCompanyId);
        }

        return $updated->refresh()->load(self::RELATIONS);
    }

    public function deleteItem(Item $item): void
    {
        $companyId = DB::transaction(function () use ($item): ?int {
            $locked = Item::query()->lockForUpdate()->findOrFail($item->getKey());

            if (
                class_exists('App\\Models\\ItemPacket')
                && Schema::hasTable('item_packet')
                && method_exists($locked, 'itemPackets')
            ) {
                $itemPacketIds = $locked->itemPackets()->lockForUpdate()->pluck('id')->all();
                DefaultPackageService::softDeleteForItemPacketIds(array_map('intval', $itemPacketIds));
                $locked->itemPackets()->delete();
            }

            if (
                class_exists('App\\Models\\Ingredient')
                && Schema::hasTable('ingredients')
                && method_exists($locked, 'ingredients')
            ) {
                $locked->ingredients()->delete();
            }

            $companyId = $locked->company_owner_id !== null
                ? (int) $locked->company_owner_id
                : ($locked->company_id !== null ? (int) $locked->company_id : null);
            $locked->delete();

            return $companyId;
        });

        $this->forgetDependentCaches($companyId);
    }

    private function query(Request $request): QueryBuilder
    {
        $query = IndexQuery::make(Item::class, $request)
            ->allowedFilters([
                AllowedFilter::exact('company_owner_id'),
                AllowedFilter::exact('company_id'),
                AllowedFilter::exact('packet_vendor_id'),
                AllowedFilter::exact('type'),
                AllowedFilter::callback('code', function (Builder $query, mixed $value): void {
                    $escaped = IndexQuery::escapeLike($value);
                    if ($escaped === null) {
                        return;
                    }

                    IndexQuery::whereLike($query, 'code', $escaped);
                }),
                AllowedFilter::callback('name', function (Builder $query, mixed $value): void {
                    $escaped = IndexQuery::escapeLike($value);
                    if ($escaped === null) {
                        return;
                    }

                    IndexQuery::whereLike($query, 'name', $escaped);
                }),
                AllowedFilter::callback('search', function (Builder $query, mixed $value) use ($request): void {
                    IndexQuery::applySearch($query, $value, function (Builder $searchQuery, string $escaped): void {
                        $searchQuery->where(function (Builder $likeQuery) use ($escaped): void {
                            IndexQuery::whereLike($likeQuery, 'code', $escaped);
                            IndexQuery::orWhereLike($likeQuery, 'name', $escaped);
                        });
                    }, request: $request);
                }),
            ])
            ->allowedSorts(['id', 'code', 'name', 'type', 'company_owner_id', 'company_id', 'packet_vendor_id', 'created_at', 'updated_at'])
            ->defaultSort('name', 'id');

        $availableIncludes = array_values(array_filter([
            'companyOwner',
            'company',
            'packetVendor',
            class_exists('App\\Models\\ItemPacket') ? 'itemPackets' : null,
            class_exists('App\\Models\\Packet') ? 'packets' : null,
            class_exists('App\\Models\\Ingredient') ? 'ingredients' : null,
        ]));

        if ($availableIncludes !== []) {
            $query->allowedIncludes($availableIncludes);
        }

        return $query;
    }

    private function assertCodeUnique(?int $companyOwnerId, ?int $companyId, ?int $vendorId, string $code, mixed $ignoreKey = null): void
    {
        $ownerLabel = $companyId !== null ? 'perusahaan' : 'vendor paket';

        WriteGuard::assertUniqueActive(
            Item::query(),
            'code',
            $code,
            [
                ...CompanyOwnerScope::scopeFilters($companyOwnerId),
                ...ExclusiveOwner::scopeFilters($companyId, $vendorId),
            ],
            'code',
            "Item dengan kode yang sama sudah terdaftar pada {$ownerLabel} ini.",
            $ignoreKey,
            true
        );
    }

    private function assertNameUnique(?int $companyOwnerId, ?int $companyId, ?int $vendorId, string $name, mixed $ignoreKey = null): void
    {
        $ownerLabel = $companyId !== null ? 'perusahaan' : 'vendor paket';

        WriteGuard::assertUniqueActive(
            Item::query(),
            'name',
            $name,
            [
                ...CompanyOwnerScope::scopeFilters($companyOwnerId),
                ...ExclusiveOwner::scopeFilters($companyId, $vendorId),
            ],
            'name',
            "Item dengan nama yang sama sudah terdaftar pada {$ownerLabel} ini.",
            $ignoreKey,
            true
        );
    }

    private function forgetDependentCaches(?int $companyId = null): void
    {
        CompanyOwnerScope::forgetListCache(self::CACHE_KEY_LIST, $companyId);
        Cache::forget(CpoService::CACHE_KEY);
        CompanyOwnerScope::forgetListCache(self::CACHE_KEY_ITEM_PACKETS_LIST, $companyId);
        CompanyOwnerScope::forgetListCache(self::CACHE_KEY_PACKETS_LIST, $companyId);
        CompanyOwnerScope::forgetListCache(DefaultPackageService::CACHE_KEY_LIST, $companyId);
        CompanyOwnerScope::forgetListCache('erp_foodlab:cpo:ingredients:list', $companyId);
        ActiveCompany::forgetCompanyCache($companyId);
    }
}
