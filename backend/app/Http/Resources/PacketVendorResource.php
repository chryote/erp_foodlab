<?php

namespace App\Http\Resources;

use App\Enums\PacketVendorType;
use App\Models\PacketVendor;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin PacketVendor */
class PacketVendorResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $type = $this->type instanceof PacketVendorType
            ? $this->type->value
            : ($this->type ?? PacketVendorType::Bahan->value);

        return [
            'id' => (int) $this->id,
            'company_owner_id' => $this->company_owner_id !== null ? (int) $this->company_owner_id : null,
            'name' => $this->name,
            'type' => $type,
            'company_owner' => $this->whenLoaded('companyOwner', fn ($company) => $company !== null ? new CompanyResource($company) : null),
            'items' => ItemResource::collection($this->whenLoaded('items')),
            'item_packets' => ItemPacketResource::collection($this->whenLoaded('itemPackets')),
            'default_packages' => $this->whenLoaded('defaultPackages', function () {
                $resourceClass = 'App\\Http\\Resources\\DefaultPackageResource';

                return class_exists($resourceClass)
                    ? $resourceClass::collection($this->defaultPackages)
                    : $this->defaultPackages;
            }),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
            'deleted_at' => $this->deleted_at?->toISOString(),
        ];
    }
}
