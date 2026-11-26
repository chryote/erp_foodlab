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
use Illuminate\Support\Str;
use Laravel\Scout\Searchable;

class Employee extends Model
{
    use HasFactory, Searchable, SoftDeletes;

    protected $table = 'employees';

    protected static function booted(): void
    {
        static::saved(function (Employee $employee): void {
            if (
                $employee->wasRecentlyCreated
                || $employee->wasChanged(['name', 'employee_position_id'])
                || $employee->employee_attendance_code === null
                || $employee->employee_attendance_code === ''
            ) {
                $employee->syncAttendanceCode();
            }
        });
    }

    /**
     * Build the barcode attendance payload:
     * first token of employee.name before whitespace (alphanumeric only)
     * + employee_position.name (alphanumeric only)
     * + employee.id.
     */
    public static function formatAttendanceCode(int $id, string $name, ?string $positionName = null): string
    {
        $trimmedName = trim($name);
        $firstToken = $trimmedName === ''
            ? ''
            : (preg_split('/\s+/', $trimmedName)[0] ?? '');

        $cleanFirstName = preg_replace('/[^A-Za-z0-9]/', '', Str::ascii($firstToken)) ?? '';
        $cleanPositionName = $positionName !== null
            ? (preg_replace('/[^A-Za-z0-9]/', '', Str::ascii($positionName)) ?? '')
            : '';

        $idSuffix = (string) $id;
        $maxPrefixLength = max(0, 255 - strlen($idSuffix));
        $prefix = substr($cleanFirstName.$cleanPositionName, 0, $maxPrefixLength);

        return $prefix.$idSuffix;
    }

    public function generateAttendanceCode(): string
    {
        $positionName = null;

        if ($this->employee_position_id !== null) {
            if (
                $this->relationLoaded('employeePosition')
                && $this->employeePosition !== null
                && (int) $this->employeePosition->getKey() === (int) $this->employee_position_id
            ) {
                $positionName = $this->employeePosition->name;
            } else {
                $positionName = EmployeePosition::query()
                    ->withTrashed()
                    ->whereKey($this->employee_position_id)
                    ->value('name');
            }
        }

        return self::formatAttendanceCode(
            (int) $this->getKey(),
            (string) $this->name,
            $positionName !== null ? (string) $positionName : null,
        );
    }

    public function syncAttendanceCode(): void
    {
        if (! $this->exists || $this->getKey() === null) {
            return;
        }

        $generated = $this->generateAttendanceCode();

        if ($this->employee_attendance_code !== $generated) {
            $this->employee_attendance_code = $generated;
            $this->saveQuietly();
        }
    }

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

    protected $hidden = [
        'active_flag',
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

    public function employeeAttendances(): HasMany
    {
        return $this->hasMany(EmployeeAttendance::class);
    }

    public function employeeShiftAssignments(): HasMany
    {
        return $this->hasMany(EmployeeShiftAssignment::class);
    }

    public function expenseItems(): HasMany
    {
        return $this->hasMany(ExpenseItem::class);
    }

    public function payrollItems(): HasMany
    {
        return $this->hasMany(PayrollItem::class);
    }

    /**
     * @return array<string, mixed>
     */
    public function toSearchableArray(): array
    {
        return [
            'id' => $this->id,
            'company_id' => $this->company_id,
            'employee_position_id' => $this->employee_position_id,
            'employment_status_id' => $this->employment_status_id,
            'payroll_grade_id' => $this->payroll_grade_id,
            'tax_status_id' => $this->tax_status_id,
            'name' => $this->name,
            'nickname' => $this->nickname,
            'nik_ktp' => $this->nik_ktp,
            'employee_attendance_code' => $this->employee_attendance_code,
            'email' => $this->email,
            'phone' => $this->phone,
        ];
    }
}
