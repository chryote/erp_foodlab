<?php

namespace App\Enums;

use App\Enums\Concerns\HasEnumHelpers;

/**
 * Status enum for monthly payroll runs.
 */
enum PayrollRunStatus: string
{
    use HasEnumHelpers;

    case DRAFT = 'draft';
    case PENDING = 'pending';
    case APPROVED = 'approved';
    case VOID = 'void';

    /**
     * Human-readable Indonesian display name.
     */
    public function nama(): string
    {
        return match ($this) {
            self::DRAFT => 'Draf',
            self::PENDING => 'Menunggu Persetujuan',
            self::APPROVED => 'Disetujui',
            self::VOID => 'Dibatalkan',
        };
    }

    /**
     * Determine whether transitioning from this status to the target status is allowed.
     */
    public function canTransitionTo(self $target): bool
    {
        if ($this === $target) {
            return true;
        }

        return match ($this) {
            self::DRAFT => in_array($target, [self::PENDING, self::APPROVED, self::VOID], true),
            self::PENDING => in_array($target, [self::DRAFT, self::APPROVED, self::VOID], true),
            self::APPROVED => $target === self::VOID,
            self::VOID => false,
        };
    }
}
