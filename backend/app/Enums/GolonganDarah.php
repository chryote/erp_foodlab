<?php

namespace App\Enums;

use App\Enums\Concerns\HasEnumHelpers;

/**
 * Global enum for ABO blood types (Golongan Darah).
 */
enum GolonganDarah: string
{
    use HasEnumHelpers;

    case A = 'a';
    case B = 'b';
    case AB = 'ab';
    case O = 'o';
    case TIDAK_TAHU = 'tidak_tahu';

    /**
     * Human-readable Indonesian display name.
     */
    public function nama(): string
    {
        return match ($this) {
            self::A => 'A',
            self::B => 'B',
            self::AB => 'AB',
            self::O => 'O',
            self::TIDAK_TAHU => 'Tidak Tahu',
        };
    }
}
