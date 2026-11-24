<?php

namespace App\Modules\CPO\Services;

use App\Enums\ItemType;
use App\Models\Company;
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
    private const RELATIONS = ['company'];

    /**
     * @return LengthAwarePaginator|Collection<int, Item>
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
    public function createItem(array $attributes): Item
    {
        $attributes['company_id'] = (int) $attributes['company_id'];
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

        $item = DB::transaction(function () use ($attributes): Item {
            $this->assertActiveCompany($attributes['company_id']);
            $this->assertNameUnique($attributes['company_id'], $attributes['name']);

            return Item::query()->create($attributes);
        });

        $this->forgetDependentCaches();

        return $item->load(self::RELATIONS);
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    public function updateItem(Item $item, array $attributes): Item
    {
        if (array_key_exists('company_id', $attributes)) {
            $attributes['company_id'] = (int) $attributes['company_id'];
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

        $updated = DB::transaction(function () use ($item, $attributes): Item {
            $locked = Item::query()->lockForUpdate()->findOrFail($item->getKey());

            $targetCompanyId = (int) ($attributes['company_id'] ?? $locked->company_id);

            if ($targetCompanyId !== (int) $locked->company_id && $locked->itemPackets()->lockForUpdate()->exists()) {
                throw ValidationException::withMessages([
                    'company_id' => ['Tidak dapat mengubah perusahaan karena item masih terhubung dengan paket aktif.'],
                ]);
            }

            $this->assertActiveCompany($targetCompanyId);

            $targetName = (string) ($attributes['name'] ?? $locked->name);
            $this->assertNameUnique($targetCompanyId, $targetName, $locked->getKey());

            $locked->update($attributes);

            return $locked;
        });

        $this->forgetDependentCaches();

        return $updated->refresh()->load(self::RELATIONS);
    }

    public function deleteItem(Item $item): void
    {
        DB::transaction(function () use ($item): void {
            $locked = Item::query()->lockForUpdate()->findOrFail($item->getKey());

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
                AllowedFilter::exact('company_id'),
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
            ->allowedSorts(['id', 'name', 'type', 'company_id', 'created_at', 'updated_at'])
            ->defaultSort('name', 'id');

        $availableIncludes = array_values(array_filter([
            'company',
            class_exists('App\\Models\\ItemPacket') ? 'itemPackets' : null,
            class_exists('App\\Models\\Packet') ? 'packets' : null,
        ]));

        if ($availableIncludes !== []) {
            $query->allowedIncludes($availableIncludes);
        }

        return $query;
    }

    private function assertActiveCompany(int $companyId): void
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
    }

    private function assertNameUnique(int $companyId, string $name, mixed $ignoreKey = null): void
    {
        WriteGuard::assertUniqueActive(
            Item::query(),
            'name',
            $name,
            ['company_id' => $companyId],
            'name',
            'Item dengan nama yang sama sudah terdaftar pada perusahaan ini.',
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
