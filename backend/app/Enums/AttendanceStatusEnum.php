<?php

namespace App\Enums;

use App\Enums\Concerns\HasEnumHelpers;

/**
 * Status enum for employee daily attendance records.
 */
enum AttendanceStatusEnum: string
{
    use HasEnumHelpers;

    case PRESENT = 'present';
    case LATE = 'late';
    case ABSENT = 'absent';
    case LEAVE = 'leave';
    case SICK = 'sick';
    case HOLIDAY = 'holiday';

    /**
     * Human-readable Indonesian display name.
     */
    public function nama(): string
    {
        return match ($this) {
            self::PRESENT => 'Hadir',
            self::LATE => 'Terlambat',
            self::ABSENT => 'Alpa',
            self::LEAVE => 'Cuti / Izin',
            self::SICK => 'Sakit',
            self::HOLIDAY => 'Libur',
        };
    }
}
