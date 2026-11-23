<?php

namespace App\Enums;

use App\Enums\Concerns\HasEnumHelpers;

/**
 * Status enum for individual employee payroll items.
 */
enum PayrollItemStatus: string
{
    use HasEnumHelpers;

    case DRAFT = 'draft';
    case FINALIZED = 'finalized';

    /**
     * Human-readable Indonesian display name.
     */
    public function nama(): string
    {
        return match ($this) {
            self::DRAFT => 'Draf',
            self::FINALIZED => 'Final',
        };
    }
}
