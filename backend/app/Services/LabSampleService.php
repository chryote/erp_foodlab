<?php

namespace App\Services;

use App\Enums\LabSampleStatus;
use App\Models\LabSample;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

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
     * Retrieve recent lab samples using Redis/Cache-aside pattern.
     */
    public function listRecentSamples(int $limit = 50): Collection
    {
        $ttl = (int) config('prometheus.sample_list_cache_ttl', 60);

        return Cache::remember(self::CACHE_KEY_LIST, $ttl, function () use ($limit) {
            return LabSample::query()
                ->latest('id')
                ->limit($limit)
                ->get();
        });
    }

    /**
     * Create a new lab sample and invalidate the Redis cache list.
     */
    public function createSample(array $attributes): LabSample
    {
        $sample = DB::transaction(function () use ($attributes) {
            return LabSample::query()->create([
                ...$attributes,
                'status' => $attributes['status'] ?? LabSampleStatus::PENDING->value,
            ]);
        });

        Cache::forget(self::CACHE_KEY_LIST);

        return $sample;
    }
}
