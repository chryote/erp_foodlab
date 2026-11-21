<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class EmployeePosition extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'employee_positions';

    protected $fillable = [
        'company_id',
        'code',
        'name',
        'description',
    ];

    protected $hidden = [
        'active_flag',
    ];

    protected $casts = [
        'company_id' => 'integer',
    ];

    protected static function booted(): void
    {
        static::updated(function (EmployeePosition $position): void {
            if (! $position->wasChanged('name')) {
                return;
            }

            $position->employees()
                ->withTrashed()
                ->select(['id', 'name', 'employee_position_id', 'employee_attendance_code'])
                ->each(function (Employee $employee) use ($position): void {
                    $employee->setRelation('employeePosition', $position);
                    $employee->syncAttendanceCode();
                });
        });
    }

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function employees(): HasMany
    {
        return $this->hasMany(Employee::class);
    }
}
