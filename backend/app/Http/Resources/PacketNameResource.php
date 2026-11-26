<?php

namespace App\Http\Resources;

use App\Models\PacketName;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin PacketName */
class PacketNameResource extends JsonResource
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
