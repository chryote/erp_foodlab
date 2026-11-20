<?php

namespace App\Http\Requests;

use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class LoginRequest extends FormRequest
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
            'email' => ['required', 'string', 'email'],
            'password' => ['required', 'string'],
            'device_name' => ['sometimes', 'nullable', 'string', 'max:100'],
        ];
    }

    /**
     * Verify the credentials without starting a stateful session.
     *
     * @throws ValidationException
     */
    public function authenticate(): User
    {
        $email = strtolower(trim((string) $this->input('email')));
        $user = User::query()->where('email', $email)->first();

        if (! $user || ! Hash::check((string) $this->input('password'), $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['These credentials do not match our records.'],
            ]);
        }

        return $user;
    }
}
