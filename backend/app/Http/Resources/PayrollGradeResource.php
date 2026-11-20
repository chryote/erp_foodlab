<?php

namespace App\Http\Resources;

use App\Models\PayrollGrade;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin PayrollGrade */
class PayrollGradeResource extends JsonResource
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
            'grade' => (int) $this->grade,
            'sub_grade' => $this->sub_grade,
            'level_label' => $this->level_label,
            'base_salary' => (float) $this->base_salary,
            'position_allowance' => (float) $this->position_allowance,
            'total_gross' => (float) $this->total_gross,
            'bpjs_kesehatan_company' => (float) $this->bpjs_kesehatan_company,
            'bpjs_kesehatan_employee' => (float) $this->bpjs_kesehatan_employee,
            'bpjs_ketenagakerjaan_company' => (float) $this->bpjs_ketenagakerjaan_company,
            'bpjs_ketenagakerjaan_employee' => (float) $this->bpjs_ketenagakerjaan_employee,
            'net_employee_received' => (float) $this->net_employee_received,
            'total_company_cost' => (float) $this->total_company_cost,
            'company' => $this->whenLoaded('company', fn ($company) => new CompanyResource($company)),
            'employees' => EmployeeResource::collection($this->whenLoaded('employees')),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
            'deleted_at' => $this->deleted_at?->toISOString(),
        ];
    }
}
