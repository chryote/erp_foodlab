<?php

namespace App\Http\Resources;

use App\Models\Packet;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Packet */
class PacketResource extends JsonResource
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
            'name' => $this->name,
            'item_packets' => $this->whenLoaded('itemPackets', function () {
                $resourceClass = 'App\\Http\\Resources\\ItemPacketResource';

                return class_exists($resourceClass)
                    ? $resourceClass::collection($this->itemPackets)
                    : $this->itemPackets;
            }),
            'items' => ItemResource::collection($this->whenLoaded('items')),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
            'deleted_at' => $this->deleted_at?->toISOString(),
        ];
    }
}
