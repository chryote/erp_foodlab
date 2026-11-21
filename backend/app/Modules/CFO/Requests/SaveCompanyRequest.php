<?php

namespace App\Modules\CFO\Requests;

use Illuminate\Foundation\Http\FormRequest;

class SaveCompanyRequest extends FormRequest
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
        $requiredRule = $this->isMethod('PATCH') ? ['sometimes', 'required'] : ['required'];

        return [
            'name' => [...$requiredRule, 'string', 'max:150'],
            'series' => ['sometimes', 'required', 'integer', 'min:1', 'max:999999'],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function payload(): array
    {
        $validated = $this->validated();

        if (array_key_exists('name', $validated)) {
            $validated['name'] = (string) $validated['name'];
        }

        if (array_key_exists('series', $validated)) {
            $validated['series'] = (int) $validated['series'];
        }

        return $validated;
    }
}
