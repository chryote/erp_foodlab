<?php

namespace App\Models;

use App\Enums\PayrollRunStatus;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class PayrollRun extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'payroll_runs';

    protected $fillable = [
        'company_id',
        'code',
        'name',
        'period_date',
        'status',
        'total_base_salary',
        'total_bpjs_kesehatan',
        'total_bpjs_ketenagakerjaan',
        'total_bonus',
        'total_overtime',
        'total_deduction',
        'total_thr',
        'total_pph21',
        'total_net',
        'notes',
        'approved_by',
        'approved_at',
    ];

    protected $hidden = [
        'active_flag',
    ];

    protected function casts(): array
    {
        return [
            'company_id' => 'integer',
            'period_date' => 'date:Y-m-d',
            'status' => PayrollRunStatus::class,
            'total_base_salary' => 'float',
            'total_bpjs_kesehatan' => 'float',
            'total_bpjs_ketenagakerjaan' => 'float',
            'total_bonus' => 'float',
            'total_overtime' => 'float',
            'total_deduction' => 'float',
            'total_thr' => 'float',
            'total_pph21' => 'float',
            'total_net' => 'float',
            'approved_by' => 'integer',
            'approved_at' => 'datetime',
        ];
    }

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function items(): HasMany
    {
        return $this->hasMany(PayrollItem::class);
    }
}
