<?php

namespace App\Modules\CPO\Services;

use App\Models\Packet;
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
use Spatie\QueryBuilder\AllowedFilter;
use Spatie\QueryBuilder\QueryBuilder;

class PacketService
{
    public const CACHE_KEY_LIST = 'erp_foodlab:cpo:packets:list';

    private const CACHE_KEY_ITEM_PACKETS_LIST = 'erp_foodlab:cpo:item_packets:list';

    /**
     * @var array<int, string>
     */
    private const RELATIONS = [];

    /**
     * @return LengthAwarePaginator|Collection<int, Packet>
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
    public function createPacket(array $attributes): Packet
    {
        $attributes['name'] = InputNormalizer::text((string) $attributes['name']) ?? '';
        $companyOwnerId = CompanyOwnerScope::resolveId($attributes);
        if ($companyOwnerId !== null) {
            $attributes['company_owner_id'] = $companyOwnerId;
        }

        $packet = DB::transaction(function () use ($attributes, $companyOwnerId): Packet {
            CompanyOwnerScope::assertActiveOwner($companyOwnerId);
            $this->assertNameUnique($companyOwnerId, $attributes['name']);

            return Packet::query()->create($attributes);
        });

        $this->forgetDependentCaches($companyOwnerId);

        return $packet;
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    public function updatePacket(Packet $packet, array $attributes): Packet
    {
        if (array_key_exists('name', $attributes)) {
            $attributes['name'] = InputNormalizer::text((string) $attributes['name']) ?? '';
        }

        $oldOwnerId = $packet->company_owner_id !== null ? (int) $packet->company_owner_id : null;

        $updated = DB::transaction(function () use ($packet, $attributes): Packet {
            $locked = Packet::query()->lockForUpdate()->findOrFail($packet->getKey());

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

    public function deletePacket(Packet $packet): void
    {
        $ownerId = DB::transaction(function () use ($packet): ?int {
            $locked = Packet::query()->lockForUpdate()->findOrFail($packet->getKey());

            // Deferred until ItemPacket model/table is created.
            if (
                class_exists('App\\Models\\ItemPacket')
                && Schema::hasTable('item_packet')
                && method_exists($locked, 'itemPackets')
            ) {
                $itemPacketIds = $locked->itemPackets()->lockForUpdate()->pluck('id')->all();
                DefaultPackageService::softDeleteForItemPacketIds(array_map('intval', $itemPacketIds));
                $locked->itemPackets()->delete();
            }

            DefaultPackageService::softDeleteForPacketIds([(int) $locked->getKey()]);

            $ownerId = $locked->company_owner_id !== null ? (int) $locked->company_owner_id : null;
            $locked->delete();

            return $ownerId;
        });

        $this->forgetDependentCaches($ownerId);
    }

    private function query(Request $request): QueryBuilder
    {
        $query = IndexQuery::make(Packet::class, $request)
            ->allowedFilters([
                AllowedFilter::exact('company_owner_id'),
                AllowedFilter::callback('name', function (Builder $query, mixed $value): void {
                    $escaped = IndexQuery::escapeLike($value);
                    if ($escaped === null) {
                        return;
                    }

                    IndexQuery::whereLike($query, 'name', $escaped);
                }),
                AllowedFilter::callback('search', function (Builder $query, mixed $value) use ($request): void {
                    IndexQuery::applySearch($query, $value, function (Builder $searchQuery, string $escaped): void {
                        IndexQuery::whereLike($searchQuery, 'name', $escaped);
                    }, request: $request);
                }),
            ])
            ->allowedSorts(['id', 'company_owner_id', 'name', 'created_at', 'updated_at'])
            ->defaultSort('name', 'id');

        $availableIncludes = array_values(array_filter([
            'companyOwner',
            class_exists('App\\Models\\ItemPacket') ? 'itemPackets' : null,
            class_exists('App\\Models\\ItemPacket') ? 'items' : null,
        ]));

        if ($availableIncludes !== []) {
            $query->allowedIncludes($availableIncludes);
        }

        return $query;
    }

    private function assertNameUnique(?int $companyOwnerId, string $name, mixed $ignoreKey = null): void
    {
        WriteGuard::assertUniqueActive(
            Packet::query(),
            'name',
            $name,
            CompanyOwnerScope::scopeFilters($companyOwnerId),
            'name',
            'Paket dengan nama yang sama sudah terdaftar.',
            $ignoreKey,
            true
        );
    }

    private function forgetDependentCaches(?int $ownerId = null): void
    {
        CompanyOwnerScope::forgetListCache(self::CACHE_KEY_LIST, $ownerId);
        Cache::forget(CpoService::CACHE_KEY);
        CompanyOwnerScope::forgetListCache(self::CACHE_KEY_ITEM_PACKETS_LIST, $ownerId);
        CompanyOwnerScope::forgetListCache(ItemService::CACHE_KEY_LIST, $ownerId);
        CompanyOwnerScope::forgetListCache(DefaultPackageService::CACHE_KEY_LIST, $ownerId);
        CompanyOwnerScope::forgetListCache('erp_foodlab:cpo:ingredients:list', $ownerId);
    }
}
