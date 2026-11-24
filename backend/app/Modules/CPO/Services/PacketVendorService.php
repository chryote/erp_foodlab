<?php

namespace App\Modules\CPO\Services;

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

            // Deferred until DefaultPackage / Ingredient models and tables are created.
            if (
                class_exists('App\\Models\\DefaultPackage')
                && Schema::hasTable('default_packages')
                && method_exists($locked, 'defaultPackages')
            ) {
                $defaultPackages = $locked->defaultPackages()->lockForUpdate()->get();

                if ($defaultPackages->isNotEmpty()) {
                    if (
                        class_exists('App\\Models\\Ingredient')
                        && Schema::hasTable('ingredients')
                    ) {
                        foreach ($defaultPackages as $defaultPackage) {
                            if (method_exists($defaultPackage, 'ingredients')) {
                                $defaultPackage->ingredients()->delete();
                            }
                        }
                    }

                    $locked->defaultPackages()->delete();
                }
            }

            $locked->delete();
        });

        $this->forgetDependentCaches();
    }

    private function query(Request $request): QueryBuilder
    {
        $query = IndexQuery::make(PacketVendor::class, $request)
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
            class_exists('App\\Models\\DefaultPackage') ? 'defaultPackages' : null,
        ]));

        if ($availableIncludes !== []) {
            $query->allowedIncludes($availableIncludes);
        }

        return $query;
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
        Cache::forget(self::CACHE_KEY_DEFAULT_PACKAGES_LIST);
        Cache::forget(self::CACHE_KEY_INGREDIENTS_LIST);
    }
}
