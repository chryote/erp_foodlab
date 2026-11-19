<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\ExpenseType */
class ExpenseTypeResource extends JsonResource
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
            'expense_category_id' => (int) $this->expense_category_id,
            'company_id' => (int) $this->company_id,
            'name' => $this->name,
            'expense_category' => $this->whenLoaded(
                'expenseCategory',
                fn ($category) => new ExpenseCategoryResource($category)
            ),
            'company' => $this->whenLoaded('company', fn ($company) => new CompanyResource($company)),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
            'deleted_at' => $this->deleted_at?->toISOString(),
        ];
    }
}
