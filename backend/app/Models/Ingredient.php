<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class Ingredient extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'ingredients';

    protected $fillable = [
        'company_owner_id',
        'default_package_id',
        'item_id',
        'price',
    ];

    protected $hidden = [
        'active_flag',
    ];

    protected function casts(): array
    {
        return [
            'company_owner_id' => 'integer',
            'default_package_id' => 'integer',
            'item_id' => 'integer',
            'price' => 'float',
        ];
    }

    public function companyOwner(): BelongsTo
    {
        return $this->belongsTo(Company::class, 'company_owner_id');
    }

    public function defaultPackage(): BelongsTo
    {
        return $this->belongsTo(DefaultPackage::class);
    }

    public function item(): BelongsTo
    {
        return $this->belongsTo(Item::class);
    }
}
