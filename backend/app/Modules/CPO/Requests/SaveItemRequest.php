<?php

namespace App\Modules\CPO\Requests;

use App\Enums\ItemType;
use App\Models\Item;
use App\Support\ExclusiveOwner;
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

        foreach (['company_id', 'packet_vendor_id', 'name', 'type'] as $field) {
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
                'sometimes',
                'nullable',
                'integer',
                Rule::exists('companies', 'id')->whereNull('deleted_at'),
            ],
            'packet_vendor_id' => [
                'sometimes',
                'nullable',
                'integer',
                Rule::exists('packet_vendors', 'id')->whereNull('deleted_at'),
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
                $owner = ExclusiveOwner::resolveForRequest($this, $item);

                if ($owner['both_submitted']) {
                    $message = 'Item tidak boleh terhubung ke perusahaan dan vendor paket secara bersamaan.';
                    $validator->errors()->add('company_id', $message);
                    $validator->errors()->add('packet_vendor_id', $message);

                    return;
                }

                if ($validator->errors()->hasAny(['company_id', 'packet_vendor_id'])) {
                    return;
                }

                $effectiveCompanyId = $owner['company_id'];
                $effectiveVendorId = $owner['packet_vendor_id'];

                if (($effectiveCompanyId === null) === ($effectiveVendorId === null)) {
                    $message = 'Item harus terhubung ke tepat satu: perusahaan atau vendor paket.';
                    $validator->errors()->add('company_id', $message);
                    $validator->errors()->add('packet_vendor_id', $message);

                    return;
                }

                if ($item instanceof Item) {
                    $oldCompanyId = $item->company_id !== null ? (int) $item->company_id : null;
                    $oldVendorId = $item->packet_vendor_id !== null ? (int) $item->packet_vendor_id : null;

                    if (
                        ($effectiveCompanyId !== $oldCompanyId || $effectiveVendorId !== $oldVendorId)
                        && $item->itemPackets()->exists()
                    ) {
                        $errorField = $this->filled('packet_vendor_id') && ! $this->filled('company_id')
                            ? 'packet_vendor_id'
                            : 'company_id';

                        $validator->errors()->add(
                            $errorField,
                            'Tidak dapat mengubah pemilik karena item masih terhubung dengan paket aktif.'
                        );

                        return;
                    }
                }

                $scopeFilters = ExclusiveOwner::scopeFilters($effectiveCompanyId, $effectiveVendorId);
                $ownerLabel = $effectiveCompanyId !== null ? 'perusahaan' : 'vendor paket';

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
                        $scopeFilters,
                        $item?->getKey()
                    )) {
                        $validator->errors()->add('code', "Item dengan kode yang sama sudah terdaftar pada {$ownerLabel} ini.");
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
                        $scopeFilters,
                        $item?->getKey()
                    )) {
                        $validator->errors()->add('name', "Item dengan nama yang sama sudah terdaftar pada {$ownerLabel} ini.");
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
        $validated = ExclusiveOwner::applyToPayload($this->validated());
        $isPatch = $this->isMethod('PATCH');
        /** @var Item|null $routeItem */
        $routeItem = $this->route('item');

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
