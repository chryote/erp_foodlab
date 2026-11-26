<?php

namespace App\Services;

use App\Enums\LabSampleStatus;
use App\Models\LabSample;
use App\Support\IndexQuery;
use App\Support\InputNormalizer;
use App\Support\WriteGuard;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;
use Spatie\QueryBuilder\AllowedFilter;
use Spatie\QueryBuilder\QueryBuilder;

class LabSampleService
{
    public const CACHE_KEY_LIST = 'erp_foodlab:samples:list';

    /**
     * Evaluate whether a sample meets food safety physicochemical thresholds.
     */
    public function evaluateQualityGrade(float $phLevel, float $moisturePercent): string
    {
        if ($phLevel < 0.0 || $phLevel > 14.0) {
            throw new InvalidArgumentException('pH level must be between 0.0 and 14.0.');
        }

        if ($moisturePercent < 0.0 || $moisturePercent > 100.0) {
            throw new InvalidArgumentException('Moisture percentage must be between 0.0 and 100.0.');
        }

        // Optimal range for neutral/slightly acidic food samples
        if ($phLevel >= 4.0 && $phLevel <= 7.2 && $moisturePercent <= 90.0) {
            return 'PASS';
        }

        if ($phLevel >= 3.2 && $phLevel <= 8.0) {
            return 'REVIEW';
        }

        return 'REJECT';
    }

    /**
     * List or paginate test samples using Spatie QueryBuilder.
     *
     * @return LengthAwarePaginator|Collection<int, LabSample>
     */
    public function list(Request $request): LengthAwarePaginator|Collection
    {
        $query = $this->query($request);

        if (IndexQuery::isPaginated($request)) {
            return IndexQuery::paginate($query, $request);
        }

        if (IndexQuery::isCacheable($request)) {
            $ttl = (int) config('prometheus.sample_list_cache_ttl', 60);

            return Cache::remember(self::CACHE_KEY_LIST, $ttl, fn () => $query->get());
        }

        return $query->get();
    }

    /**
     * Create a new lab sample and invalidate the Redis cache list.
     */
    public function createSample(array $attributes): LabSample
    {
        $attributes['batch_code'] = InputNormalizer::text((string) $attributes['batch_code']) ?? '';
        $attributes['product_name'] = InputNormalizer::text((string) $attributes['product_name']) ?? '';
        $attributes['category'] = InputNormalizer::text((string) $attributes['category']) ?? '';

        $sample = DB::transaction(function () use ($attributes) {
            WriteGuard::assertUniqueActive(
                LabSample::query(),
                'batch_code',
                (string) $attributes['batch_code'],
                [],
                'batch_code',
                'The batch code has already been taken.'
            );

            return LabSample::query()->create([
                ...$attributes,
                'status' => $attributes['status'] ?? LabSampleStatus::PENDING->value,
            ]);
        });

        Cache::forget(self::CACHE_KEY_LIST);

        return $sample;
    }

    private function query(Request $request): QueryBuilder
    {
        return IndexQuery::make(LabSample::class, $request)
            ->allowedFilters([
                AllowedFilter::exact('status'),
                AllowedFilter::exact('category'),
                AllowedFilter::callback('search', function (Builder $query, mixed $value) use ($request): void {
                    IndexQuery::applySearch($query, $value, function (Builder $searchQuery, string $escaped): void {
                        $searchQuery->where(function (Builder $likeQuery) use ($escaped): void {
                            IndexQuery::whereLike($likeQuery, 'batch_code', $escaped);
                            IndexQuery::orWhereLike($likeQuery, 'product_name', $escaped);
                        });
                    }, request: $request);
                }),
            ])
            ->allowedSorts(['id', 'batch_code', 'product_name', 'category', 'status', 'created_at'])
            ->defaultSort('-id');
    }
}
