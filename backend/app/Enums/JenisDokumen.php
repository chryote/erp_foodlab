<?php

namespace App\Enums;

use App\Enums\Concerns\HasEnumHelpers;

/**
 * Global enum for HR/employee document types (Jenis Dokumen) and their allowed file formats.
 */
enum JenisDokumen: string
{
    use HasEnumHelpers;

    public const DEFAULT_MAX_SIZE_KB = 10240;

    private const FORMAT_PDF_AND_IMAGE = ['.pdf', '.jpg', '.jpeg', '.png'];

    private const FORMAT_IMAGE_ONLY = ['.jpg', '.jpeg', '.png'];

    private const FORMAT_PDF_ONLY = ['.pdf'];

    private const FORMAT_DOCUMENT = ['.pdf', '.doc', '.docx'];

    case KTP = 'ktp';
    case KK = 'kk';
    case NPWP = 'npwp';
    case BPJS_KESEHATAN = 'bpjs_kesehatan';
    case BPJS_KETENAGAKERJAAN = 'bpjs_ketenagakerjaan';
    case PAS_FOTO = 'pas_foto';
    case CV = 'cv';
    case IJAZAH = 'ijazah';
    case TRANSKRIP = 'transkrip';
    case KONTRAK_KERJA = 'kontrak_kerja';
    case SERTIFIKAT = 'sertifikat';

    /**
     * Human-readable Indonesian display name.
     */
    public function nama(): string
    {
        return match ($this) {
            self::KTP => 'KTP',
            self::KK => 'Kartu Keluarga (KK)',
            self::NPWP => 'NPWP',
            self::BPJS_KESEHATAN => 'BPJS Kesehatan',
            self::BPJS_KETENAGAKERJAAN => 'BPJS Ketenagakerjaan',
            self::PAS_FOTO => 'Pas Foto',
            self::CV => 'Curriculum Vitae (CV)',
            self::IJAZAH => 'Ijazah',
            self::TRANSKRIP => 'Transkrip Nilai',
            self::KONTRAK_KERJA => 'Kontrak Kerja',
            self::SERTIFIKAT => 'Sertifikat',
        };
    }

    /**
     * Allowed file formats with leading dots (e.g. ['.pdf', '.jpg', '.jpeg', '.png']).
     *
     * @return list<string>
     */
    public function allowedFormats(): array
    {
        return match ($this) {
            self::PAS_FOTO => self::FORMAT_IMAGE_ONLY,
            self::CV => self::FORMAT_DOCUMENT,
            self::KONTRAK_KERJA => self::FORMAT_PDF_ONLY,
            self::KTP,
            self::KK,
            self::NPWP,
            self::BPJS_KESEHATAN,
            self::BPJS_KETENAGAKERJAAN,
            self::IJAZAH,
            self::TRANSKRIP,
            self::SERTIFIKAT => self::FORMAT_PDF_AND_IMAGE,
        };
    }

    /**
     * Allowed file extensions without leading dots (for Laravel mimes/File::types rules).
     *
     * @return list<string>
     */
    public function allowedExtensions(): array
    {
        return array_map(
            static fn (string $format): string => ltrim($format, '.'),
            $this->allowedFormats(),
        );
    }

    /**
     * Laravel validation rule string for allowed file extensions (e.g. 'mimes:pdf,jpg,jpeg,png').
     */
    public function mimesRule(): string
    {
        return 'mimes:'.implode(',', $this->allowedExtensions());
    }

    /**
     * Comma-separated format list for HTML file input accept attribute.
     */
    public function acceptAttribute(): string
    {
        return implode(',', $this->allowedFormats());
    }

    /**
     * Check whether a given extension or format (with or without leading dot) is allowed.
     */
    public function isAllowedFormat(string $formatOrExtension): bool
    {
        $normalized = strtolower(ltrim(trim($formatOrExtension), '.'));

        return $normalized !== '' && in_array($normalized, $this->allowedExtensions(), true);
    }

    /**
     * Maximum allowed file size in kilobytes for this document type.
     */
    public function maxSizeKb(): int
    {
        return self::DEFAULT_MAX_SIZE_KB;
    }

    /**
     * Storage subdirectory path for this document type.
     */
    public function storageDirectory(?string $baseDirectory = null): string
    {
        $prefix = $baseDirectory !== null && trim($baseDirectory, '/') !== ''
            ? trim($baseDirectory, '/').'/'
            : '';

        return "{$prefix}documents/{$this->value}";
    }

    /**
     * Laravel file validation rules tailored to this document type.
     *
     * @return list<string>
     */
    public function validationRules(bool $required = true, ?int $maxSizeKb = null): array
    {
        return [
            $required ? 'required' : 'nullable',
            'file',
            $this->mimesRule(),
            'max:'.($maxSizeKb ?? $this->maxSizeKb()),
        ];
    }

    /**
     * All unique allowed formats across every document type.
     *
     * @return list<string>
     */
    public static function allAllowedFormats(): array
    {
        $formats = [];

        foreach (self::cases() as $case) {
            foreach ($case->allowedFormats() as $format) {
                if (! in_array($format, $formats, true)) {
                    $formats[] = $format;
                }
            }
        }

        return $formats;
    }

    /**
     * All unique allowed extensions (without leading dots) across every document type.
     *
     * @return list<string>
     */
    public static function allAllowedExtensions(): array
    {
        return array_map(
            static fn (string $format): string => ltrim($format, '.'),
            self::allAllowedFormats(),
        );
    }

    /**
     * Combined Laravel mimes rule across all document types.
     */
    public static function allMimesRule(): string
    {
        return 'mimes:'.implode(',', self::allAllowedExtensions());
    }

    /**
     * Default Laravel file validation rules across all document types.
     *
     * @return list<string>
     */
    public static function defaultValidationRules(bool $required = true, ?int $maxSizeKb = null): array
    {
        return [
            $required ? 'required' : 'nullable',
            'file',
            self::allMimesRule(),
            'max:'.($maxSizeKb ?? self::DEFAULT_MAX_SIZE_KB),
        ];
    }

    /**
     * Serialize this document type case including its allowed formats.
     *
     * @return array{value: string, nama: string, allowed_formats: list<string>}
     */
    public function toArray(): array
    {
        return [
            'value' => $this->value,
            'nama' => $this->nama(),
            'allowed_formats' => $this->allowedFormats(),
        ];
    }
}
