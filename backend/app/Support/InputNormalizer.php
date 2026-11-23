<?php

namespace App\Support;

/**
 * Normalizes user-supplied text fields before validation and persistence so
 * leading/trailing or repeated whitespace cannot bypass uniqueness checks.
 */
final class InputNormalizer
{
    public static function text(?string $value): ?string
    {
        if ($value === null) {
            return null;
        }

        $trimmed = trim($value);
        if ($trimmed === '') {
            return '';
        }

        return preg_replace('/\s+/u', ' ', $trimmed) ?? $trimmed;
    }

    public static function nullableText(?string $value): ?string
    {
        $normalized = self::text($value);

        return ($normalized === null || $normalized === '') ? null : $normalized;
    }
}
