<?php

namespace App\Modules\CFO\Requests;

use App\Models\ExpenseType;
use App\Support\InputNormalizer;
use App\Support\WriteGuard;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class SaveExpenseTypeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        if ($this->has('name') && is_string($this->input('name'))) {
            $this->merge([
                'name' => InputNormalizer::text($this->input('name')),
            ]);
        }
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        /** @var ExpenseType|null $routeType */
        $routeType = $this->route('expenseType');
        $companyId = (int) ($this->input('company_id') ?? $routeType?->company_id ?? 0);
        $requiredRule = $this->isMethod('PATCH') ? ['sometimes', 'required'] : ['required'];

        return [
            'company_id' => [
                ...$requiredRule,
                'integer',
                Rule::exists('companies', 'id')->whereNull('deleted_at'),
            ],
            'expense_category_id' => [
                ...$requiredRule,
                'integer',
                Rule::exists('expense_categories', 'id')
                    ->whereNull('deleted_at')
                    ->where('company_id', $companyId),
            ],
            'name' => [...$requiredRule, 'string', 'max:150'],
        ];
    }

    /**
     * @return array<int, callable(Validator): void>
     */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                if ($validator->errors()->hasAny(['company_id', 'expense_category_id', 'name'])) {
                    return;
                }

                /** @var ExpenseType|null $routeType */
                $routeType = $this->route('expenseType');
                $effectiveCompanyId = $this->filled('company_id')
                    ? (int) $this->input('company_id')
                    : (int) ($routeType?->company_id ?? 0);
                $effectiveCategoryId = $this->filled('expense_category_id')
                    ? (int) $this->input('expense_category_id')
                    : (int) ($routeType?->expense_category_id ?? 0);
                $effectiveName = $this->has('name')
                    ? InputNormalizer::text((string) $this->input('name'))
                    : $routeType?->name;

                if ($effectiveCompanyId <= 0 || $effectiveCategoryId <= 0 || $effectiveName === null || $effectiveName === '') {
                    return;
                }

                if (WriteGuard::existsCaseInsensitive(
                    ExpenseType::query(),
                    'name',
                    $effectiveName,
                    [
                        'company_id' => $effectiveCompanyId,
                        'expense_category_id' => $effectiveCategoryId,
                    ],
                    $routeType?->getKey()
                )) {
                    $validator->errors()->add(
                        'name',
                        'Tipe pengeluaran dengan nama yang sama sudah terdaftar pada kategori ini.'
                    );
                }
            },
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function payload(): array
    {
        $validated = $this->validated();

        if (array_key_exists('company_id', $validated)) {
            $validated['company_id'] = (int) $validated['company_id'];
        }

        if (array_key_exists('expense_category_id', $validated)) {
            $validated['expense_category_id'] = (int) $validated['expense_category_id'];
        }

        if (array_key_exists('name', $validated)) {
            $validated['name'] = InputNormalizer::text((string) $validated['name']);
        }

        return $validated;
    }
}
