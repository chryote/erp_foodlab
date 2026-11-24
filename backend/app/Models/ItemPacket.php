<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class ItemPacket extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'item_packet';

    protected $fillable = [
        'packet_id',
        'item_id',
        'quantity',
    ];

    protected $hidden = [
        'active_flag',
    ];

    protected $casts = [
        'packet_id' => 'integer',
        'item_id' => 'integer',
        'quantity' => 'integer',
    ];

    public function packet(): BelongsTo
    {
        return $this->belongsTo(Packet::class);
    }

    public function item(): BelongsTo
    {
        return $this->belongsTo(Item::class);
    }
}
