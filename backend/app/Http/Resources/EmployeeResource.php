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
            'tax_status_id' => $this->tax_status_id !== null ? (int) $this->tax_status_id : null,
            'employee_attendance_code' => $this->employee_attendance_code,
            'name' => $this->name,
            'email' => $this->email,
            'phone' => $this->phone,
            'photo_url' => $this->photo_url,
            'nik_ktp' => $this->nik_ktp,
            'nickname' => $this->nickname,
            'birth_place' => $this->birth_place,
            'birth_date' => $this->birth_date?->format('Y-m-d'),
            'gender' => $this->gender instanceof \BackedEnum ? $this->gender->value : $this->gender,
            'religion' => $this->religion instanceof \BackedEnum ? $this->religion->value : $this->religion,
            'blood_type' => $this->blood_type instanceof \BackedEnum ? $this->blood_type->value : $this->blood_type,
            'mother_name' => $this->mother_name,
            'ktp_address' => $this->ktp_address,
            'domicile_address' => $this->domicile_address,
            'whatsapp_number' => $this->whatsapp_number,
            'emergency_phone_number' => $this->emergency_phone_number,
            'instagram' => $this->instagram,
            'tiktok' => $this->tiktok,
            'bpjs_ketenagakerjaan' => $this->bpjs_ketenagakerjaan,
            'bpjs_kesehatan' => $this->bpjs_kesehatan,
            'npwp_number' => $this->npwp_number,
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
            'tax_status' => $this->whenLoaded(
                'taxStatus',
                fn ($taxStatus) => new TaxStatusResource($taxStatus)
            ),
            'documents' => EmployeeDocumentResource::collection($this->whenLoaded('documents')),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
            'deleted_at' => $this->deleted_at?->toISOString(),
        ];
    }
}
