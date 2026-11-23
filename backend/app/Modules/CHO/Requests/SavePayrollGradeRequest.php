<?php

namespace App\Modules\CHO\Requests;

use App\Models\PayrollGrade;
use App\Support\InputNormalizer;
use App\Support\WriteGuard;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class SavePayrollGradeRequest extends FormRequest
{
    private const MAX_DECIMAL_18_2 = 9999999999999999.99;

    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $normalized = [];

        if ($this->has('sub_grade') && is_string($this->input('sub_grade'))) {
            $normalized['sub_grade'] = InputNormalizer::text($this->input('sub_grade'));
        }

        if ($this->has('level_label') && is_string($this->input('level_label'))) {
            $normalized['level_label'] = InputNormalizer::nullableText($this->input('level_label'));
        }

        if ($normalized !== []) {
            $this->merge($normalized);
        }
    }

    /**
     * Derived payroll columns are computed in PayrollGradeService and never
     * accepted from the client.
     *
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $presence = $this->isMethod('PATCH') ? ['sometimes', 'required'] : ['required'];

        return [
            'company_id' => [
                ...$presence,
                'integer',
                Rule::exists('companies', 'id')->whereNull('deleted_at'),
            ],
            'grade' => [...$presence, 'integer', 'min:1', 'max:255'],
            'sub_grade' => [...$presence, 'string', 'max:10'],
            'level_label' => ['sometimes', 'nullable', 'string', 'max:150'],
            'base_salary' => [...$presence, 'numeric', 'min:0', 'max:9999999999999999.99', 'decimal:0,2'],
            'position_allowance' => ['sometimes', 'nullable', 'numeric', 'min:0', 'max:9999999999999999.99', 'decimal:0,2'],
        ];
    }

    /**
     * @return array<int, callable(Validator): void>
     */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                /** @var PayrollGrade|null $payrollGrade */
                $payrollGrade = $this->route('payrollGrade');

                if (! $validator->errors()->hasAny(['base_salary', 'position_allowance'])) {
                    $baseSalary = $this->has('base_salary')
                        ? (float) $this->input('base_salary')
                        : (float) ($payrollGrade?->base_salary ?? 0);
                    $positionAllowance = $this->has('position_allowance')
                        ? (float) ($this->input('position_allowance') ?? 0)
                        : (float) ($payrollGrade?->position_allowance ?? 0);

                    $totalGross = $baseSalary + $positionAllowance;
                    $totalCompanyCost = $totalGross + round($totalGross * 0.04) + round($totalGross * 0.0394);
                    if ($totalCompanyCost > self::MAX_DECIMAL_18_2) {
                        $validator->errors()->add(
                            'base_salary',
                            'The computed total company cost exceeds the maximum supported decimal(18,2) amount.'
                        );
                    }
                }

                if ($validator->errors()->hasAny(['company_id', 'grade', 'sub_grade'])) {
                    return;
                }

                $companyId = $this->filled('company_id')
                    ? (int) $this->input('company_id')
                    : $payrollGrade?->company_id;
                $grade = $this->has('grade')
                    ? (int) $this->input('grade')
                    : $payrollGrade?->grade;
                $subGrade = $this->has('sub_grade')
                    ? InputNormalizer::text((string) $this->input('sub_grade'))
                    : $payrollGrade?->sub_grade;

                if ($companyId === null || $grade === null || $subGrade === null || $subGrade === '') {
                    return;
                }

                $duplicateExists = WriteGuard::existsCaseInsensitive(
                    PayrollGrade::query(),
                    'sub_grade',
                    $subGrade,
                    [
                        'company_id' => $companyId,
                        'grade' => $grade,
                    ],
                    $payrollGrade?->getKey()
                );

                if ($duplicateExists) {
                    $errorField = $this->has('sub_grade') ? 'sub_grade' : 'grade';
                    $validator->errors()->add(
                        $errorField,
                        'The combination of grade and sub grade has already been taken.'
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

        if (array_key_exists('grade', $validated)) {
            $validated['grade'] = (int) $validated['grade'];
        }

        if (array_key_exists('sub_grade', $validated)) {
            $validated['sub_grade'] = InputNormalizer::text((string) $validated['sub_grade']);
        }

        if (array_key_exists('level_label', $validated)) {
            $validated['level_label'] = $validated['level_label'] !== null
                ? InputNormalizer::nullableText((string) $validated['level_label'])
                : null;
        }

        if (array_key_exists('base_salary', $validated)) {
            $validated['base_salary'] = (float) $validated['base_salary'];
        }

        if (array_key_exists('position_allowance', $validated)) {
            $validated['position_allowance'] = $validated['position_allowance'] !== null
                ? (float) $validated['position_allowance']
                : 0.0;
        } elseif (! $this->isMethod('PATCH')) {
            $validated['position_allowance'] = 0.0;
        }

        return $validated;
    }
}
