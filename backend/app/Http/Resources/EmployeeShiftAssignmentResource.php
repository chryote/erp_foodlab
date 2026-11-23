<?php

namespace App\Http\Resources;

use App\Models\EmployeeShiftAssignment;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin EmployeeShiftAssignment */
class EmployeeShiftAssignmentResource extends JsonResource
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
            'employee_id' => (int) $this->employee_id,
            'employee_shift_id' => (int) $this->employee_shift_id,
            'effective_date' => $this->effective_date?->format('Y-m-d'),
            'end_date' => $this->end_date?->format('Y-m-d'),
            'notes' => $this->notes,
            'company' => $this->whenLoaded('company', fn ($company) => new CompanyResource($company)),
            'employee' => $this->whenLoaded('employee', fn ($employee) => new EmployeeResource($employee)),
            'employee_shift' => $this->whenLoaded(
                'employeeShift',
                fn ($shift) => new EmployeeShiftResource($shift)
            ),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
            'deleted_at' => $this->deleted_at?->toISOString(),
        ];
    }
}
