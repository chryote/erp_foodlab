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
            'packet_name_id' => 'integer',
            'company_id' => 'integer',
            'packet_vendor_id' => 'integer',
            'packet_category_id' => 'integer',
            'packet_id' => 'integer',
            'item_packet_id' => 'integer',
            'price' => 'float',
        ];
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
