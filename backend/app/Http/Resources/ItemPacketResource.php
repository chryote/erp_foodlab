<?php

namespace App\Http\Resources;

use App\Models\ItemPacket;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin ItemPacket */
class ItemPacketResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => (int) $this->id,
            'packet_id' => (int) $this->packet_id,
            'item_id' => (int) $this->item_id,
            'quantity' => (int) $this->quantity,
            'packet' => $this->whenLoaded('packet', fn ($packet) => new PacketResource($packet)),
            'item' => $this->whenLoaded('item', fn ($item) => new ItemResource($item)),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
            'deleted_at' => $this->deleted_at?->toISOString(),
        ];
    }
}
