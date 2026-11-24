<?php

namespace App\Modules\CPO\Requests;

use App\Models\DefaultPackage;
use App\Models\Ingredient;
use App\Models\Item;
use App\Support\InputNormalizer;
use App\Support\WriteGuard;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class SaveIngredientRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $normalized = [];

        foreach (['default_package_id', 'item_id', 'price'] as $field) {
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

        return [
            'default_package_id' => [
                ...$presence,
                'integer',
                Rule::exists('default_packages', 'id')->whereNull('deleted_at'),
            ],
            'item_id' => [
                ...$presence,
                'integer',
                Rule::exists('items', 'id')->whereNull('deleted_at'),
            ],
            'price' => [
                'sometimes',
                'required',
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
                /** @var Ingredient|null $routeIngredient */
                $routeIngredient = $this->route('ingredient');

                $effectiveDefaultPackageId = $this->filled('default_package_id')
                    ? (int) $this->input('default_package_id')
                    : (int) ($routeIngredient?->default_package_id ?? 0);

                $effectiveItemId = $this->filled('item_id')
                    ? (int) $this->input('item_id')
                    : (int) ($routeIngredient?->item_id ?? 0);

                if (! $validator->errors()->has('default_package_id') && $effectiveDefaultPackageId > 0) {
                    $defaultPackageExists = DefaultPackage::query()
                        ->whereNull('deleted_at')
                        ->whereKey($effectiveDefaultPackageId)
                        ->exists();

                    if (! $defaultPackageExists) {
                        $validator->errors()->add(
                            'default_package_id',
                            'The selected default package is invalid or has been deleted.'
                        );
                    }
                }

                if (! $validator->errors()->has('item_id') && $effectiveItemId > 0) {
                    $itemExists = Item::query()
                        ->whereNull('deleted_at')
                        ->whereKey($effectiveItemId)
                        ->exists();

                    if (! $itemExists) {
                        $validator->errors()->add(
                            'item_id',
                            'The selected item is invalid or has been deleted.'
                        );
                    }
                }

                if (
                    ! $validator->errors()->hasAny(['default_package_id', 'item_id'])
                    && $effectiveDefaultPackageId > 0
                    && $effectiveItemId > 0
                    && WriteGuard::existsCaseInsensitive(
                        Ingredient::query(),
                        'item_id',
                        (string) $effectiveItemId,
                        ['default_package_id' => $effectiveDefaultPackageId],
                        $routeIngredient?->getKey()
                    )
                ) {
                    $validator->errors()->add(
                        'item_id',
                        'Item sudah terdaftar pada paket default ini.'
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
        $isPatch = $this->isMethod('PATCH');
        /** @var Ingredient|null $routeIngredient */
        $routeIngredient = $this->route('ingredient');

        foreach (['default_package_id', 'item_id'] as $intField) {
            if (array_key_exists($intField, $validated)) {
                $validated[$intField] = (int) $validated[$intField];
            }
        }

        if (array_key_exists('price', $validated)) {
            $validated['price'] = round((float) $validated['price'], 2);
        } elseif (! $isPatch && ! ($routeIngredient instanceof Ingredient)) {
            $validated['price'] = 0.0;
        }

        return $validated;
    }
}
