<?php

namespace App\Services;

use App\Enums\JenisDokumen;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use RuntimeException;

class DocumentService
{
    protected string $disk;

    protected string $visibility;

    public function __construct(?string $disk = null, ?string $visibility = null)
    {
        $this->disk = $disk ?? (string) config('documents.disk', 'public');
        $this->visibility = $visibility ?? (string) config('documents.visibility', 'public');
    }

    public function disk(): string
    {
        return $this->disk;
    }

    public function visibility(): string
    {
        return $this->visibility;
    }

    /**
     * Reusable validation rules (use in FormRequests or directly via validate()).
     *
     * @return list<string>
     */
    public function rules(bool $required = true, ?JenisDokumen $documentType = null): array
    {
        $max = (int) config('documents.max_size_kb', JenisDokumen::DEFAULT_MAX_SIZE_KB);

        if ($documentType !== null) {
            return $documentType->validationRules(
                required: $required,
                maxSizeKb: $max,
            );
        }

        $configuredMimes = config('documents.allowed_mimes', []);
        $allowedMimes = is_array($configuredMimes) && $configuredMimes !== []
            ? $configuredMimes
            : JenisDokumen::allAllowedExtensions();

        $mimes = implode(',', $allowedMimes);

        return [
            $required ? 'required' : 'nullable',
            'file',
            "mimes:{$mimes}",
            "max:{$max}",
        ];
    }

    /**
     * Validate an UploadedFile directly inside the service.
     *
     * @throws ValidationException
     */
    public function validate(UploadedFile $file, ?JenisDokumen $documentType = null): void
    {
        Validator::make(
            ['file' => $file],
            ['file' => $this->rules(documentType: $documentType)]
        )->validate();
    }

    /**
     * Validate and store a document, returning its metadata.
     *
     * @return array{path: string, disk: string, original_name: string, mime_type: string, size: int, url: string}
     */
    public function upload(
        UploadedFile $file,
        string $directory = 'documents',
        bool $skipValidation = false,
        ?JenisDokumen $documentType = null,
    ): array {
        if (! $skipValidation) {
            $this->validate($file, $documentType);
        }

        $extension = $file->getClientOriginalExtension();
        $filename = Str::uuid()->toString().($extension !== '' ? ".{$extension}" : '');

        $path = Storage::disk($this->disk)->putFileAs(
            trim($directory, '/'),
            $file,
            $filename,
            ['visibility' => $this->visibility]
        );

        if ($path === false) {
            throw new RuntimeException("Failed to upload document to disk [{$this->disk}].");
        }

        return [
            'path' => $path,
            'disk' => $this->disk,
            'original_name' => $file->getClientOriginalName(),
            'mime_type' => (string) $file->getClientMimeType(),
            'size' => (int) $file->getSize(),
            'url' => $this->getAccessibleUrl($path),
        ];
    }

    /**
     * Generate a user-accessible link.
     * Uses temporary signed URLs for private cloud disks, or standard URLs for public disks.
     */
    public function getAccessibleUrl(string $path, ?int $expirationMinutes = null): string
    {
        $storage = Storage::disk($this->disk);

        if ($this->visibility === 'private' && method_exists($storage, 'temporaryUrl')) {
            try {
                $ttl = $expirationMinutes ?? (int) config('documents.temporary_url_ttl', 15);

                return $storage->temporaryUrl($path, now()->addMinutes($ttl));
            } catch (RuntimeException) {
                // Local driver doesn't support temporaryUrl natively without custom route
            }
        }

        return $storage->url($path);
    }

    /**
     * Delete a stored document.
     */
    public function delete(string $path): bool
    {
        if (! Storage::disk($this->disk)->exists($path)) {
            return false;
        }

        return Storage::disk($this->disk)->delete($path);
    }
}
