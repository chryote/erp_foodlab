<?php

namespace App\Models;

use App\Enums\LabSampleStatus;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Laravel\Scout\Searchable;

class LabSample extends Model
{
    use HasFactory, Searchable, SoftDeletes;

    protected $fillable = [
        'batch_code',
        'product_name',
        'category',
        'ph_level',
        'moisture_percent',
        'status',
    ];

    protected $hidden = [
        'active_flag',
    ];

    protected function casts(): array
    {
        return [
            'ph_level' => 'float',
            'moisture_percent' => 'float',
            'status' => LabSampleStatus::class,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function toSearchableArray(): array
    {
        return [
            'id' => $this->id,
            'batch_code' => $this->batch_code,
            'product_name' => $this->product_name,
            'category' => $this->category,
            'status' => $this->status instanceof LabSampleStatus ? $this->status->value : $this->status,
        ];
    }
}
