<?php

namespace App\Models;

use App\Enums\AttendanceStatusEnum;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class EmployeeAttendance extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'employee_attendances';

    protected $fillable = [
        'company_id',
        'employee_id',
        'employee_shift_id',
        'attendance_date',
        'clock_in_at',
        'clock_out_at',
        'late_minutes',
        'overtime_minutes',
        'status',
        'notes',
    ];

    protected $hidden = [
        'active_flag',
    ];

    protected function casts(): array
    {
        return [
            'company_id' => 'integer',
            'employee_id' => 'integer',
            'employee_shift_id' => 'integer',
            'attendance_date' => 'date:Y-m-d',
            'clock_in_at' => 'datetime',
            'clock_out_at' => 'datetime',
            'late_minutes' => 'integer',
            'overtime_minutes' => 'integer',
            'status' => AttendanceStatusEnum::class,
        ];
    }

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }

    public function employeeShift(): BelongsTo
    {
        return $this->belongsTo(EmployeeShift::class);
    }
}
