<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class DefaultPackage extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'default_packages';

    protected $fillable = [
        'company_owner_id',
        'brand_name',
        'packet_name_id',
        'company_id',
        'packet_vendor_id',
        'packet_category_id',
        'packet_id',
        'item_packet_id',
        'price',
    ];

    protected $hidden = [
        'active_flag',
    ];

    protected function casts(): array
    {
        return [
            'company_owner_id' => 'integer',
            'packet_name_id' => 'integer',
            'company_id' => 'integer',
            'packet_vendor_id' => 'integer',
            'packet_category_id' => 'integer',
            'packet_id' => 'integer',
            'item_packet_id' => 'integer',
            'price' => 'float',
        ];
    }

    public function companyOwner(): BelongsTo
    {
        return $this->belongsTo(Company::class, 'company_owner_id');
    }

    public function packetName(): BelongsTo
    {
        return $this->belongsTo(PacketName::class);
    }

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function packetVendor(): BelongsTo
    {
        return $this->belongsTo(PacketVendor::class);
    }

    public function packetCategory(): BelongsTo
    {
        return $this->belongsTo(PacketCategory::class);
    }

    public function packet(): BelongsTo
    {
        return $this->belongsTo(Packet::class);
    }

    public function itemPacket(): BelongsTo
    {
        return $this->belongsTo(ItemPacket::class);
    }

    public function ingredients(): HasMany
    {
        return $this->hasMany(Ingredient::class);
    }
}
