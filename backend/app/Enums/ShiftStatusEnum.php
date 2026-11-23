<?php

namespace App\Enums;

use App\Enums\Concerns\HasEnumHelpers;

/**
 * Status enum for employee work shifts.
 */
enum ShiftStatusEnum: string
{
    use HasEnumHelpers;

    case ACTIVE = 'active';
    case INACTIVE = 'inactive';

    /**
     * Human-readable Indonesian display name.
     */
    public function nama(): string
    {
        return match ($this) {
            self::ACTIVE => 'Aktif',
            self::INACTIVE => 'Tidak Aktif',
        };
    }
}
