<?php

namespace App\Http\Resources;

use App\Enums\ShiftStatusEnum;
use App\Models\EmployeeShift;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin EmployeeShift */
class EmployeeShiftResource extends JsonResource
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
            'code' => $this->code,
            'name' => $this->name,
            'start_time' => $this->start_time,
            'end_time' => $this->end_time,
            'break_minutes' => (int) $this->break_minutes,
            'grace_period_minutes' => (int) $this->grace_period_minutes,
            'is_overnight' => (bool) $this->is_overnight,
            'status' => $this->status instanceof ShiftStatusEnum ? $this->status->value : $this->status,
            'description' => $this->description,
            'company' => $this->whenLoaded('company', fn ($company) => new CompanyResource($company)),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
            'deleted_at' => $this->deleted_at?->toISOString(),
        ];
    }
}
