<?php

namespace App\Modules\CFO\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SaveCompanyAssetRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * `total_price` is intentionally not validated: it is derived in the
     * service as amount * price_per_unit and never trusted from the client.
     *
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'company_id' => [
                'required',
                'integer',
                Rule::exists('companies', 'id')->whereNull('deleted_at'),
            ],
            'asset_date' => ['required', 'date_format:Y-m-d'],
            'name' => ['required', 'string', 'max:150'],
            'amount' => ['required', 'integer', 'min:1'],
            'price_per_unit' => ['required', 'numeric', 'min:0'],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function payload(): array
    {
        $validated = $this->validated();
        $validated['company_id'] = (int) $validated['company_id'];
        $validated['asset_date'] = (string) $validated['asset_date'];
        $validated['name'] = (string) $validated['name'];
        $validated['amount'] = (int) $validated['amount'];
        $validated['price_per_unit'] = (float) $validated['price_per_unit'];

        return $validated;
    }
}
