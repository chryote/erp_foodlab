<?php

namespace App\Models;

use App\Enums\Agama;
use App\Enums\GolonganDarah;
use App\Enums\JenisKelamin;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Employee extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'employees';

    protected $fillable = [
        'company_id',
        'employee_position_id',
        'employment_status_id',
        'payroll_grade_id',
        'tax_status_id',
        'name',
        'email',
        'phone',
        'photo_url',
        'nik_ktp',
        'nickname',
        'birth_place',
        'birth_date',
        'gender',
        'religion',
        'blood_type',
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

    protected function casts(): array
    {
        return [
            'company_id' => 'integer',
            'employee_position_id' => 'integer',
            'employment_status_id' => 'integer',
            'payroll_grade_id' => 'integer',
            'tax_status_id' => 'integer',
            'birth_date' => 'date:Y-m-d',
            'gender' => JenisKelamin::class,
            'religion' => Agama::class,
            'blood_type' => GolonganDarah::class,
        ];
    }

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function employeePosition(): BelongsTo
    {
        return $this->belongsTo(EmployeePosition::class);
    }

    public function employmentStatus(): BelongsTo
    {
        return $this->belongsTo(EmploymentStatus::class);
    }

    public function payrollGrade(): BelongsTo
    {
        return $this->belongsTo(PayrollGrade::class);
    }

    public function taxStatus(): BelongsTo
    {
        return $this->belongsTo(TaxStatus::class);
    }

    public function documents(): HasMany
    {
        return $this->hasMany(EmployeeDocument::class);
    }
}
