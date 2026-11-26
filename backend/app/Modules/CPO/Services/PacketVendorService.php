<?php

namespace App\Modules\CPO\Services;

use App\Enums\PacketVendorType;
use App\Models\DefaultPackage;
use App\Models\Ingredient;
use App\Models\Item;
use App\Models\ItemPacket;
use App\Models\PacketVendor;
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
    public function createPacketVendor(array $attributes): PacketVendor
    {
        $attributes['name'] = InputNormalizer::text((string) $attributes['name']) ?? '';
        $attributes['type'] = $this->resolveTypeValue($attributes['type'] ?? PacketVendorType::Bahan->value);

        $packetVendor = DB::transaction(function () use ($attributes): PacketVendor {
            $this->assertNameUnique($attributes['name']);

            return PacketVendor::query()->create($attributes);
        });

        $this->forgetDependentCaches();

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

        $updated = DB::transaction(function () use ($packetVendor, $attributes): PacketVendor {
            $locked = PacketVendor::query()->lockForUpdate()->findOrFail($packetVendor->getKey());

            $targetName = (string) ($attributes['name'] ?? $locked->name);
            $this->assertNameUnique($targetName, $locked->getKey());

            $locked->update($attributes);

            return $locked;
        });

        $this->forgetDependentCaches();

        return $updated->refresh();
    }

    public function deletePacketVendor(PacketVendor $packetVendor): void
    {
        DB::transaction(function () use ($packetVendor): void {
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

            $locked->delete();
        });

        $this->forgetDependentCaches();

        if (in_array((string) config('scout.driver', 'null'), ['meilisearch', 'collection'], true)) {
            Item::onlyTrashed()->where('packet_vendor_id', $packetVendor->getKey())->unsearchable();
        }
    }

    private function query(Request $request): QueryBuilder
    {
        $query = IndexQuery::make(PacketVendor::class, $request)
            ->allowedFilters([
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
            ->allowedSorts(['id', 'name', 'type', 'created_at', 'updated_at'])
            ->defaultSort('name', 'id');

        $availableIncludes = array_values(array_filter([
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

    private function assertNameUnique(string $name, mixed $ignoreKey = null): void
    {
        WriteGuard::assertUniqueActive(
            PacketVendor::query(),
            'name',
            $name,
            [],
            'name',
            'Nama vendor paket yang sama sudah terdaftar.',
            $ignoreKey,
            true
        );
    }

    private function forgetDependentCaches(): void
    {
        Cache::forget(self::CACHE_KEY_LIST);
        Cache::forget(CpoService::CACHE_KEY);
        Cache::forget(ItemService::CACHE_KEY_LIST);
        Cache::forget(ItemPacketService::CACHE_KEY_LIST);
        Cache::forget(PacketService::CACHE_KEY_LIST);
        Cache::forget(self::CACHE_KEY_DEFAULT_PACKAGES_LIST);
        Cache::forget(self::CACHE_KEY_INGREDIENTS_LIST);
    }
}
