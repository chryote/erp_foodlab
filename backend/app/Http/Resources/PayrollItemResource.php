<?php

namespace App\Http\Resources;

use App\Enums\PayrollGroup;
use App\Enums\PayrollItemStatus;
use App\Models\PayrollItem;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin PayrollItem */
class PayrollItemResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $payrollGroup = $this->payroll_group instanceof PayrollGroup
            ? $this->payroll_group->value
            : $this->payroll_group;
        $status = $this->status instanceof PayrollItemStatus
            ? $this->status->value
            : ($this->status ?? PayrollItemStatus::DRAFT->value);

        return [
            'id' => (int) $this->id,
            'company_id' => (int) $this->company_id,
            'payroll_run_id' => (int) $this->payroll_run_id,
            'employee_id' => (int) $this->employee_id,
            'employee_position_id' => $this->employee_position_id !== null ? (int) $this->employee_position_id : null,
            'payroll_group' => $payrollGroup,
            'attendance_days' => (int) ($this->attendance_days ?? 0),
            'bank_account_number' => $this->bank_account_number,
            'base_salary' => (float) $this->base_salary,
            'bpjs_kesehatan' => (float) $this->bpjs_kesehatan,
            'bpjs_ketenagakerjaan' => (float) $this->bpjs_ketenagakerjaan,
            'bonus' => (float) $this->bonus,
            'overtime' => (float) $this->overtime,
            'deduction' => (float) $this->deduction,
            'thr' => (float) $this->thr,
            'pph21' => (float) $this->pph21,
            'total_net' => (float) $this->total_net,
            'status' => $status,
            'notes' => $this->notes,
            'finalized_by' => $this->finalized_by !== null ? (int) $this->finalized_by : null,
            'finalized_at' => $this->finalized_at?->toISOString(),
            'company' => $this->whenLoaded('company', fn ($company) => $company !== null ? new CompanyResource($company) : null),
            'payroll_run' => $this->whenLoaded('payrollRun', fn ($run) => $run !== null ? new PayrollRunResource($run) : null),
            'employee' => $this->whenLoaded('employee', fn ($employee) => $employee !== null ? new EmployeeResource($employee) : null),
            'employee_position' => $this->whenLoaded('employeePosition', fn ($position) => $position !== null ? new EmployeePositionResource($position) : null),
            'finalizer' => $this->whenLoaded('finalizer', fn ($finalizer) => $finalizer !== null ? new UserResource($finalizer) : null),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
            'deleted_at' => $this->deleted_at?->toISOString(),
        ];
    }
}
