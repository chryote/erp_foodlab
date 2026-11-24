<?php

namespace App\Modules\CPO\Services;

use App\Models\Item;
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

class ItemService
{
    public const CACHE_KEY_LIST = 'erp_foodlab:cpo:items:list';

    private const CACHE_KEY_ITEM_PACKETS_LIST = 'erp_foodlab:cpo:item_packets:list';

    private const CACHE_KEY_PACKETS_LIST = 'erp_foodlab:cpo:packets:list';

    /**
     * @var array<int, string>
     */
    private const RELATIONS = [];

    /**
     * @return LengthAwarePaginator|Collection<int, Item>
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
    public function createItem(array $attributes): Item
    {
        $attributes['name'] = InputNormalizer::text((string) $attributes['name']) ?? '';

        $item = DB::transaction(function () use ($attributes): Item {
            $this->assertNameUnique($attributes['name']);

            return Item::query()->create($attributes);
        });

        $this->forgetDependentCaches();

        return $item;
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    public function updateItem(Item $item, array $attributes): Item
    {
        if (array_key_exists('name', $attributes)) {
            $attributes['name'] = InputNormalizer::text((string) $attributes['name']) ?? '';
        }

        $updated = DB::transaction(function () use ($item, $attributes): Item {
            $locked = Item::query()->lockForUpdate()->findOrFail($item->getKey());

            $targetName = (string) ($attributes['name'] ?? $locked->name);
            $this->assertNameUnique($targetName, $locked->getKey());

            $locked->update($attributes);

            return $locked;
        });

        $this->forgetDependentCaches();

        return $updated->refresh();
    }

    public function deleteItem(Item $item): void
    {
        DB::transaction(function () use ($item): void {
            $locked = Item::query()->lockForUpdate()->findOrFail($item->getKey());

            // Deferred until ItemPacket & Packet models/tables are created.
            if (
                class_exists('App\\Models\\ItemPacket')
                && Schema::hasTable('item_packet')
                && method_exists($locked, 'itemPackets')
            ) {
                $locked->itemPackets()->delete();
            }

            $locked->delete();
        });

        $this->forgetDependentCaches();
    }

    private function query(Request $request): QueryBuilder
    {
        $query = IndexQuery::make(Item::class, $request)
            ->allowedFilters([
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
            ->allowedSorts(['id', 'name', 'created_at', 'updated_at'])
            ->defaultSort('name', 'id');

        $availableIncludes = array_values(array_filter([
            class_exists('App\\Models\\ItemPacket') ? 'itemPackets' : null,
            class_exists('App\\Models\\Packet') ? 'packets' : null,
        ]));

        if ($availableIncludes !== []) {
            $query->allowedIncludes($availableIncludes);
        }

        return $query;
    }

    private function assertNameUnique(string $name, mixed $ignoreKey = null): void
    {
        WriteGuard::assertUniqueActive(
            Item::query(),
            'name',
            $name,
            [],
            'name',
            'Item dengan nama yang sama sudah terdaftar.',
            $ignoreKey,
            true
        );
    }

    private function forgetDependentCaches(): void
    {
        Cache::forget(self::CACHE_KEY_LIST);
        Cache::forget(CpoService::CACHE_KEY);
        Cache::forget(self::CACHE_KEY_ITEM_PACKETS_LIST);
        Cache::forget(self::CACHE_KEY_PACKETS_LIST);
    }
}
