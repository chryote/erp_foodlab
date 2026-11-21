<?php

use App\Enums\JenisDokumen;
use App\Services\DocumentService;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

describe('DocumentService and DocumentController', function () {
    beforeEach(function () {
        Storage::fake('public');
        Storage::fake('local');
    });

    it('loads defaults from documents config and JenisDokumen enum', function () {
        $service = app(DocumentService::class);

        expect(config('documents.disk'))->toBe('public')
            ->and(config('documents.visibility'))->toBe('public')
            ->and(config('documents.allowed_mimes'))->toBe(JenisDokumen::allAllowedExtensions())
            ->and(config('documents.max_size_kb'))->toBe(10240)
            ->and(config('documents.temporary_url_ttl'))->toBe(15)
            ->and($service->disk())->toBe('public')
            ->and($service->visibility())->toBe('public')
            ->and($service->rules())->toBe([
                'required',
                'file',
                'mimes:pdf,jpg,jpeg,png,doc,docx',
                'max:10240',
            ])
            ->and($service->rules(required: false, documentType: JenisDokumen::PAS_FOTO))->toBe([
                'nullable',
                'file',
                'mimes:jpg,jpeg,png',
                'max:10240',
            ]);
    });

    it('validates, uploads with UUID filename, generates URLs, and deletes documents', function () {
        $service = new DocumentService('public', 'public');
        $file = UploadedFile::fake()->create('ktp-karyawan.pdf', 128, 'application/pdf');

        $uploaded = $service->upload($file, 'employees/10/documents', documentType: JenisDokumen::KTP);

        expect($uploaded['disk'])->toBe('public')
            ->and($uploaded['original_name'])->toBe('ktp-karyawan.pdf')
            ->and($uploaded['mime_type'])->toBe('application/pdf')
            ->and($uploaded['size'])->toBeGreaterThan(0)
            ->and($uploaded['path'])->toStartWith('employees/10/documents/')
            ->and($uploaded['path'])->toEndWith('.pdf')
            ->and($uploaded['url'])->not->toBeEmpty();

        Storage::disk('public')->assertExists($uploaded['path']);

        expect($service->delete($uploaded['path']))->toBeTrue();
        Storage::disk('public')->assertMissing($uploaded['path']);
        expect($service->delete($uploaded['path']))->toBeFalse();
    });

    it('rejects disallowed extensions and oversized files during validation', function () {
        Config::set('documents.max_size_kb', 50);
        $service = new DocumentService('public', 'public');

        $badExtension = UploadedFile::fake()->create('malware.exe', 10, 'application/octet-stream');
        expect(fn () => $service->validate($badExtension))->toThrow(ValidationException::class);

        $pdfForPhoto = UploadedFile::fake()->create('avatar.pdf', 10, 'application/pdf');
        expect(fn () => $service->validate($pdfForPhoto, JenisDokumen::PAS_FOTO))
            ->toThrow(ValidationException::class);

        $oversized = UploadedFile::fake()->create('huge.pdf', 100, 'application/pdf');
        expect(fn () => $service->validate($oversized, JenisDokumen::KTP))
            ->toThrow(ValidationException::class);
    });

    it('uses temporary signed URLs for private disks when supported and falls back gracefully on local driver', function () {
        Storage::disk('local')->buildTemporaryUrlsUsing(function (string $path, $expiration) {
            return "https://signed.foodlab.test/{$path}?expires={$expiration->getTimestamp()}";
        });

        $privateLocal = new DocumentService('local', 'private');
        $file = UploadedFile::fake()->create('kontrak.pdf', 32, 'application/pdf');
        $uploaded = $privateLocal->upload($file, 'contracts', documentType: JenisDokumen::KONTRAK_KERJA);

        expect($uploaded['url'])->toStartWith('https://signed.foodlab.test/contracts/')
            ->and($uploaded['url'])->toContain('expires=');

        // Reset temporaryUrl builder to verify RuntimeException fallback on local driver
        Storage::fake('local');
        $fallbackService = new DocumentService('local', 'private');
        $uploadedFallback = $fallbackService->upload(
            UploadedFile::fake()->create('kontrak-2.pdf', 32, 'application/pdf'),
            'contracts',
            documentType: JenisDokumen::KONTRAK_KERJA,
        );

        expect($uploadedFallback['url'])->not->toBeEmpty();
    });

    it('requires authentication on POST /api/v1/documents and uploads validated user documents', function () {
        $file = UploadedFile::fake()->create('ijazah.pdf', 64, 'application/pdf');

        $this->postJson('/api/v1/documents', ['document' => $file])
            ->assertUnauthorized();

        $user = actingAsErpUser();

        $response = $this->post('/api/v1/documents', [
            'document' => $file,
            'document_type' => JenisDokumen::IJAZAH->value,
        ], ['Accept' => 'application/json']);

        $response->assertCreated()
            ->assertJsonStructure([
                'path',
                'disk',
                'original_name',
                'mime_type',
                'size',
                'url',
            ])
            ->assertJsonPath('disk', 'public')
            ->assertJsonPath('original_name', 'ijazah.pdf');

        $path = $response->json('path');
        expect($path)->toStartWith("users/{$user->id}/documents/")
            ->and($path)->toEndWith('.pdf');

        Storage::disk('public')->assertExists($path);
    });

    it('returns 422 on invalid document upload payloads and keeps OpenAPI docs healthy', function () {
        actingAsErpUser();

        // Missing file + invalid document_type
        $this->post('/api/v1/documents', [
            'document_type' => 'sim_c',
        ], ['Accept' => 'application/json'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['document_type', 'document']);

        // PDF is not allowed for PAS_FOTO (jpg, jpeg, png only)
        $this->post('/api/v1/documents', [
            'document_type' => JenisDokumen::PAS_FOTO->value,
            'document' => UploadedFile::fake()->create('foto.pdf', 20, 'application/pdf'),
        ], ['Accept' => 'application/json'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['document']);

        // Scramble OpenAPI docs still render cleanly
        $this->getJson('/docs/api.json')
            ->assertOk()
            ->assertJsonStructure(['openapi', 'info', 'paths']);
    });
});
