<?php

namespace App\Http\Resources;

use App\Models\PacketCategory;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin PacketCategory */
class PacketCategoryResource extends JsonResource
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
            'name' => $this->name,
            'company_owner' => $this->whenLoaded('companyOwner', fn ($company) => $company !== null ? new CompanyResource($company) : null),
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
