<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\ExpenseItem */
class ExpenseItemResource extends JsonResource
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
            'expense_category_id' => $this->expense_category_id !== null ? (int) $this->expense_category_id : null,
            'expense_type_id' => (int) $this->expense_type_id,
            'company_id' => (int) $this->company_id,
            'name' => $this->name,
            'amount' => (float) $this->amount,
            'purchased_on' => $this->purchased_on?->format('Y-m-d'),
            'closing_date' => $this->closing_date?->format('Y-m-d'),
            'employee_id' => $this->employee_id !== null ? (int) $this->employee_id : null,
            'detail' => $this->detail,
            'expense_category' => $this->whenLoaded(
                'expenseCategory',
                fn ($category) => new ExpenseCategoryResource($category)
            ),
            'expense_type' => $this->whenLoaded(
                'expenseType',
                fn ($type) => new ExpenseTypeResource($type)
            ),
            'company' => $this->whenLoaded('company', fn ($company) => new CompanyResource($company)),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
            'deleted_at' => $this->deleted_at?->toISOString(),
        ];
    }
}
