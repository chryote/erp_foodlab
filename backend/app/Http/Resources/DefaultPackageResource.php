<?php

namespace App\Http\Resources;

use App\Models\DefaultPackage;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin DefaultPackage */
class DefaultPackageResource extends JsonResource
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
            'brand_name' => $this->brand_name,
            'packet_name_id' => (int) $this->packet_name_id,
            'packet_vendor_id' => (int) $this->packet_vendor_id,
            'packet_category_id' => (int) $this->packet_category_id,
            'item_packet_id' => (int) $this->item_packet_id,
            'price' => (float) $this->price,
            'packet_name' => $this->whenLoaded('packetName', fn ($packetName) => $packetName !== null ? new PacketNameResource($packetName) : null),
            'packet_vendor' => $this->whenLoaded('packetVendor', fn ($packetVendor) => $packetVendor !== null ? new PacketVendorResource($packetVendor) : null),
            'packet_category' => $this->whenLoaded('packetCategory', fn ($packetCategory) => $packetCategory !== null ? new PacketCategoryResource($packetCategory) : null),
            'item_packet' => $this->whenLoaded('itemPacket', fn ($itemPacket) => $itemPacket !== null ? new ItemPacketResource($itemPacket) : null),
            'ingredients' => $this->whenLoaded('ingredients', function () {
                $resourceClass = 'App\\Http\\Resources\\IngredientResource';

                return class_exists($resourceClass)
                    ? $resourceClass::collection($this->ingredients)
                    : $this->ingredients;
            }),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
            'deleted_at' => $this->deleted_at?->toISOString(),
        ];
    }
}
