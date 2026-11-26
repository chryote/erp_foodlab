<?php

namespace App\Enums;

use App\Enums\Concerns\HasEnumHelpers;

/**
 * Classification enum for CPO packet vendors.
 */
enum PacketVendorType: string
{
    use HasEnumHelpers;

    case Bahan = 'Bahan';
    case Kelengkapan = 'Kelengkapan';
    case Sarpras = 'Sarpras';

    /**
     * Human-readable Indonesian display name.
     */
    public function nama(): string
    {
        return match ($this) {
            self::Bahan => 'Bahan',
            self::Kelengkapan => 'Kelengkapan',
            self::Sarpras => 'Sarpras',
        };
    }
}
