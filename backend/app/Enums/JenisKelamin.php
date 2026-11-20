<?php

namespace App\Enums;

use App\Enums\Concerns\HasEnumHelpers;

/**
 * Global enum for biological sex / gender (Jenis Kelamin).
 */
enum JenisKelamin: string
{
    use HasEnumHelpers;

    case LAKI_LAKI = 'laki_laki';
    case PEREMPUAN = 'perempuan';

    /**
     * Human-readable Indonesian display name.
     */
    public function nama(): string
    {
        return match ($this) {
            self::LAKI_LAKI => 'Laki-laki',
            self::PEREMPUAN => 'Perempuan',
        };
    }
}
