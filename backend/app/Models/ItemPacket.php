<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class ItemPacket extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'item_packet';

    protected $fillable = [
        'company_owner_id',
        'company_id',
        'packet_vendor_id',
        'packet_id',
        'item_id',
        'quantity',
    ];

    protected $hidden = [
        'active_flag',
    ];

    protected function casts(): array
    {
        return [
            'company_owner_id' => 'integer',
            'company_id' => 'integer',
            'packet_vendor_id' => 'integer',
            'packet_id' => 'integer',
            'item_id' => 'integer',
            'quantity' => 'integer',
        ];
    }

    public function companyOwner(): BelongsTo
    {
        return $this->belongsTo(Company::class, 'company_owner_id');
    }

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function packetVendor(): BelongsTo
    {
        return $this->belongsTo(PacketVendor::class);
    }

    public function packet(): BelongsTo
    {
        return $this->belongsTo(Packet::class);
    }

    public function item(): BelongsTo
    {
        return $this->belongsTo(Item::class);
    }

    public function defaultPackages(): HasMany
    {
        return $this->hasMany(DefaultPackage::class);
    }
}
