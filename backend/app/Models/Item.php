<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Item extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'items';

    protected $fillable = [
        'name',
    ];

    protected $hidden = [
        'active_flag',
    ];

    public function itemPackets(): HasMany
    {
        return $this->hasMany(ItemPacket::class);
    }

    public function packets(): BelongsToMany
    {
        return $this->belongsToMany(Packet::class, 'item_packet')
            ->wherePivotNull('deleted_at')
            ->withPivot(['id', 'quantity', 'deleted_at'])
            ->withTimestamps();
    }
}
