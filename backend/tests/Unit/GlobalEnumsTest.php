<?php

use App\Enums\Agama;
use App\Enums\GolonganDarah;
use App\Enums\JenisDokumen;
use App\Enums\JenisKelamin;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

describe('Global Backend Enums', function () {
    it('defines JenisKelamin cases with snake_case values and Indonesian nama/label helpers', function () {
        expect(JenisKelamin::values())->toBe(['laki_laki', 'perempuan'])
            ->and(JenisKelamin::LAKI_LAKI->nama())->toBe('Laki-laki')
            ->and(JenisKelamin::LAKI_LAKI->label())->toBe('Laki-laki')
            ->and(JenisKelamin::PEREMPUAN->nama())->toBe('Perempuan')
            ->and(JenisKelamin::options())->toBe([
                ['value' => 'laki_laki', 'nama' => 'Laki-laki'],
                ['value' => 'perempuan', 'nama' => 'Perempuan'],
            ]);
    });

    it('defines Agama cases with snake_case values and Indonesian nama/label helpers', function () {
        expect(Agama::values())->toBe([
            'islam',
            'kristen',
            'katolik',
            'hindu',
            'buddha',
            'konghucu',
            'lainnya',
        ])
            ->and(Agama::ISLAM->nama())->toBe('Islam')
            ->and(Agama::KRISTEN->nama())->toBe('Kristen')
            ->and(Agama::KATOLIK->nama())->toBe('Katolik')
            ->and(Agama::HINDU->nama())->toBe('Hindu')
            ->and(Agama::BUDDHA->nama())->toBe('Buddha')
            ->and(Agama::KONGHUCU->nama())->toBe('Konghucu')
            ->and(Agama::LAINNYA->nama())->toBe('Lainnya')
            ->and(Agama::options())->toHaveCount(7);
    });

    it('defines GolonganDarah cases with ABO plus tidak_tahu', function () {
        expect(GolonganDarah::values())->toBe(['a', 'b', 'ab', 'o', 'tidak_tahu'])
            ->and(GolonganDarah::A->nama())->toBe('A')
            ->and(GolonganDarah::B->nama())->toBe('B')
            ->and(GolonganDarah::AB->nama())->toBe('AB')
            ->and(GolonganDarah::O->nama())->toBe('O')
            ->and(GolonganDarah::TIDAK_TAHU->nama())->toBe('Tidak Tahu')
            ->and(GolonganDarah::options())->toHaveCount(5);
    });

    it('defines JenisDokumen cases with nama, allowed formats, and validation helpers', function () {
        expect(JenisDokumen::values())->toBe([
            'ktp',
            'kk',
            'npwp',
            'bpjs_kesehatan',
            'bpjs_ketenagakerjaan',
            'pas_foto',
            'cv',
            'ijazah',
            'transkrip',
            'kontrak_kerja',
            'sertifikat',
        ]);

        foreach (JenisDokumen::cases() as $dokumen) {
            expect($dokumen->nama())->not->toBeEmpty()
                ->and($dokumen->label())->toBe($dokumen->nama())
                ->and($dokumen->allowedFormats())->not->toBeEmpty()
                ->and($dokumen->allowedExtensions())->not->toBeEmpty();

            foreach ($dokumen->allowedFormats() as $format) {
                expect($format)->toStartWith('.');
                expect($dokumen->isAllowedFormat($format))->toBeTrue();
                expect($dokumen->isAllowedFormat(ltrim($format, '.')))->toBeTrue();
            }
        }

        expect(JenisDokumen::KTP->toArray())->toBe([
            'value' => 'ktp',
            'nama' => 'KTP',
            'allowed_formats' => ['.pdf', '.jpg', '.jpeg', '.png'],
        ])
            ->and(JenisDokumen::KTP->allowedExtensions())->toBe(['pdf', 'jpg', 'jpeg', 'png'])
            ->and(JenisDokumen::KTP->mimesRule())->toBe('mimes:pdf,jpg,jpeg,png')
            ->and(JenisDokumen::KTP->acceptAttribute())->toBe('.pdf,.jpg,.jpeg,.png')
            ->and(JenisDokumen::KTP->isAllowedFormat(' .PDF '))->toBeTrue()
            ->and(JenisDokumen::KTP->isAllowedFormat('exe'))->toBeFalse()
            ->and(JenisDokumen::KTP->isAllowedFormat(''))->toBeFalse()
            ->and(JenisDokumen::PAS_FOTO->allowedFormats())->toBe(['.jpg', '.jpeg', '.png'])
            ->and(JenisDokumen::PAS_FOTO->isAllowedFormat('.pdf'))->toBeFalse()
            ->and(JenisDokumen::CV->allowedFormats())->toBe(['.pdf', '.doc', '.docx'])
            ->and(JenisDokumen::KONTRAK_KERJA->allowedFormats())->toBe(['.pdf'])
            ->and(JenisDokumen::options())->toHaveCount(11);
    });

    it('integrates with Laravel Rule::enum validation', function () {
        $valid = Validator::make([
            'jenis_kelamin' => JenisKelamin::PEREMPUAN->value,
            'agama' => Agama::ISLAM->value,
            'golongan_darah' => GolonganDarah::TIDAK_TAHU->value,
            'jenis_dokumen' => JenisDokumen::KTP->value,
        ], [
            'jenis_kelamin' => ['required', Rule::enum(JenisKelamin::class)],
            'agama' => ['required', Rule::enum(Agama::class)],
            'golongan_darah' => ['required', Rule::enum(GolonganDarah::class)],
            'jenis_dokumen' => ['required', Rule::enum(JenisDokumen::class)],
        ]);

        expect($valid->passes())->toBeTrue();

        $invalid = Validator::make([
            'jenis_kelamin' => 'invalid',
            'agama' => 'invalid',
            'golongan_darah' => 'z',
            'jenis_dokumen' => 'sim',
        ], [
            'jenis_kelamin' => ['required', Rule::enum(JenisKelamin::class)],
            'agama' => ['required', Rule::enum(Agama::class)],
            'golongan_darah' => ['required', Rule::enum(GolonganDarah::class)],
            'jenis_dokumen' => ['required', Rule::enum(JenisDokumen::class)],
        ]);

        expect($invalid->fails())->toBeTrue()
            ->and($invalid->errors()->keys())->toBe([
                'jenis_kelamin',
                'agama',
                'golongan_darah',
                'jenis_dokumen',
            ]);
    });
});
