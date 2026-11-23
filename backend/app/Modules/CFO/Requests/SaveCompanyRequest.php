<?php

namespace App\Modules\CFO\Requests;

use App\Models\Company;
use App\Support\InputNormalizer;
use App\Support\WriteGuard;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class SaveCompanyRequest extends FormRequest
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
            'name' => [...$requiredRule, 'string', 'max:150'],
            'series' => ['sometimes', 'required', 'integer', 'min:1', 'max:999999'],
        ];
    }

    /**
     * @return array<int, callable(Validator): void>
     */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                if ($validator->errors()->hasAny(['name', 'series'])) {
                    return;
                }

                /** @var Company|null $routeCompany */
                $routeCompany = $this->route('company');
                $effectiveName = $this->has('name')
                    ? InputNormalizer::text((string) $this->input('name'))
                    : $routeCompany?->name;
                $effectiveSeries = $this->has('series')
                    ? (int) $this->input('series')
                    : (int) ($routeCompany?->series ?? 1);

                if ($effectiveName === null || $effectiveName === '') {
                    return;
                }

                if (WriteGuard::existsCaseInsensitive(
                    Company::query(),
                    'name',
                    $effectiveName,
                    ['series' => $effectiveSeries],
                    $routeCompany?->getKey()
                )) {
                    $validator->errors()->add(
                        'name',
                        'Perusahaan dengan nama dan seri yang sama sudah terdaftar.'
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

        if (array_key_exists('name', $validated)) {
            $validated['name'] = InputNormalizer::text((string) $validated['name']);
        }

        if (array_key_exists('series', $validated)) {
            $validated['series'] = (int) $validated['series'];
        }

        return $validated;
    }
}
