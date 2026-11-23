<?php

namespace App\Enums;

use App\Enums\Concerns\HasEnumHelpers;

/**
 * Group classification enum for payroll items (office vs outlet).
 */
enum PayrollGroup: string
{
    use HasEnumHelpers;

    case OFFICE = 'office';
    case OUTLET = 'outlet';

    /**
     * Human-readable Indonesian display name.
     */
    public function nama(): string
    {
        return match ($this) {
            self::OFFICE => 'Office',
            self::OUTLET => 'Outlet',
        };
    }
}
