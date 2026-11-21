<?php

namespace App\Http\Resources;

use App\Models\EmployeeDocument;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin EmployeeDocument */
class EmployeeDocumentResource extends JsonResource
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
            'employee_id' => (int) $this->employee_id,
            'document_type' => $this->document_type instanceof \BackedEnum
                ? $this->document_type->value
                : $this->document_type,
            'file_url' => $this->file_url,
            'employee' => $this->whenLoaded('employee', fn ($employee) => new EmployeeResource($employee)),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
            'deleted_at' => $this->deleted_at?->toISOString(),
        ];
    }
}
