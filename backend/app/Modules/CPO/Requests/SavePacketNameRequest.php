<?php

namespace App\Modules\CPO\Requests;

use App\Models\PacketName;
use App\Support\InputNormalizer;
use App\Support\WriteGuard;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class SavePacketNameRequest extends FormRequest
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
        $presence = $this->isMethod('PATCH') ? ['sometimes', 'required'] : ['required'];

        return [
            'name' => [...$presence, 'string', 'max:150'],
        ];
    }

    /**
     * @return array<int, callable(Validator): void>
     */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                if ($validator->errors()->has('name')) {
                    return;
                }

                /** @var PacketName|null $packetName */
                $packetName = $this->route('packetName');

                $effectiveName = $this->has('name')
                    ? InputNormalizer::text((string) $this->input('name'))
                    : $packetName?->name;

                if ($effectiveName !== null && $effectiveName !== '' && WriteGuard::existsCaseInsensitive(
                    PacketName::query(),
                    'name',
                    $effectiveName,
                    [],
                    $packetName?->getKey()
                )) {
                    $validator->errors()->add('name', 'Nama paket yang sama sudah terdaftar.');
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
            $validated['name'] = InputNormalizer::text((string) $validated['name']) ?? '';
        }

        return $validated;
    }
}
