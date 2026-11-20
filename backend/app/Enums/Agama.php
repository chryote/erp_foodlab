<?php

namespace App\Enums;

use App\Enums\Concerns\HasEnumHelpers;

/**
 * Global enum for religions (Agama).
 */
enum Agama: string
{
    use HasEnumHelpers;

    case ISLAM = 'islam';
    case KRISTEN = 'kristen';
    case KATOLIK = 'katolik';
    case HINDU = 'hindu';
    case BUDDHA = 'buddha';
    case KONGHUCU = 'konghucu';
    case LAINNYA = 'lainnya';

    /**
     * Human-readable Indonesian display name.
     */
    public function nama(): string
    {
        return match ($this) {
            self::ISLAM => 'Islam',
            self::KRISTEN => 'Kristen',
            self::KATOLIK => 'Katolik',
            self::HINDU => 'Hindu',
            self::BUDDHA => 'Buddha',
            self::KONGHUCU => 'Konghucu',
            self::LAINNYA => 'Lainnya',
        };
    }
}
