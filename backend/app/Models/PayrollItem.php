<?php

namespace App\Models;

use App\Enums\PayrollGroup;
use App\Enums\PayrollItemStatus;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class PayrollItem extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'payroll_items';

    protected $fillable = [
        'company_id',
        'payroll_run_id',
        'employee_id',
        'employee_position_id',
        'payroll_group',
        'attendance_days',
        'bank_account_number',
        'base_salary',
        'bpjs_kesehatan',
        'bpjs_ketenagakerjaan',
        'bonus',
        'overtime',
        'deduction',
        'thr',
        'pph21',
        'total_net',
        'status',
        'notes',
        'finalized_by',
        'finalized_at',
    ];

    protected $hidden = [
        'active_flag',
    ];

    protected function casts(): array
    {
        return [
            'company_id' => 'integer',
            'payroll_run_id' => 'integer',
            'employee_id' => 'integer',
            'employee_position_id' => 'integer',
            'payroll_group' => PayrollGroup::class,
            'attendance_days' => 'integer',
            'base_salary' => 'float',
            'bpjs_kesehatan' => 'float',
            'bpjs_ketenagakerjaan' => 'float',
            'bonus' => 'float',
            'overtime' => 'float',
            'deduction' => 'float',
            'thr' => 'float',
            'pph21' => 'float',
            'total_net' => 'float',
            'status' => PayrollItemStatus::class,
            'finalized_by' => 'integer',
            'finalized_at' => 'datetime',
        ];
    }

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function payrollRun(): BelongsTo
    {
        return $this->belongsTo(PayrollRun::class);
    }

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }

    public function employeePosition(): BelongsTo
    {
        return $this->belongsTo(EmployeePosition::class);
    }

    public function finalizer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'finalized_by');
    }
}
