<?php

namespace App\Modules\CHO\Requests;

use App\Enums\Agama;
use App\Enums\GolonganDarah;
use App\Enums\JenisDokumen;
use App\Enums\JenisKelamin;
use App\Models\Employee;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SaveEmployeeRequest extends FormRequest
{
    /**
     * @var list<string>
     */
    private const TRIMMED_FIELDS = [
        'name',
        'email',
        'phone',
        'photo_url',
        'nik_ktp',
        'nickname',
        'birth_place',
        'mother_name',
        'ktp_address',
        'domicile_address',
        'whatsapp_number',
        'emergency_phone_number',
        'instagram',
        'tiktok',
        'bpjs_ketenagakerjaan',
        'bpjs_kesehatan',
        'npwp_number',
    ];

    /**
     * @var list<string>
     */
    private const FOREIGN_KEY_FIELDS = [
        'company_id',
        'employee_position_id',
        'employment_status_id',
        'payroll_grade_id',
        'tax_status_id',
    ];

    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $normalized = [];

        foreach (self::TRIMMED_FIELDS as $field) {
            $value = $this->input($field);

            if (is_string($value)) {
                $normalized[$field] = trim($value);
            }
        }

        if (is_array($this->input('documents'))) {
            $normalized['documents'] = array_map(static function (mixed $document): mixed {
                if (! is_array($document)) {
                    return $document;
                }

                if (isset($document['document_type']) && is_string($document['document_type'])) {
                    $document['document_type'] = trim($document['document_type']);
                }

                if (isset($document['file_url']) && is_string($document['file_url'])) {
                    $document['file_url'] = trim($document['file_url']);
                }

                return $document;
            }, $this->input('documents'));
        }

        if ($normalized !== []) {
            $this->merge($normalized);
        }
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $presence = $this->isMethod('PATCH') ? ['sometimes', 'required'] : ['required'];
        $employee = $this->route('employee');
        $companyId = $this->filled('company_id')
            ? (int) $this->input('company_id')
            : ($employee instanceof Employee ? (int) $employee->company_id : 0);

        return [
            'company_id' => [
                ...$presence,
                'integer',
                Rule::exists('companies', 'id')->whereNull('deleted_at'),
            ],
            'employee_position_id' => [
                ...$presence,
                'integer',
                Rule::exists('employee_positions', 'id')
                    ->whereNull('deleted_at')
                    ->where('company_id', $companyId),
            ],
            'employment_status_id' => [
                ...$presence,
                'integer',
                Rule::exists('employment_statuses', 'id')
                    ->whereNull('deleted_at')
                    ->where('company_id', $companyId),
            ],
            'payroll_grade_id' => [
                ...$presence,
                'integer',
                Rule::exists('payroll_grades', 'id')
                    ->whereNull('deleted_at')
                    ->where('company_id', $companyId),
            ],
            'tax_status_id' => [
                ...$presence,
                'integer',
                Rule::exists('tax_statuses', 'id')
                    ->whereNull('deleted_at')
                    ->where('company_id', $companyId),
            ],
            'name' => [...$presence, 'string', 'max:150'],
            'email' => [...$presence, 'email', 'max:150'],
            'phone' => [...$presence, 'string', 'max:50'],
            'photo_url' => [...$presence, 'string', 'max:255'],
            'nik_ktp' => [
                ...$presence,
                'string',
                'digits:16',
                Rule::unique('employees', 'nik_ktp')
                    ->where('company_id', $companyId)
                    ->whereNull('deleted_at')
                    ->ignore($employee),
            ],
            'nickname' => [...$presence, 'string', 'max:100'],
            'birth_place' => [...$presence, 'string', 'max:100'],
            'birth_date' => [...$presence, 'date_format:Y-m-d', 'before:today'],
            'gender' => [...$presence, Rule::enum(JenisKelamin::class)],
            'religion' => [...$presence, Rule::enum(Agama::class)],
            'blood_type' => [...$presence, Rule::enum(GolonganDarah::class)],
            'mother_name' => [...$presence, 'string', 'max:150'],
            'ktp_address' => [...$presence, 'string'],
            'domicile_address' => [...$presence, 'string'],
            'whatsapp_number' => [...$presence, 'string', 'max:30'],
            'emergency_phone_number' => [...$presence, 'string', 'max:30'],
            'instagram' => [...$presence, 'string', 'max:100'],
            'tiktok' => [...$presence, 'string', 'max:100'],
            'bpjs_ketenagakerjaan' => [...$presence, 'string', 'max:50'],
            'bpjs_kesehatan' => [...$presence, 'string', 'max:50'],
            'npwp_number' => [...$presence, 'string', 'max:30'],
            'documents' => [...$presence, 'array', 'min:1'],
            'documents.*' => ['required', 'array'],
            'documents.*.document_type' => ['required', Rule::enum(JenisDokumen::class), 'distinct'],
            'documents.*.file_url' => ['required', 'string', 'max:255'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'company_id' => 'Perusahaan',
            'employee_position_id' => 'Jabatan',
            'employment_status_id' => 'Status Karyawan',
            'payroll_grade_id' => 'Payroll Grade',
            'tax_status_id' => 'Status Pajak',
            'name' => 'Nama Lengkap',
            'email' => 'Email',
            'phone' => 'No. Telepon',
            'photo_url' => 'URL Foto Karyawan',
            'nik_ktp' => 'NIK KTP',
            'nickname' => 'Nama Panggilan',
            'birth_place' => 'Tempat Lahir',
            'birth_date' => 'Tanggal Lahir',
            'gender' => 'Jenis Kelamin',
            'religion' => 'Agama',
            'blood_type' => 'Golongan Darah',
            'mother_name' => 'Nama Ibu Kandung',
            'ktp_address' => 'Alamat KTP',
            'domicile_address' => 'Alamat Domisili',
            'whatsapp_number' => 'No. WhatsApp',
            'emergency_phone_number' => 'No. Telepon Darurat',
            'instagram' => 'Instagram',
            'tiktok' => 'TikTok',
            'bpjs_ketenagakerjaan' => 'BPJS Ketenagakerjaan',
            'bpjs_kesehatan' => 'BPJS Kesehatan',
            'npwp_number' => 'Nomor NPWP',
            'documents' => 'Dokumen Karyawan',
            'documents.*.document_type' => 'Jenis Dokumen',
            'documents.*.file_url' => 'URL Dokumen',
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'required' => ':attribute wajib diisi.',
            'documents.required' => 'Dokumen karyawan minimal harus melampirkan 1 dokumen.',
            'documents.min' => 'Dokumen karyawan minimal harus melampirkan 1 dokumen.',
            'nik_ktp.digits' => 'NIK KTP harus terdiri dari 16 digit angka.',
            'nik_ktp.unique' => 'NIK KTP sudah terdaftar.',
            'email.email' => 'Format Email tidak valid.',
            'birth_date.date_format' => 'Tanggal Lahir harus berformat YYYY-MM-DD.',
            'birth_date.before' => 'Tanggal Lahir harus sebelum hari ini.',
            'documents.*.document_type.distinct' => 'Jenis Dokumen tidak boleh duplikat.',
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function payload(): array
    {
        $validated = $this->validated();

        foreach (self::FOREIGN_KEY_FIELDS as $field) {
            if (array_key_exists($field, $validated) && $validated[$field] !== null) {
                $validated[$field] = (int) $validated[$field];
            }
        }

        if (isset($validated['documents']) && is_array($validated['documents'])) {
            $validated['documents'] = array_map(
                static fn (array $document): array => [
                    'document_type' => (string) $document['document_type'],
                    'file_url' => trim((string) $document['file_url']),
                ],
                $validated['documents']
            );
        }

        return $validated;
    }
}
