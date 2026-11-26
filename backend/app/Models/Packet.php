<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Packet extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'packets';

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

    public function defaultPackages(): HasMany
    {
        return $this->hasMany(DefaultPackage::class);
    }

    public function items(): BelongsToMany
    {
        return $this->belongsToMany(Item::class, 'item_packet')
            ->wherePivotNull('deleted_at')
            ->withPivot(['id', 'company_id', 'packet_vendor_id', 'quantity', 'deleted_at'])
            ->withTimestamps();
    }
}
