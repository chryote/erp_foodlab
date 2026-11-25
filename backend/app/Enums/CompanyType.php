<?php

namespace App\Enums;

use App\Enums\Concerns\HasEnumHelpers;

/**
 * Classification enum for CFO companies.
 */
enum CompanyType: string
{
    use HasEnumHelpers;

    case Utama = 'Utama';
    case Packing = 'Packing';
    case Produksi = 'Produksi';

    /**
     * Human-readable Indonesian display name.
     */
    public function nama(): string
    {
        return match ($this) {
            self::Utama => 'Utama',
            self::Packing => 'Packing',
            self::Produksi => 'Produksi',
        };
    }
}
