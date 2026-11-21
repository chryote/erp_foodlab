<?php

namespace App\Modules\CHO\Requests;

use App\Enums\Agama;
use App\Enums\GolonganDarah;
use App\Enums\JenisDokumen;
use App\Enums\JenisKelamin;
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

        return [
            'company_id' => [
                ...$presence,
                'integer',
                Rule::exists('companies', 'id')->whereNull('deleted_at'),
            ],
            'employee_position_id' => [
                'sometimes',
                'nullable',
                'integer',
                Rule::exists('employee_positions', 'id')->whereNull('deleted_at'),
            ],
            'employment_status_id' => [
                'sometimes',
                'nullable',
                'integer',
                Rule::exists('employment_statuses', 'id')->whereNull('deleted_at'),
            ],
            'payroll_grade_id' => [
                'sometimes',
                'nullable',
                'integer',
                Rule::exists('payroll_grades', 'id')->whereNull('deleted_at'),
            ],
            'tax_status_id' => [
                'sometimes',
                'nullable',
                'integer',
                Rule::exists('tax_statuses', 'id')->whereNull('deleted_at'),
            ],
            'name' => [...$presence, 'string', 'max:150'],
            'email' => ['sometimes', 'nullable', 'email', 'max:150'],
            'phone' => ['sometimes', 'nullable', 'string', 'max:50'],
            'photo_url' => ['sometimes', 'nullable', 'string', 'max:255'],
            'nik_ktp' => [
                'sometimes',
                'nullable',
                'string',
                'digits:16',
                Rule::unique('employees', 'nik_ktp')->ignore($employee),
            ],
            'nickname' => ['sometimes', 'nullable', 'string', 'max:100'],
            'birth_place' => ['sometimes', 'nullable', 'string', 'max:100'],
            'birth_date' => ['sometimes', 'nullable', 'date_format:Y-m-d', 'before:today'],
            'gender' => ['sometimes', 'nullable', Rule::enum(JenisKelamin::class)],
            'religion' => ['sometimes', 'nullable', Rule::enum(Agama::class)],
            'blood_type' => ['sometimes', 'nullable', Rule::enum(GolonganDarah::class)],
            'mother_name' => ['sometimes', 'nullable', 'string', 'max:150'],
            'ktp_address' => ['sometimes', 'nullable', 'string'],
            'domicile_address' => ['sometimes', 'nullable', 'string'],
            'whatsapp_number' => ['sometimes', 'nullable', 'string', 'max:30'],
            'emergency_phone_number' => ['sometimes', 'nullable', 'string', 'max:30'],
            'instagram' => ['sometimes', 'nullable', 'string', 'max:100'],
            'tiktok' => ['sometimes', 'nullable', 'string', 'max:100'],
            'bpjs_ketenagakerjaan' => ['sometimes', 'nullable', 'string', 'max:50'],
            'bpjs_kesehatan' => ['sometimes', 'nullable', 'string', 'max:50'],
            'npwp_number' => ['sometimes', 'nullable', 'string', 'max:30'],
            'documents' => ['sometimes', 'nullable', 'array'],
            'documents.*.document_type' => ['required', Rule::enum(JenisDokumen::class), 'distinct'],
            'documents.*.file_url' => ['required', 'string', 'max:255'],
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
