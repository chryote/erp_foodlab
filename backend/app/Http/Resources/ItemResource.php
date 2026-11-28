<?php

namespace App\Http\Resources;

use App\Enums\ItemType;
use App\Models\Item;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Item */
class ItemResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $type = $this->type instanceof ItemType
            ? $this->type->value
            : ($this->type ?? ItemType::Bahan->value);

        return [
            'id' => (int) $this->id,
            'company_owner_id' => $this->company_owner_id !== null ? (int) $this->company_owner_id : null,
            'company_id' => $this->company_id !== null ? (int) $this->company_id : null,
            'packet_vendor_id' => $this->packet_vendor_id !== null ? (int) $this->packet_vendor_id : null,
            'code' => $this->code,
            'name' => $this->name,
            'type' => $type,
            'company_owner' => $this->whenLoaded('companyOwner', fn ($company) => $company !== null ? new CompanyResource($company) : null),
            'company' => $this->whenLoaded('company', fn ($company) => $company !== null ? new CompanyResource($company) : null),
            'packet_vendor' => $this->whenLoaded('packetVendor', fn ($vendor) => $vendor !== null ? new PacketVendorResource($vendor) : null),
            'item_packets' => ItemPacketResource::collection($this->whenLoaded('itemPackets')),
            'packets' => PacketResource::collection($this->whenLoaded('packets')),
            'ingredients' => IngredientResource::collection($this->whenLoaded('ingredients')),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
            'deleted_at' => $this->deleted_at?->toISOString(),
        ];
    }
}
