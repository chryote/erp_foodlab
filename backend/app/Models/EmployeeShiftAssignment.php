<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class EmployeeShiftAssignment extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'employee_shift_assignments';

    protected $fillable = [
        'company_id',
        'employee_id',
        'employee_shift_id',
        'effective_date',
        'end_date',
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
            'effective_date' => 'date:Y-m-d',
            'end_date' => 'date:Y-m-d',
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
