<?php

namespace App\Modules\CPO\Services;

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
use Illuminate\Validation\ValidationException;
use Spatie\QueryBuilder\AllowedFilter;
use Spatie\QueryBuilder\QueryBuilder;

class ItemPacketService
{
    public const CACHE_KEY_LIST = 'erp_foodlab:cpo:item_packets:list';

    /**
     * @var array<int, string>
     */
    private const RELATIONS = ['packet', 'item'];

    /**
     * @return LengthAwarePaginator|Collection<int, ItemPacket>
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
    public function createItemPacket(array $attributes): ItemPacket
    {
        $attributes['quantity'] = (int) ($attributes['quantity'] ?? 1);

        $itemPacket = DB::transaction(function () use ($attributes): ItemPacket {
            $packetId = (int) $attributes['packet_id'];
            $itemId = (int) $attributes['item_id'];

            $this->assertActiveParents($packetId, $itemId);
            $this->assertPairUnique($packetId, $itemId);

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
        $updated = DB::transaction(function () use ($itemPacket, $attributes): ItemPacket {
            $locked = ItemPacket::query()->lockForUpdate()->findOrFail($itemPacket->getKey());

            $targetPacketId = (int) ($attributes['packet_id'] ?? $locked->packet_id);
            $targetItemId = (int) ($attributes['item_id'] ?? $locked->item_id);

            $this->assertActiveParents($targetPacketId, $targetItemId);
            $this->assertPairUnique($targetPacketId, $targetItemId, $locked->getKey());

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
            $locked->delete();
        });

        $this->forgetDependentCaches();
    }

    private function query(Request $request): QueryBuilder
    {
        return IndexQuery::make(ItemPacket::class, $request)
            ->allowedFilters([
                AllowedFilter::exact('packet_id'),
                AllowedFilter::exact('item_id'),
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
            ->allowedSorts(['id', 'packet_id', 'item_id', 'quantity', 'created_at', 'updated_at'])
            ->allowedIncludes(self::RELATIONS)
            ->defaultSort('id');
    }

    private function assertActiveParents(int $packetId, int $itemId): void
    {
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

        $itemExists = Item::query()
            ->whereNull('deleted_at')
            ->sharedLock()
            ->whereKey($itemId)
            ->exists();

        if (! $itemExists) {
            throw ValidationException::withMessages([
                'item_id' => ['The selected item is invalid or has been deleted.'],
            ]);
        }
    }

    private function assertPairUnique(int $packetId, int $itemId, mixed $ignoreKey = null): void
    {
        WriteGuard::assertUniqueActive(
            ItemPacket::query(),
            'item_id',
            (string) $itemId,
            ['packet_id' => $packetId],
            'item_id',
            'Item sudah terdaftar pada paket ini.',
            $ignoreKey,
            true
        );
    }

    private function forgetDependentCaches(): void
    {
        Cache::forget(self::CACHE_KEY_LIST);
        Cache::forget(PacketService::CACHE_KEY_LIST);
        Cache::forget(ItemService::CACHE_KEY_LIST);
        Cache::forget(CpoService::CACHE_KEY);
    }
}
