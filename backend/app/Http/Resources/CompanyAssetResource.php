<?php

namespace App\Http\Resources;

use App\Models\CompanyAsset;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin CompanyAsset */
class CompanyAssetResource extends JsonResource
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
            'company_id' => (int) $this->company_id,
            'asset_date' => $this->asset_date?->format('Y-m-d'),
            'name' => $this->name,
            'amount' => (int) $this->amount,
            'price_per_unit' => (float) $this->price_per_unit,
            'total_price' => (float) $this->total_price,
            'company' => $this->whenLoaded('company', fn ($company) => new CompanyResource($company)),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
            'deleted_at' => $this->deleted_at?->toISOString(),
        ];
    }
}
