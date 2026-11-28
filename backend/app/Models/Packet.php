<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Laravel\Scout\Searchable;

class Packet extends Model
{
    use HasFactory, Searchable, SoftDeletes;

    protected $table = 'packets';

    protected $fillable = [
        'company_owner_id',
        'name',
    ];

    protected $hidden = [
        'active_flag',
    ];

    protected function casts(): array
    {
        return [
            'company_owner_id' => 'integer',
        ];
    }

    public function companyOwner(): BelongsTo
    {
        return $this->belongsTo(Company::class, 'company_owner_id');
    }

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

    /**
     * @return array<string, mixed>
     */
    public function toSearchableArray(): array
    {
        return [
            'id' => $this->id,
            'company_owner_id' => $this->company_owner_id,
            'name' => $this->name,
        ];
    }
}
