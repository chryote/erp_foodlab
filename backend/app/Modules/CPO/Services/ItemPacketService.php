<?php

namespace App\Modules\CPO\Services;

use App\Models\Company;
use App\Models\Item;
use App\Models\ItemPacket;
use App\Models\Packet;
use App\Support\IndexQuery;
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

class ItemPacketService
{
    public const CACHE_KEY_LIST = 'erp_foodlab:cpo:item_packets:list';

    /**
     * @var array<int, string>
     */
    private const RELATIONS = ['company', 'packet', 'item'];

    /**
     * @return LengthAwarePaginator|Collection<int, ItemPacket>
     */
    public function list(Request $request): LengthAwarePaginator|Collection
    {
        $query = IndexQuery::withDefaultRelations($this->query($request), $request, self::RELATIONS);

        IndexQuery::applyActiveCompanyFilter($query->getEloquentBuilder(), $request);

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
    public function createItemPacket(array $attributes): ItemPacket
    {
        $attributes['company_id'] = (int) $attributes['company_id'];
        $attributes['quantity'] = (int) ($attributes['quantity'] ?? 1);

        $itemPacket = DB::transaction(function () use ($attributes): ItemPacket {
            $companyId = (int) $attributes['company_id'];
            $packetId = (int) $attributes['packet_id'];
            $itemId = (int) $attributes['item_id'];

            $this->assertActiveParents($companyId, $packetId, $itemId);
            $this->assertPairUnique($companyId, $packetId, $itemId);

            return ItemPacket::query()->create($attributes);
        });

        $this->forgetDependentCaches();

        return $itemPacket->load(self::RELATIONS);
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    public function updateItemPacket(ItemPacket $itemPacket, array $attributes): ItemPacket
    {
        if (array_key_exists('company_id', $attributes)) {
            $attributes['company_id'] = (int) $attributes['company_id'];
        }

        $updated = DB::transaction(function () use ($itemPacket, $attributes): ItemPacket {
            $locked = ItemPacket::query()->lockForUpdate()->findOrFail($itemPacket->getKey());

            $targetCompanyId = (int) ($attributes['company_id'] ?? $locked->company_id);
            $targetPacketId = (int) ($attributes['packet_id'] ?? $locked->packet_id);
            $targetItemId = (int) ($attributes['item_id'] ?? $locked->item_id);

            $this->assertActiveParents($targetCompanyId, $targetPacketId, $targetItemId);
            $this->assertPairUnique($targetCompanyId, $targetPacketId, $targetItemId, $locked->getKey());

            $locked->update($attributes);

            return $locked;
        });

        $this->forgetDependentCaches();

        return $updated->refresh()->load(self::RELATIONS);
    }

    public function deleteItemPacket(ItemPacket $itemPacket): void
    {
        DB::transaction(function () use ($itemPacket): void {
            $locked = ItemPacket::query()->lockForUpdate()->findOrFail($itemPacket->getKey());
            DefaultPackageService::softDeleteForItemPacketIds([(int) $locked->getKey()]);
            $locked->delete();
        });

        $this->forgetDependentCaches();
    }

    private function query(Request $request): QueryBuilder
    {
        return IndexQuery::make(ItemPacket::class, $request)
            ->allowedFilters([
                AllowedFilter::exact('company_id'),
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
            ->allowedSorts(['id', 'company_id', 'packet_id', 'item_id', 'quantity', 'created_at', 'updated_at'])
            ->allowedIncludes([...self::RELATIONS, ...(class_exists('App\\Models\\DefaultPackage') ? ['defaultPackages'] : [])])
            ->defaultSort('id');
    }

    private function assertActiveParents(int $companyId, int $packetId, int $itemId): void
    {
        $companyExists = Company::query()
            ->whereNull('deleted_at')
            ->sharedLock()
            ->whereKey($companyId)
            ->exists();

        if (! $companyExists) {
            throw ValidationException::withMessages([
                'company_id' => ['The selected company is invalid or has been deleted.'],
            ]);
        }

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

        if ((int) $item->company_id !== $companyId) {
            throw ValidationException::withMessages([
                'item_id' => ['The selected item does not belong to the selected company.'],
            ]);
        }
    }

    private function assertPairUnique(int $companyId, int $packetId, int $itemId, mixed $ignoreKey = null): void
    {
        WriteGuard::assertUniqueActive(
            ItemPacket::query(),
            'item_id',
            (string) $itemId,
            [
                'company_id' => $companyId,
                'packet_id' => $packetId,
            ],
            'item_id',
            'Item sudah terdaftar pada paket ini untuk perusahaan ini.',
            $ignoreKey,
            true
        );
    }

    private function forgetDependentCaches(): void
    {
        Cache::forget(self::CACHE_KEY_LIST);
        Cache::forget(PacketService::CACHE_KEY_LIST);
        Cache::forget(ItemService::CACHE_KEY_LIST);
        Cache::forget(DefaultPackageService::CACHE_KEY_LIST);
        Cache::forget('erp_foodlab:cpo:ingredients:list');
        Cache::forget(CpoService::CACHE_KEY);
    }
}
