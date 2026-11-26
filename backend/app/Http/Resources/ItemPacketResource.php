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
            'company_id' => $this->company_id !== null ? (int) $this->company_id : null,
            'packet_vendor_id' => $this->packet_vendor_id !== null ? (int) $this->packet_vendor_id : null,
            'packet_id' => (int) $this->packet_id,
            'item_id' => (int) $this->item_id,
            'quantity' => (int) $this->quantity,
            'company' => $this->whenLoaded('company', fn ($company) => $company !== null ? new CompanyResource($company) : null),
            'packet_vendor' => $this->whenLoaded('packetVendor', fn ($vendor) => $vendor !== null ? new PacketVendorResource($vendor) : null),
            'packet' => $this->whenLoaded('packet', fn ($packet) => $packet !== null ? new PacketResource($packet) : null),
            'item' => $this->whenLoaded('item', fn ($item) => $item !== null ? new ItemResource($item) : null),
            'default_packages' => DefaultPackageResource::collection($this->whenLoaded('defaultPackages')),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
            'deleted_at' => $this->deleted_at?->toISOString(),
        ];
    }
}
