<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
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
        'name',
        'email',
        'phone',
    ];

    protected $casts = [
        'company_id' => 'integer',
        'employee_position_id' => 'integer',
        'employment_status_id' => 'integer',
        'payroll_grade_id' => 'integer',
    ];

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
}
