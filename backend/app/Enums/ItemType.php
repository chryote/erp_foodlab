<?php

namespace App\Enums;

use App\Enums\Concerns\HasEnumHelpers;

/**
 * Classification enum for CPO inventory items.
 */
enum ItemType: string
{
    use HasEnumHelpers;

    case Bahan = 'Bahan';
    case Peralatan = 'Peralatan';
    case PaketUsaha = 'Paket Usaha';

    /**
     * Human-readable Indonesian display name.
     */
    public function nama(): string
    {
        return match ($this) {
            self::Bahan => 'Bahan',
            self::Peralatan => 'Peralatan',
            self::PaketUsaha => 'Paket Usaha',
        };
    }
}
