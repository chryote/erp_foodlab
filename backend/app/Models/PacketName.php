<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class PacketName extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'packet_names';

    protected $fillable = [
        'name',
    ];

    protected $hidden = [
        'active_flag',
    ];

    /**
     * @return HasMany
     */
    public function defaultPackages()
    {
        return $this->hasMany(DefaultPackage::class);
    }
}
