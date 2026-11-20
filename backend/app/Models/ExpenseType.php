<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class ExpenseType extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'expense_types';

    protected $fillable = [
        'expense_category_id',
        'company_id',
        'name',
    ];

    protected $casts = [
        'expense_category_id' => 'integer',
        'company_id' => 'integer',
    ];

    public function expenseCategory(): BelongsTo
    {
        return $this->belongsTo(ExpenseCategory::class);
    }

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }
}
