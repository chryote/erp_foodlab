<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class CapitalCompany extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'capital_companies';

    protected $fillable = [
        'company_id',
        'capital',
    ];

    protected $casts = [
        'company_id' => 'integer',
        'capital' => 'float',
    ];

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }
}
