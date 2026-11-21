<?php

namespace App\Http\Requests;

use App\Enums\LabSampleStatus;
use App\Models\LabSample;
use App\Support\InputNormalizer;
use App\Support\WriteGuard;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class StoreLabSampleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $normalized = [];

        foreach (['batch_code', 'product_name', 'category'] as $field) {
            if ($this->has($field) && is_string($this->input($field))) {
                $normalized[$field] = InputNormalizer::text($this->input($field));
            }
        }

        if ($normalized !== []) {
            $this->merge($normalized);
        }
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'batch_code' => [
                'required',
                'string',
                'max:64',
                Rule::unique('lab_samples', 'batch_code')->whereNull('deleted_at'),
            ],
            'product_name' => ['required', 'string', 'max:150'],
            'category' => ['required', 'string', 'max:80'],
            'ph_level' => ['required', 'numeric', 'between:0,14'],
            'moisture_percent' => ['required', 'numeric', 'between:0,100'],
            'status' => ['sometimes', 'string', Rule::enum(LabSampleStatus::class)],
        ];
    }

    /**
     * @return array<int, callable(Validator): void>
     */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                if ($validator->errors()->has('batch_code')) {
                    return;
                }

                $batchCode = InputNormalizer::text((string) $this->input('batch_code'));
                if ($batchCode === null || $batchCode === '') {
                    return;
                }

                if (WriteGuard::existsCaseInsensitive(LabSample::query(), 'batch_code', $batchCode)) {
                    $validator->errors()->add('batch_code', 'The batch code has already been taken.');
                }
            },
        ];
    }
}
