<?php

namespace App\Modules\CFO\Requests;

use App\Models\CapitalCompany;
use App\Support\InputNormalizer;
use App\Support\WriteGuard;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class SaveCapitalCompanyRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        if ($this->has('stakeholder_name') && is_string($this->input('stakeholder_name'))) {
            $this->merge([
                'stakeholder_name' => InputNormalizer::text($this->input('stakeholder_name')),
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
            'stakeholder_name' => [...$requiredRule, 'string', 'max:150'],
            'capital' => [
                ...$requiredRule,
                'numeric',
                'min:0',
                'max:9999999999999999.99',
                'decimal:0,2',
            ],
        ];
    }

    /**
     * @return array<int, callable(Validator): void>
     */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                if ($validator->errors()->hasAny(['company_id', 'stakeholder_name'])) {
                    return;
                }

                /** @var CapitalCompany|null $routeCapital */
                $routeCapital = $this->route('capitalCompany');
                $effectiveCompanyId = $this->filled('company_id')
                    ? (int) $this->input('company_id')
                    : (int) ($routeCapital?->company_id ?? 0);
                $effectiveStakeholder = $this->has('stakeholder_name')
                    ? InputNormalizer::text((string) $this->input('stakeholder_name'))
                    : $routeCapital?->stakeholder_name;

                if ($effectiveCompanyId <= 0 || $effectiveStakeholder === null || $effectiveStakeholder === '') {
                    return;
                }

                if (WriteGuard::existsCaseInsensitive(
                    CapitalCompany::query(),
                    'stakeholder_name',
                    $effectiveStakeholder,
                    ['company_id' => $effectiveCompanyId],
                    $routeCapital?->getKey()
                )) {
                    $validator->errors()->add(
                        'stakeholder_name',
                        'Pemegang saham dengan nama yang sama sudah terdaftar pada perusahaan ini.'
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

        if (array_key_exists('stakeholder_name', $validated)) {
            $validated['stakeholder_name'] = InputNormalizer::text((string) $validated['stakeholder_name']);
        }

        if (array_key_exists('capital', $validated)) {
            $validated['capital'] = round((float) $validated['capital'], 2);
        }

        return $validated;
    }
}
