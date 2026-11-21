<?php

use App\Enums\JenisDokumen;

return [
    /*
    |--------------------------------------------------------------------------
    | Document Storage Disk & Visibility
    |--------------------------------------------------------------------------
    |
    | Switch between local ('public', 'local') and cloud ('s3', 'r2', 'gcs')
    | disks via environment variables without changing service code.
    |
    */
    'disk' => env('DOCUMENTS_DISK', 'public'),

    'visibility' => env('DOCUMENTS_VISIBILITY', 'public'),

    /*
    |--------------------------------------------------------------------------
    | Validation Defaults
    |--------------------------------------------------------------------------
    */
    'allowed_mimes' => JenisDokumen::allAllowedExtensions(),

    'max_size_kb' => (int) env('DOCUMENTS_MAX_SIZE_KB', JenisDokumen::DEFAULT_MAX_SIZE_KB),

    /*
    |--------------------------------------------------------------------------
    | Temporary Signed URL TTL (Minutes)
    |--------------------------------------------------------------------------
    */
    'temporary_url_ttl' => (int) env('DOCUMENTS_TEMPORARY_URL_TTL', 15),
];
