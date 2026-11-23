<?php

namespace App\Modules\CHO\Requests;

use App\Support\InputNormalizer;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class PayrollWorkspaceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        if ($this->has('period') && is_string($this->input('period'))) {
            $this->merge([
                'period' => InputNormalizer::text($this->input('period')),
            ]);
        }
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'company_id' => [
                'sometimes',
                'nullable',
                'integer',
                Rule::exists('companies', 'id')->whereNull('deleted_at'),
            ],
            'period' => [
                'sometimes',
                'nullable',
                'string',
                'regex:/^\d{4}-\d{2}(-\d{2})?$/',
            ],
        ];
    }

    /**
     * @return array{company_id: int|null, period: string}
     */
    public function payload(): array
    {
        $validated = $this->validated();

        return [
            'company_id' => isset($validated['company_id']) ? (int) $validated['company_id'] : null,
            'period' => isset($validated['period']) && $validated['period'] !== ''
                ? (string) $validated['period']
                : now()->format('Y-m'),
        ];
    }
}
