<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class CompanyAsset extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'company_assets';

    protected $fillable = [
        'company_id',
        'asset_date',
        'name',
        'amount',
        'price_per_unit',
        'total_price',
    ];

    protected $casts = [
        'company_id' => 'integer',
        'asset_date' => 'date:Y-m-d',
        'amount' => 'integer',
        'price_per_unit' => 'float',
        'total_price' => 'float',
    ];

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }
}
