<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Laravel\Scout\Searchable;

class ExpenseItem extends Model
{
    use HasFactory, Searchable, SoftDeletes;

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

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }

    /**
     * Eager-load parent category/type names during multi-record Scout batch indexing
     * without mutating relations on single-model saves (preserving JsonResource tests).
     *
     * @param  Collection<int, self>  $models
     * @return Collection<int, self>
     */
    public function makeSearchableUsing(Collection $models): Collection
    {
        if (
            $models->count() > 1
            && in_array((string) config('scout.driver', 'null'), ['meilisearch', 'collection'], true)
        ) {
            return $models->loadMissing(['expenseCategory', 'expenseType']);
        }

        return $models;
    }

    /**
     * @return array<string, mixed>
     */
    public function toSearchableArray(): array
    {
        $scoutActive = in_array((string) config('scout.driver', 'null'), ['meilisearch', 'collection'], true);

        $categoryName = $this->relationLoaded('expenseCategory')
            ? $this->getRelation('expenseCategory')?->name
            : ($scoutActive && $this->expense_category_id !== null
                ? ExpenseCategory::query()->withTrashed()->whereKey($this->expense_category_id)->value('name')
                : null);

        $typeName = $this->relationLoaded('expenseType')
            ? $this->getRelation('expenseType')?->name
            : ($scoutActive && $this->expense_type_id !== null
                ? ExpenseType::query()->withTrashed()->whereKey($this->expense_type_id)->value('name')
                : null);

        return [
            'id' => $this->id,
            'company_id' => $this->company_id,
            'expense_category_id' => $this->expense_category_id,
            'expense_type_id' => $this->expense_type_id,
            'name' => $this->name,
            'detail' => $this->detail,
            'expense_category_name' => $categoryName,
            'expense_type_name' => $typeName,
        ];
    }
}
