<?php

namespace App\Modules\CFO\Requests;

use App\Models\CompanyAsset;
use App\Support\InputNormalizer;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class SaveCompanyAssetRequest extends FormRequest
{
    private const MAX_DECIMAL_18_2 = 9999999999999999.99;

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
     * `total_price` is intentionally not accepted from input: it is derived in the
     * service as amount * price_per_unit and never trusted from the client.
     *
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
            'asset_date' => [...$requiredRule, 'date_format:Y-m-d'],
            'name' => [...$requiredRule, 'string', 'max:150'],
            'amount' => [...$requiredRule, 'integer', 'min:1', 'max:4294967295'],
            'price_per_unit' => [
                ...$requiredRule,
                'numeric',
                'min:0',
                'max:9999999999999999.99',
                'decimal:0,2',
            ],
        ];
    }

    public function after(): array
    {
        return [
            function (Validator $validator): void {
                if ($validator->errors()->hasAny(['amount', 'price_per_unit'])) {
                    return;
                }

                /** @var CompanyAsset|null $routeAsset */
                $routeAsset = $this->route('companyAsset');
                $amount = $this->has('amount')
                    ? (int) $this->input('amount')
                    : (int) ($routeAsset?->amount ?? 0);
                $pricePerUnit = $this->has('price_per_unit')
                    ? (float) $this->input('price_per_unit')
                    : (float) ($routeAsset?->price_per_unit ?? 0);

                if (($amount * $pricePerUnit) > self::MAX_DECIMAL_18_2) {
                    $validator->errors()->add(
                        'price_per_unit',
                        'The computed total price exceeds the maximum supported decimal(18,2) amount.'
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

        if (array_key_exists('asset_date', $validated)) {
            $validated['asset_date'] = (string) $validated['asset_date'];
        }

        if (array_key_exists('name', $validated)) {
            $validated['name'] = InputNormalizer::text((string) $validated['name']);
        }

        if (array_key_exists('amount', $validated)) {
            $validated['amount'] = (int) $validated['amount'];
        }

        if (array_key_exists('price_per_unit', $validated)) {
            $validated['price_per_unit'] = round((float) $validated['price_per_unit'], 2);
        }

        return $validated;
    }
}
