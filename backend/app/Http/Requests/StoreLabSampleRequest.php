<?php

namespace App\Http\Requests;

use App\Enums\LabSampleStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreLabSampleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'batch_code' => ['required', 'string', 'max:64', 'unique:lab_samples,batch_code'],
            'product_name' => ['required', 'string', 'max:150'],
            'category' => ['required', 'string', 'max:80'],
            'ph_level' => ['required', 'numeric', 'between:0,14'],
            'moisture_percent' => ['required', 'numeric', 'between:0,100'],
            'status' => ['sometimes', 'string', Rule::enum(LabSampleStatus::class)],
        ];
    }
}
