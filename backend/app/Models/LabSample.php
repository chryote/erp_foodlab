<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class LabSample extends Model
{
    use HasFactory;

    protected $fillable = [
        'batch_code',
        'product_name',
        'category',
        'ph_level',
        'moisture_percent',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'ph_level' => 'float',
            'moisture_percent' => 'float',
        ];
    }
}
