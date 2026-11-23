<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class TaxStatus extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'tax_statuses';

    protected $fillable = [
        'code',
        'name',
        'description',
    ];

    protected $hidden = [
        'active_flag',
    ];

    public function employees(): HasMany
    {
        return $this->hasMany(Employee::class);
    }
}
