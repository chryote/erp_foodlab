<?php

namespace App\Models;

use App\Enums\ShiftStatusEnum;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class EmployeeShift extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'employee_shifts';

    protected $fillable = [
        'company_id',
        'code',
        'name',
        'start_time',
        'end_time',
        'break_minutes',
        'grace_period_minutes',
        'is_overnight',
        'status',
        'description',
    ];

    protected $hidden = [
        'active_flag',
    ];

    protected function casts(): array
    {
        return [
            'company_id' => 'integer',
            'break_minutes' => 'integer',
            'grace_period_minutes' => 'integer',
            'is_overnight' => 'boolean',
            'status' => ShiftStatusEnum::class,
        ];
    }

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function employeeAttendances(): HasMany
    {
        return $this->hasMany(EmployeeAttendance::class);
    }
}
