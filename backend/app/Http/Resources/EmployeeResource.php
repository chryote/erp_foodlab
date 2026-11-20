<?php

namespace App\Http\Resources;

use App\Models\Employee;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Employee */
class EmployeeResource extends JsonResource
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
            'employee_position_id' => $this->employee_position_id !== null ? (int) $this->employee_position_id : null,
            'employment_status_id' => $this->employment_status_id !== null ? (int) $this->employment_status_id : null,
            'payroll_grade_id' => $this->payroll_grade_id !== null ? (int) $this->payroll_grade_id : null,
            'name' => $this->name,
            'email' => $this->email,
            'phone' => $this->phone,
            'company' => $this->whenLoaded('company', fn ($company) => new CompanyResource($company)),
            'employee_position' => $this->whenLoaded(
                'employeePosition',
                fn ($position) => new EmployeePositionResource($position)
            ),
            'employment_status' => $this->whenLoaded(
                'employmentStatus',
                fn ($status) => new EmploymentStatusResource($status)
            ),
            'payroll_grade' => $this->whenLoaded(
                'payrollGrade',
                fn ($grade) => new PayrollGradeResource($grade)
            ),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
            'deleted_at' => $this->deleted_at?->toISOString(),
        ];
    }
}
