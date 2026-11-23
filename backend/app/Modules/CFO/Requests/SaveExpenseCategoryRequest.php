<?php

namespace App\Modules\CFO\Requests;

use App\Models\ExpenseCategory;
use App\Support\InputNormalizer;
use App\Support\WriteGuard;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class SaveExpenseCategoryRequest extends FormRequest
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
        $requiredRule = $this->isMethod('PATCH') ? ['sometimes', 'required'] : ['required'];

        return [
            'company_id' => [
                ...$requiredRule,
                'integer',
                Rule::exists('companies', 'id')->whereNull('deleted_at'),
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
                if ($validator->errors()->hasAny(['company_id', 'name'])) {
                    return;
                }

                /** @var ExpenseCategory|null $routeCategory */
                $routeCategory = $this->route('expenseCategory');
                $effectiveCompanyId = $this->filled('company_id')
                    ? (int) $this->input('company_id')
                    : (int) ($routeCategory?->company_id ?? 0);
                $effectiveName = $this->has('name')
                    ? InputNormalizer::text((string) $this->input('name'))
                    : $routeCategory?->name;

                if ($effectiveCompanyId <= 0 || $effectiveName === null || $effectiveName === '') {
                    return;
                }

                if (WriteGuard::existsCaseInsensitive(
                    ExpenseCategory::query(),
                    'name',
                    $effectiveName,
                    ['company_id' => $effectiveCompanyId],
                    $routeCategory?->getKey()
                )) {
                    $validator->errors()->add(
                        'name',
                        'Kategori pengeluaran dengan nama yang sama sudah terdaftar pada perusahaan ini.'
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

        if (array_key_exists('name', $validated)) {
            $validated['name'] = InputNormalizer::text((string) $validated['name']);
        }

        return $validated;
    }
}
