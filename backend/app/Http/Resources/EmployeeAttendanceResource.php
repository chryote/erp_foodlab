<?php

namespace App\Http\Resources;

use App\Enums\AttendanceStatusEnum;
use App\Models\EmployeeAttendance;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin EmployeeAttendance */
class EmployeeAttendanceResource extends JsonResource
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
            'employee_shift_id' => $this->employee_shift_id !== null ? (int) $this->employee_shift_id : null,
            'attendance_date' => $this->attendance_date?->format('Y-m-d'),
            'clock_in_at' => $this->clock_in_at?->toISOString(),
            'clock_out_at' => $this->clock_out_at?->toISOString(),
            'late_minutes' => (int) $this->late_minutes,
            'overtime_minutes' => (int) $this->overtime_minutes,
            'status' => $this->status instanceof AttendanceStatusEnum ? $this->status->value : $this->status,
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
