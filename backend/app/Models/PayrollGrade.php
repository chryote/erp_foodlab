<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class PayrollGrade extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'payroll_grades';

    protected $fillable = [
        'company_id',
        'grade',
        'sub_grade',
        'level_label',
        'base_salary',
        'position_allowance',
        'total_gross',
        'bpjs_kesehatan_company',
        'bpjs_kesehatan_employee',
        'bpjs_ketenagakerjaan_company',
        'bpjs_ketenagakerjaan_employee',
        'net_employee_received',
        'total_company_cost',
    ];

    protected $casts = [
        'company_id' => 'integer',
        'grade' => 'integer',
        'base_salary' => 'float',
        'position_allowance' => 'float',
        'total_gross' => 'float',
        'bpjs_kesehatan_company' => 'float',
        'bpjs_kesehatan_employee' => 'float',
        'bpjs_ketenagakerjaan_company' => 'float',
        'bpjs_ketenagakerjaan_employee' => 'float',
        'net_employee_received' => 'float',
        'total_company_cost' => 'float',
    ];

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function employees(): HasMany
    {
        return $this->hasMany(Employee::class);
    }
}
