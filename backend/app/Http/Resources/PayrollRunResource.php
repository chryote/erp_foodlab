<?php

namespace App\Http\Resources;

use App\Enums\PayrollRunStatus;
use App\Models\PayrollRun;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin PayrollRun */
class PayrollRunResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $status = $this->status instanceof PayrollRunStatus
            ? $this->status->value
            : $this->status;

        return [
            'id' => (int) $this->id,
            'company_id' => (int) $this->company_id,
            'code' => $this->code,
            'name' => $this->name,
            'period_date' => $this->period_date?->format('Y-m-d'),
            'status' => $status,
            'total_base_salary' => (float) $this->total_base_salary,
            'total_bpjs_kesehatan' => (float) $this->total_bpjs_kesehatan,
            'total_bpjs_ketenagakerjaan' => (float) $this->total_bpjs_ketenagakerjaan,
            'total_bonus' => (float) $this->total_bonus,
            'total_overtime' => (float) $this->total_overtime,
            'total_deduction' => (float) $this->total_deduction,
            'total_thr' => (float) $this->total_thr,
            'total_pph21' => (float) $this->total_pph21,
            'total_net' => (float) $this->total_net,
            'notes' => $this->notes,
            'approved_by' => $this->approved_by !== null ? (int) $this->approved_by : null,
            'approved_at' => $this->approved_at?->toISOString(),
            'company' => $this->whenLoaded('company', fn ($company) => new CompanyResource($company)),
            'approver' => $this->whenLoaded('approver', fn ($approver) => $approver !== null ? new UserResource($approver) : null),
            'items' => PayrollItemResource::collection($this->whenLoaded('items')),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
            'deleted_at' => $this->deleted_at?->toISOString(),
        ];
    }
}
