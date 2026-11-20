<?php

namespace App\Modules\CHO\Requests;

use App\Models\PayrollGrade;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class SavePayrollGradeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        if (is_string($this->input('sub_grade'))) {
            $this->merge([
                'sub_grade' => trim($this->input('sub_grade')),
            ]);
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
            'base_salary' => [...$presence, 'numeric', 'min:0'],
            'position_allowance' => ['sometimes', 'nullable', 'numeric', 'min:0'],
        ];
    }

    /**
     * @return array<int, callable(Validator): void>
     */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                if ($validator->errors()->hasAny(['grade', 'sub_grade'])) {
                    return;
                }

                /** @var PayrollGrade|null $payrollGrade */
                $payrollGrade = $this->route('payrollGrade');

                $grade = $this->has('grade')
                    ? (int) $this->input('grade')
                    : $payrollGrade?->grade;
                $subGrade = $this->has('sub_grade')
                    ? trim((string) $this->input('sub_grade'))
                    : $payrollGrade?->sub_grade;

                if ($grade === null || $subGrade === null || $subGrade === '') {
                    return;
                }

                $duplicateExists = PayrollGrade::query()
                    ->where('grade', $grade)
                    ->where('sub_grade', $subGrade)
                    ->when($payrollGrade !== null, fn ($query) => $query->whereKeyNot($payrollGrade->getKey()))
                    ->exists();

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
            $validated['sub_grade'] = trim((string) $validated['sub_grade']);
        }

        if (array_key_exists('level_label', $validated)) {
            $validated['level_label'] = $validated['level_label'] !== null
                ? trim((string) $validated['level_label'])
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
