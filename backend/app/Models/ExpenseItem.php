<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class ExpenseItem extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'expense_items';

    protected $fillable = [
        'expense_category_id',
        'expense_type_id',
        'company_id',
        'name',
        'amount',
        'purchased_on',
        'closing_date',
        'employee_id',
        'detail',
    ];

    protected $casts = [
        'expense_category_id' => 'integer',
        'expense_type_id' => 'integer',
        'company_id' => 'integer',
        'amount' => 'float',
        'purchased_on' => 'date:Y-m-d',
        'closing_date' => 'date:Y-m-d',
        'employee_id' => 'integer',
    ];

    public function expenseCategory(): BelongsTo
    {
        return $this->belongsTo(ExpenseCategory::class);
    }

    public function expenseType(): BelongsTo
    {
        return $this->belongsTo(ExpenseType::class);
    }

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }
}
