<?php

namespace App\Enums\Concerns;

/**
 * Shared helper methods for global backed string enums.
 */
trait HasEnumHelpers
{
    /**
     * Alias of nama() for consistent display label access.
     */
    public function label(): string
    {
        return $this->nama();
    }

    /**
     * Serialize this enum case for API responses or dropdown options.
     *
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'value' => $this->value,
            'nama' => $this->nama(),
        ];
    }

    /**
     * Return all raw backing values in declaration order.
     *
     * @return list<string>
     */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }

    /**
     * Return all enum cases formatted as option arrays.
     *
     * @return list<array<string, mixed>>
     */
    public static function options(): array
    {
        return array_map(
            static fn (self $case): array => $case->toArray(),
            self::cases(),
        );
    }
}
