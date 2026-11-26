<?php

namespace App\Modules\CPO\Services;

use App\Models\PacketName;
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

class PacketNameService
{
    public const CACHE_KEY_LIST = 'erp_foodlab:cpo:packet_names:list';

    private const CACHE_KEY_DEFAULT_PACKAGES_LIST = 'erp_foodlab:cpo:default_packages:list';

    private const CACHE_KEY_INGREDIENTS_LIST = 'erp_foodlab:cpo:ingredients:list';

    /**
     * @var array<int, string>
     */
    private const RELATIONS = [];

    /**
     * @return LengthAwarePaginator|Collection<int, PacketName>
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
    public function createPacketName(array $attributes): PacketName
    {
        $attributes['name'] = InputNormalizer::text((string) $attributes['name']) ?? '';

        $packetName = DB::transaction(function () use ($attributes): PacketName {
            $this->assertNameUnique($attributes['name']);

            return PacketName::query()->create($attributes);
        });

        $this->forgetDependentCaches();

        return $packetName;
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    public function updatePacketName(PacketName $packetName, array $attributes): PacketName
    {
        if (array_key_exists('name', $attributes)) {
            $attributes['name'] = InputNormalizer::text((string) $attributes['name']) ?? '';
        }

        $updated = DB::transaction(function () use ($packetName, $attributes): PacketName {
            $locked = PacketName::query()->lockForUpdate()->findOrFail($packetName->getKey());

            $targetName = (string) ($attributes['name'] ?? $locked->name);
            $this->assertNameUnique($targetName, $locked->getKey());

            $locked->update($attributes);

            return $locked;
        });

        $this->forgetDependentCaches();

        return $updated->refresh();
    }

    public function deletePacketName(PacketName $packetName): void
    {
        DB::transaction(function () use ($packetName): void {
            $locked = PacketName::query()->lockForUpdate()->findOrFail($packetName->getKey());

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
        $query = IndexQuery::make(PacketName::class, $request)
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
            PacketName::query(),
            'name',
            $name,
            [],
            'name',
            'Nama paket yang sama sudah terdaftar.',
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
