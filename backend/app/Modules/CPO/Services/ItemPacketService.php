<?php

namespace App\Modules\CPO\Services;

use App\Models\Item;
use App\Models\ItemPacket;
use App\Models\Packet;
use App\Support\CompanyOwnerScope;
use App\Support\ExclusiveOwner;
use App\Support\IndexQuery;
use App\Support\WriteGuard;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Spatie\QueryBuilder\AllowedFilter;
use Spatie\QueryBuilder\QueryBuilder;

class ItemPacketService
{
    public const CACHE_KEY_LIST = 'erp_foodlab:cpo:item_packets:list';

    /**
     * @var array<int, string>
     */
    private const RELATIONS = ['company', 'packetVendor', 'packet', 'item'];

    /**
     * @return LengthAwarePaginator|Collection<int, ItemPacket>
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
    public function createItemPacket(array $attributes): ItemPacket
    {
        $attributes['quantity'] = (int) ($attributes['quantity'] ?? 1);
        $resolved = ExclusiveOwner::resolveForService($attributes);
        $companyId = $resolved['company_id'];
        $vendorId = $resolved['packet_vendor_id'];
        $attributes = $resolved['attributes'];

        $companyOwnerId = CompanyOwnerScope::resolveId($attributes) ?? $companyId;
        if ($companyOwnerId !== null) {
            $attributes['company_owner_id'] = $companyOwnerId;
        }

        $itemPacket = DB::transaction(function () use ($attributes, $companyOwnerId, $companyId, $vendorId): ItemPacket {
            $packetId = (int) $attributes['packet_id'];
            $itemId = (int) $attributes['item_id'];

            CompanyOwnerScope::assertActiveOwner($companyOwnerId);
            $this->assertActiveParents($companyId, $vendorId, $packetId, $itemId);
            $this->assertPairUnique($companyOwnerId, $companyId, $vendorId, $packetId, $itemId);

            return ItemPacket::query()->create($attributes);
        });

        $this->forgetDependentCaches($companyOwnerId);

        return $itemPacket->load(self::RELATIONS);
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    public function updateItemPacket(ItemPacket $itemPacket, array $attributes): ItemPacket
    {
        $oldOwnerId = $itemPacket->company_owner_id !== null ? (int) $itemPacket->company_owner_id : null;

        $updated = DB::transaction(function () use ($itemPacket, $attributes): ItemPacket {
            $locked = ItemPacket::query()->lockForUpdate()->findOrFail($itemPacket->getKey());

            $resolved = ExclusiveOwner::resolveForService($attributes, $locked);
            $targetCompanyId = $resolved['company_id'];
            $targetVendorId = $resolved['packet_vendor_id'];
            $attributes = $resolved['attributes'];

            $targetOwnerId = CompanyOwnerScope::resolveId($attributes, $locked) ?? $targetCompanyId;
            if ($targetOwnerId !== null && array_key_exists('company_owner_id', $attributes)) {
                $attributes['company_owner_id'] = $targetOwnerId;
            }

            $targetPacketId = (int) ($attributes['packet_id'] ?? $locked->packet_id);
            $targetItemId = (int) ($attributes['item_id'] ?? $locked->item_id);

            CompanyOwnerScope::assertActiveOwner($targetOwnerId);
            $this->assertActiveParents($targetCompanyId, $targetVendorId, $targetPacketId, $targetItemId);
            $this->assertPairUnique($targetOwnerId, $targetCompanyId, $targetVendorId, $targetPacketId, $targetItemId, $locked->getKey());

            $locked->update($attributes);

            return $locked;
        });

        $newOwnerId = $updated->company_owner_id !== null ? (int) $updated->company_owner_id : null;
        $this->forgetDependentCaches($oldOwnerId);
        if ($newOwnerId !== $oldOwnerId) {
            $this->forgetDependentCaches($newOwnerId);
        }

        return $updated->refresh()->load(self::RELATIONS);
    }

    public function deleteItemPacket(ItemPacket $itemPacket): void
    {
        $ownerId = DB::transaction(function () use ($itemPacket): ?int {
            $locked = ItemPacket::query()->lockForUpdate()->findOrFail($itemPacket->getKey());
            DefaultPackageService::softDeleteForItemPacketIds([(int) $locked->getKey()]);
            $ownerId = $locked->company_owner_id !== null ? (int) $locked->company_owner_id : null;
            $locked->delete();

            return $ownerId;
        });

        $this->forgetDependentCaches($ownerId);
    }

    private function query(Request $request): QueryBuilder
    {
        return IndexQuery::make(ItemPacket::class, $request)
            ->allowedFilters([
                AllowedFilter::exact('company_owner_id'),
                AllowedFilter::exact('company_id'),
                AllowedFilter::exact('packet_vendor_id'),
                AllowedFilter::exact('packet_id'),
                AllowedFilter::exact('item_id'),
                AllowedFilter::callback('item_type', function (Builder $query, mixed $value): void {
                    if (is_array($value)) {
                        return;
                    }

                    $trimmed = trim((string) $value);
                    if ($trimmed === '') {
                        return;
                    }

                    $query->whereHas('item', fn (Builder $itemQuery) => $itemQuery->where('type', $trimmed));
                }),
                AllowedFilter::callback('search', function (Builder $query, mixed $value): void {
                    $escaped = IndexQuery::escapeLike($value);
                    if ($escaped === null) {
                        return;
                    }

                    $query->where(function (Builder $searchQuery) use ($escaped): void {
                        $searchQuery->whereHas(
                            'item',
                            fn (Builder $itemQuery) => IndexQuery::whereLike($itemQuery, 'name', $escaped)
                        );
                        $searchQuery->orWhereHas(
                            'packet',
                            fn (Builder $packetQuery) => IndexQuery::whereLike($packetQuery, 'name', $escaped)
                        );
                    });
                }),
                AllowedFilter::callback('quantity_min', function (Builder $query, mixed $value): void {
                    if (is_array($value)) {
                        return;
                    }

                    $trimmed = trim((string) $value);
                    if ($trimmed === '' || ! is_numeric($trimmed)) {
                        return;
                    }

                    $query->where('quantity', '>=', (int) $trimmed);
                }),
                AllowedFilter::callback('quantity_max', function (Builder $query, mixed $value): void {
                    if (is_array($value)) {
                        return;
                    }

                    $trimmed = trim((string) $value);
                    if ($trimmed === '' || ! is_numeric($trimmed)) {
                        return;
                    }

                    $query->where('quantity', '<=', (int) $trimmed);
                }),
            ])
            ->allowedSorts(['id', 'company_owner_id', 'company_id', 'packet_vendor_id', 'packet_id', 'item_id', 'quantity', 'created_at', 'updated_at'])
            ->allowedIncludes(['companyOwner', ...self::RELATIONS, ...(class_exists('App\\Models\\DefaultPackage') ? ['defaultPackages'] : [])])
            ->defaultSort('id');
    }

    private function assertActiveParents(?int $companyId, ?int $packetVendorId, int $packetId, int $itemId): void
    {
        ExclusiveOwner::assertActiveOwner($companyId, $packetVendorId);

        $packetExists = Packet::query()
            ->whereNull('deleted_at')
            ->sharedLock()
            ->whereKey($packetId)
            ->exists();

        if (! $packetExists) {
            throw ValidationException::withMessages([
                'packet_id' => ['The selected packet is invalid or has been deleted.'],
            ]);
        }

        $item = Item::query()
            ->whereNull('deleted_at')
            ->sharedLock()
            ->find($itemId);

        if ($item === null) {
            throw ValidationException::withMessages([
                'item_id' => ['The selected item is invalid or has been deleted.'],
            ]);
        }

        $itemCompanyId = $item->company_id !== null ? (int) $item->company_id : null;
        $itemVendorId = $item->packet_vendor_id !== null ? (int) $item->packet_vendor_id : null;

        if ($companyId !== null && ($itemCompanyId !== $companyId || $itemVendorId !== null)) {
            throw ValidationException::withMessages([
                'item_id' => ['The selected item does not belong to the selected company.'],
            ]);
        }

        if ($packetVendorId !== null && ($itemVendorId !== $packetVendorId || $itemCompanyId !== null)) {
            throw ValidationException::withMessages([
                'item_id' => ['The selected item does not belong to the selected packet vendor.'],
            ]);
        }
    }

    private function assertPairUnique(?int $companyOwnerId, ?int $companyId, ?int $packetVendorId, int $packetId, int $itemId, mixed $ignoreKey = null): void
    {
        $ownerLabel = $companyId !== null ? 'perusahaan' : 'vendor paket';

        WriteGuard::assertUniqueActive(
            ItemPacket::query(),
            'item_id',
            (string) $itemId,
            [
                ...CompanyOwnerScope::scopeFilters($companyOwnerId),
                ...ExclusiveOwner::scopeFilters($companyId, $packetVendorId),
                'packet_id' => $packetId,
            ],
            'item_id',
            "Item sudah terdaftar pada paket ini untuk {$ownerLabel} ini.",
            $ignoreKey,
            true
        );
    }

    private function forgetDependentCaches(?int $ownerId = null): void
    {
        CompanyOwnerScope::forgetListCache(self::CACHE_KEY_LIST, $ownerId);
        CompanyOwnerScope::forgetListCache(PacketService::CACHE_KEY_LIST, $ownerId);
        CompanyOwnerScope::forgetListCache(PacketVendorService::CACHE_KEY_LIST, $ownerId);
        CompanyOwnerScope::forgetListCache(ItemService::CACHE_KEY_LIST, $ownerId);
        CompanyOwnerScope::forgetListCache(DefaultPackageService::CACHE_KEY_LIST, $ownerId);
        CompanyOwnerScope::forgetListCache('erp_foodlab:cpo:ingredients:list', $ownerId);
        Cache::forget(CpoService::CACHE_KEY);
    }
}
