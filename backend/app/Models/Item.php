<?php

namespace App\Models;

use App\Enums\ItemType;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Item extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'items';

    protected $fillable = [
        'company_id',
        'code',
        'name',
        'type',
    ];

    protected $hidden = [
        'active_flag',
    ];

    protected function casts(): array
    {
        return [
            'company_id' => 'integer',
            'type' => ItemType::class,
        ];
    }

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function itemPackets(): HasMany
    {
        return $this->hasMany(ItemPacket::class);
    }

    public function ingredients(): HasMany
    {
        return $this->hasMany(Ingredient::class);
    }

    public function packets(): BelongsToMany
    {
        return $this->belongsToMany(Packet::class, 'item_packet')
            ->wherePivotNull('deleted_at')
            ->withPivot(['id', 'company_id', 'quantity', 'deleted_at'])
            ->withTimestamps();
    }
}
