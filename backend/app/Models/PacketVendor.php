<?php

namespace App\Models;

use App\Enums\PacketVendorType;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class PacketVendor extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'packet_vendors';

    protected $fillable = [
        'company_owner_id',
        'name',
        'type',
    ];

    protected $hidden = [
        'active_flag',
    ];

    protected function casts(): array
    {
        return [
            'company_owner_id' => 'integer',
            'type' => PacketVendorType::class,
        ];
    }

    public function companyOwner(): BelongsTo
    {
        return $this->belongsTo(Company::class, 'company_owner_id');
    }

    public function items(): HasMany
    {
        return $this->hasMany(Item::class);
    }

    public function itemPackets(): HasMany
    {
        return $this->hasMany(ItemPacket::class);
    }

    public function defaultPackages(): HasMany
    {
        return $this->hasMany(DefaultPackage::class);
    }
}
