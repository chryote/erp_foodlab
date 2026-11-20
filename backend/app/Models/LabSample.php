<?php

namespace App\Models;

use App\Enums\LabSampleStatus;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class LabSample extends Model
{
    use HasFactory, SoftDeletes;

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
            'status' => LabSampleStatus::class,
        ];
    }
}
