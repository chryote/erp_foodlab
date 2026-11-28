<?php

namespace App\Http\Resources;

use App\Models\Ingredient;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Ingredient */
class IngredientResource extends JsonResource
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
            'default_package_id' => (int) $this->default_package_id,
            'item_id' => (int) $this->item_id,
            'price' => (float) $this->price,
            'company_owner' => $this->whenLoaded('companyOwner', fn ($company) => $company !== null ? new CompanyResource($company) : null),
            'default_package' => $this->whenLoaded(
                'defaultPackage',
                fn ($defaultPackage) => $defaultPackage !== null ? new DefaultPackageResource($defaultPackage) : null
            ),
            'item' => $this->whenLoaded('item', fn ($item) => $item !== null ? new ItemResource($item) : null),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
            'deleted_at' => $this->deleted_at?->toISOString(),
        ];
    }
}
