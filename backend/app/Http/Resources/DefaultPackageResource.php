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
            'company_owner_id' => $this->company_owner_id !== null ? (int) $this->company_owner_id : null,
            'brand_name' => $this->brand_name,
            'packet_name_id' => (int) $this->packet_name_id,
            'company_id' => $this->company_id !== null ? (int) $this->company_id : null,
            'packet_vendor_id' => $this->packet_vendor_id !== null ? (int) $this->packet_vendor_id : null,
            'packet_category_id' => (int) $this->packet_category_id,
            'packet_id' => $this->packet_id !== null ? (int) $this->packet_id : null,
            'item_packet_id' => $this->item_packet_id !== null ? (int) $this->item_packet_id : null,
            'price' => (float) $this->price,
            'company_owner' => $this->whenLoaded('companyOwner', fn ($company) => $company !== null ? new CompanyResource($company) : null),
            'packet_name' => $this->whenLoaded('packetName', fn ($packetName) => $packetName !== null ? new PacketNameResource($packetName) : null),
            'company' => $this->whenLoaded('company', fn ($company) => $company !== null ? new CompanyResource($company) : null),
            'packet_vendor' => $this->whenLoaded('packetVendor', fn ($packetVendor) => $packetVendor !== null ? new PacketVendorResource($packetVendor) : null),
            'packet_category' => $this->whenLoaded('packetCategory', fn ($packetCategory) => $packetCategory !== null ? new PacketCategoryResource($packetCategory) : null),
            'packet' => $this->whenLoaded('packet', fn ($packet) => $packet !== null ? new PacketResource($packet) : null),
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
