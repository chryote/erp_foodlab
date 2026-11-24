<?php

namespace App\Modules\CPO\Requests;

use App\Enums\ItemType;
use App\Models\Item;
use App\Support\InputNormalizer;
use App\Support\WriteGuard;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class SaveItemRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $normalized = [];

        if ($this->has('code') && is_string($this->input('code'))) {
            $normalized['code'] = InputNormalizer::nullableText($this->input('code'));
        }

        foreach (['company_id', 'name', 'type'] as $field) {
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
        $presence = $this->isMethod('PATCH') ? ['sometimes', 'required'] : ['required'];
        $codePresence = $this->isMethod('PATCH') ? ['sometimes'] : [];

        return [
            'company_id' => [
                ...$presence,
                'integer',
                Rule::exists('companies', 'id')->whereNull('deleted_at'),
            ],
            'code' => [...$codePresence, 'nullable', 'string', 'max:50'],
            'name' => [...$presence, 'string', 'max:150'],
            'type' => ['sometimes', 'required', 'string', Rule::enum(ItemType::class)],
        ];
    }

    /**
     * @return array<int, callable(Validator): void>
     */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                /** @var Item|null $item */
                $item = $this->route('item');

                if (
                    $item instanceof Item
                    && $this->filled('company_id')
                    && ! $validator->errors()->has('company_id')
                    && (int) $this->input('company_id') !== (int) $item->company_id
                    && $item->itemPackets()->exists()
                ) {
                    $validator->errors()->add(
                        'company_id',
                        'Tidak dapat mengubah perusahaan karena item masih terhubung dengan paket aktif.'
                    );
                }

                if ($validator->errors()->has('company_id')) {
                    return;
                }

                $effectiveCompanyId = $this->filled('company_id')
                    ? (int) $this->input('company_id')
                    : (int) ($item?->company_id ?? 0);

                if ($effectiveCompanyId <= 0) {
                    return;
                }

                if (! $validator->errors()->has('code')) {
                    $effectiveCode = $this->has('code')
                        ? ($this->input('code') !== null && is_string($this->input('code'))
                            ? InputNormalizer::nullableText($this->input('code'))
                            : null)
                        : $item?->code;

                    if ($effectiveCode !== null && $effectiveCode !== '' && WriteGuard::existsCaseInsensitive(
                        Item::query(),
                        'code',
                        $effectiveCode,
                        ['company_id' => $effectiveCompanyId],
                        $item?->getKey()
                    )) {
                        $validator->errors()->add('code', 'Item dengan kode yang sama sudah terdaftar pada perusahaan ini.');
                    }
                }

                if (! $validator->errors()->has('name')) {
                    $effectiveName = $this->has('name')
                        ? InputNormalizer::text((string) $this->input('name'))
                        : $item?->name;

                    if ($effectiveName !== null && $effectiveName !== '' && WriteGuard::existsCaseInsensitive(
                        Item::query(),
                        'name',
                        $effectiveName,
                        ['company_id' => $effectiveCompanyId],
                        $item?->getKey()
                    )) {
                        $validator->errors()->add('name', 'Item dengan nama yang sama sudah terdaftar pada perusahaan ini.');
                    }
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
        $isPatch = $this->isMethod('PATCH');
        /** @var Item|null $routeItem */
        $routeItem = $this->route('item');

        if (array_key_exists('company_id', $validated)) {
            $validated['company_id'] = (int) $validated['company_id'];
        }

        if (array_key_exists('code', $validated)) {
            $validated['code'] = $validated['code'] !== null
                ? InputNormalizer::nullableText((string) $validated['code'])
                : null;
        }

        if (array_key_exists('name', $validated)) {
            $validated['name'] = InputNormalizer::text((string) $validated['name']) ?? '';
        }

        if (! array_key_exists('type', $validated) && ! $isPatch && ! ($routeItem instanceof Item)) {
            $validated['type'] = ItemType::Bahan->value;
        }

        return $validated;
    }
}
