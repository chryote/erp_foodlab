<?php

namespace App\Support;

use App\Models\Company;
use App\Models\PacketVendor;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\ValidationException;

/**
 * Resolves and validates mutually exclusive Company vs PacketVendor ownership
 * for entities such as Item and ItemPacket.
 */
final class ExclusiveOwner
{
    /**
     * @return array{company_id: ?int, packet_vendor_id: ?int, both_submitted: bool}
     */
    public static function resolveForRequest(FormRequest $request, ?Model $existing = null): array
    {
        $hasCompany = $request->has('company_id');
        $hasVendor = $request->has('packet_vendor_id');

        $reqCompany = $hasCompany && $request->input('company_id') !== null
            ? (int) $request->input('company_id')
            : null;
        $reqVendor = $hasVendor && $request->input('packet_vendor_id') !== null
            ? (int) $request->input('packet_vendor_id')
            : null;

        if ($reqCompany !== null && $reqVendor !== null) {
            return [
                'company_id' => $reqCompany,
                'packet_vendor_id' => $reqVendor,
                'both_submitted' => true,
            ];
        }

        if ($reqCompany !== null) {
            return [
                'company_id' => $reqCompany,
                'packet_vendor_id' => null,
                'both_submitted' => false,
            ];
        }

        if ($reqVendor !== null) {
            return [
                'company_id' => null,
                'packet_vendor_id' => $reqVendor,
                'both_submitted' => false,
            ];
        }

        $existingCompany = $existing?->getAttribute('company_id');
        $existingVendor = $existing?->getAttribute('packet_vendor_id');

        return [
            'company_id' => $hasCompany ? null : ($existingCompany !== null ? (int) $existingCompany : null),
            'packet_vendor_id' => $hasVendor ? null : ($existingVendor !== null ? (int) $existingVendor : null),
            'both_submitted' => false,
        ];
    }

    /**
     * Normalizes validated Request payloads so setting one owner clears the other.
     *
     * @param  array<string, mixed>  $validated
     * @return array<string, mixed>
     */
    public static function applyToPayload(array $validated): array
    {
        $hasCompany = array_key_exists('company_id', $validated) && $validated['company_id'] !== null;
        $hasVendor = array_key_exists('packet_vendor_id', $validated) && $validated['packet_vendor_id'] !== null;

        if ($hasCompany) {
            $validated['company_id'] = (int) $validated['company_id'];
            $validated['packet_vendor_id'] = null;
        } elseif ($hasVendor) {
            $validated['packet_vendor_id'] = (int) $validated['packet_vendor_id'];
            $validated['company_id'] = null;
        }

        return $validated;
    }

    /**
     * Resolves exclusive ownership for direct Service calls and throws 422 on invalid combinations.
     *
     * @param  array<string, mixed>  $attributes
     * @return array{company_id: ?int, packet_vendor_id: ?int, attributes: array<string, mixed>}
     */
    public static function resolveForService(array $attributes, ?Model $existing = null): array
    {
        $hasCompany = array_key_exists('company_id', $attributes);
        $hasVendor = array_key_exists('packet_vendor_id', $attributes);

        $reqCompany = $hasCompany && $attributes['company_id'] !== null
            ? (int) $attributes['company_id']
            : null;
        $reqVendor = $hasVendor && $attributes['packet_vendor_id'] !== null
            ? (int) $attributes['packet_vendor_id']
            : null;

        if ($reqCompany !== null && $reqVendor !== null) {
            throw ValidationException::withMessages([
                'company_id' => ['Data tidak boleh terhubung ke perusahaan dan vendor secara bersamaan.'],
                'packet_vendor_id' => ['Data tidak boleh terhubung ke perusahaan dan vendor secara bersamaan.'],
            ]);
        }

        if ($reqCompany !== null) {
            $attributes['company_id'] = $reqCompany;
            $attributes['packet_vendor_id'] = null;

            return [
                'company_id' => $reqCompany,
                'packet_vendor_id' => null,
                'attributes' => $attributes,
            ];
        }

        if ($reqVendor !== null) {
            $attributes['packet_vendor_id'] = $reqVendor;
            $attributes['company_id'] = null;

            return [
                'company_id' => null,
                'packet_vendor_id' => $reqVendor,
                'attributes' => $attributes,
            ];
        }

        $existingCompany = $existing?->getAttribute('company_id');
        $existingVendor = $existing?->getAttribute('packet_vendor_id');

        $companyId = $hasCompany ? null : ($existingCompany !== null ? (int) $existingCompany : null);
        $vendorId = $hasVendor ? null : ($existingVendor !== null ? (int) $existingVendor : null);

        if (($companyId === null) === ($vendorId === null)) {
            throw ValidationException::withMessages([
                'company_id' => ['Data harus terhubung ke tepat satu: perusahaan atau vendor paket.'],
                'packet_vendor_id' => ['Data harus terhubung ke tepat satu: perusahaan atau vendor paket.'],
            ]);
        }

        return [
            'company_id' => $companyId,
            'packet_vendor_id' => $vendorId,
            'attributes' => $attributes,
        ];
    }

    public static function assertActiveOwner(?int $companyId, ?int $packetVendorId, bool $sharedLock = true): void
    {
        if ($companyId !== null) {
            $query = Company::query()->whereNull('deleted_at');
            if ($sharedLock) {
                $query->sharedLock();
            }

            if (! $query->whereKey($companyId)->exists()) {
                throw ValidationException::withMessages([
                    'company_id' => ['The selected company is invalid or has been deleted.'],
                ]);
            }

            return;
        }

        if ($packetVendorId !== null) {
            $query = PacketVendor::query()->whereNull('deleted_at');
            if ($sharedLock) {
                $query->sharedLock();
            }

            if (! $query->whereKey($packetVendorId)->exists()) {
                throw ValidationException::withMessages([
                    'packet_vendor_id' => ['The selected packet vendor is invalid or has been deleted.'],
                ]);
            }
        }
    }

    /**
     * @return array<string, int>
     */
    public static function scopeFilters(?int $companyId, ?int $packetVendorId): array
    {
        return $companyId !== null
            ? ['company_id' => $companyId]
            : ['packet_vendor_id' => (int) $packetVendorId];
    }
}
