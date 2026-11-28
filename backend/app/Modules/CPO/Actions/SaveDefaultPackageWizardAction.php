<?php

namespace App\Modules\CPO\Actions;

use App\Models\DefaultPackage;
use App\Models\Ingredient;
use App\Models\Item;
use App\Models\ItemPacket;
use App\Models\Packet;
use App\Models\PacketCategory;
use App\Models\PacketName;
use App\Modules\CPO\Services\DefaultPackageService;
use App\Support\CompanyOwnerScope;
use App\Support\ExclusiveOwner;
use App\Support\InputNormalizer;
use App\Support\WriteGuard;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Atomically persists (create or update) the multi-step "Paket Awal" wizard across
 * PacketName, PacketCategory, Packet, ItemPacket, DefaultPackage, and Ingredient.
 */
class SaveDefaultPackageWizardAction
{
    public function __construct(
        protected DefaultPackageService $defaultPackageService,
    ) {}

    /**
     * @param  array<string, mixed>  $attributes
     */
    public function execute(array $attributes, ?DefaultPackage $existing = null): DefaultPackage
    {
        $packetName = InputNormalizer::text((string) ($attributes['packet_name'] ?? '')) ?? '';
        $packetCategory = InputNormalizer::text((string) ($attributes['packet_category'] ?? '')) ?? '';
        $brandName = InputNormalizer::text((string) ($attributes['brand_name'] ?? '')) ?? '';

        if ($packetName === '' || $packetCategory === '' || $brandName === '') {
            throw ValidationException::withMessages([
                'brand_name' => ['Nama paket, kategori paket, dan nama brand wajib diisi.'],
            ]);
        }

        $itemsInput = $attributes['items'] ?? [];
        if (! is_array($itemsInput) || $itemsInput === []) {
            throw ValidationException::withMessages([
                'items' => ['Minimal 1 item bahan harus dipilih.'],
            ]);
        }

        $rawPackagePrice = $attributes['price'] ?? null;
        if (
            $rawPackagePrice === null
            || ! is_numeric($rawPackagePrice)
            || (float) $rawPackagePrice < 0
            || round((float) $rawPackagePrice, 2) > 9999999999999999.99
        ) {
            throw ValidationException::withMessages([
                'price' => ['Total harga paket awal tidak valid.'],
            ]);
        }
        $totalPrice = round((float) $rawPackagePrice, 2);

        $resolvedOwner = ExclusiveOwner::resolveForService($attributes);
        $companyId = $resolvedOwner['company_id'];
        $packetVendorId = $resolvedOwner['packet_vendor_id'];
        $companyOwnerId = CompanyOwnerScope::resolveId($attributes, $existing) ?? $companyId;

        $defaultPackage = DB::transaction(function () use (
            $existing,
            $packetName,
            $packetCategory,
            $brandName,
            $companyOwnerId,
            $companyId,
            $packetVendorId,
            $itemsInput,
            $totalPrice
        ): DefaultPackage {
            $lockedExisting = $existing !== null
                ? DefaultPackage::query()->lockForUpdate()->findOrFail($existing->getKey())
                : null;

            CompanyOwnerScope::assertActiveOwner($companyOwnerId, true);
            ExclusiveOwner::assertActiveOwner($companyId, $packetVendorId, true);

            $normalizedRows = $this->normalizeAndValidateItems($itemsInput, $companyId, $packetVendorId);

            /** @var PacketName $packetNameRecord */
            $packetNameRecord = $this->firstOrCreateActiveByName(PacketName::class, $packetName, $companyOwnerId);
            /** @var PacketCategory $packetCategoryRecord */
            $packetCategoryRecord = $this->firstOrCreateActiveByName(PacketCategory::class, $packetCategory, $companyOwnerId);
            /** @var Packet $packetRecord */
            $packetRecord = $this->firstOrCreateActiveByName(Packet::class, $packetName, $companyOwnerId);

            $ownerScope = ExclusiveOwner::scopeFilters($companyId, $packetVendorId);
            $targetPacketId = (int) $packetRecord->getKey();

            WriteGuard::assertUniqueActive(
                DefaultPackage::query(),
                'brand_name',
                $brandName,
                [
                    ...CompanyOwnerScope::scopeFilters($companyOwnerId),
                    'packet_name_id' => (int) $packetNameRecord->getKey(),
                    ...$ownerScope,
                    'packet_category_id' => (int) $packetCategoryRecord->getKey(),
                    'packet_id' => $targetPacketId,
                ],
                'brand_name',
                'Paket default dengan kombinasi merek, nama paket, pemilik, kategori, dan paket yang sama sudah terdaftar.',
                $lockedExisting?->getKey(),
                true
            );

            $primaryItemPacketId = null;

            foreach ($normalizedRows as $row) {
                $itemPacketQuery = ItemPacket::query()
                    ->whereNull('deleted_at')
                    ->where('packet_id', $targetPacketId)
                    ->where('item_id', $row['item_id'])
                    ->when($companyOwnerId !== null, fn ($q) => $q->where('company_owner_id', $companyOwnerId))
                    ->lockForUpdate();

                if ($companyId !== null) {
                    $itemPacketQuery->where('company_id', $companyId)->whereNull('packet_vendor_id');
                } else {
                    $itemPacketQuery->where('packet_vendor_id', $packetVendorId)->whereNull('company_id');
                }

                /** @var ItemPacket|null $existingItemPacket */
                $existingItemPacket = $itemPacketQuery->first();

                if ($existingItemPacket !== null) {
                    $existingItemPacket->update(['quantity' => $row['quantity']]);
                    $itemPacket = $existingItemPacket;
                } else {
                    $itemPacket = ItemPacket::query()->create([
                        'company_owner_id' => $companyOwnerId,
                        'company_id' => $companyId,
                        'packet_vendor_id' => $packetVendorId,
                        'packet_id' => $targetPacketId,
                        'item_id' => $row['item_id'],
                        'quantity' => $row['quantity'],
                    ]);
                }

                if ($primaryItemPacketId === null) {
                    $primaryItemPacketId = (int) $itemPacket->getKey();
                }
            }

            $packageAttributes = [
                'company_owner_id' => $companyOwnerId,
                'brand_name' => $brandName,
                'packet_name_id' => (int) $packetNameRecord->getKey(),
                'company_id' => $companyId,
                'packet_vendor_id' => $packetVendorId,
                'packet_category_id' => (int) $packetCategoryRecord->getKey(),
                'packet_id' => $targetPacketId,
                'item_packet_id' => $primaryItemPacketId,
                'price' => $totalPrice,
            ];

            if ($lockedExisting !== null) {
                $oldPacketId = $lockedExisting->packet_id !== null ? (int) $lockedExisting->packet_id : null;
                $oldCompanyId = $lockedExisting->company_id !== null ? (int) $lockedExisting->company_id : null;
                $oldVendorId = $lockedExisting->packet_vendor_id !== null ? (int) $lockedExisting->packet_vendor_id : null;

                $lockedExisting->update($packageAttributes);
                $defaultPackage = $lockedExisting;

                $this->syncIngredients($defaultPackage, $normalizedRows, $companyOwnerId);
                $this->pruneUnusedItemPackets(
                    $defaultPackage,
                    $oldPacketId,
                    $oldCompanyId,
                    $oldVendorId,
                    $targetPacketId,
                    $companyId,
                    $packetVendorId,
                    array_column($normalizedRows, 'item_id')
                );
            } else {
                $defaultPackage = DefaultPackage::query()->create($packageAttributes);

                foreach ($normalizedRows as $row) {
                    Ingredient::query()->create([
                        'company_owner_id' => $companyOwnerId,
                        'default_package_id' => (int) $defaultPackage->getKey(),
                        'item_id' => $row['item_id'],
                        'price' => $row['price'],
                    ]);
                }
            }

            return $defaultPackage;
        });

        $this->defaultPackageService->forgetDependentCaches($companyOwnerId);

        return $defaultPackage->refresh()->load([
            'packetName',
            'company',
            'packetVendor',
            'packetCategory',
            'packet',
            'itemPacket',
            'ingredients.item',
        ]);
    }

    /**
     * @param  list<array{item_id: int, quantity: int, price: float}>  $normalizedRows
     */
    private function syncIngredients(DefaultPackage $defaultPackage, array $normalizedRows, ?int $companyOwnerId = null): void
    {
        $existingByItemId = $defaultPackage->ingredients()
            ->lockForUpdate()
            ->get()
            ->keyBy(fn (Ingredient $ingredient): int => (int) $ingredient->item_id);

        $targetItemIds = array_column($normalizedRows, 'item_id');

        foreach ($existingByItemId as $itemId => $existingIngredient) {
            if (! in_array($itemId, $targetItemIds, true)) {
                $existingIngredient->delete();
            }
        }

        foreach ($normalizedRows as $row) {
            /** @var Ingredient|null $existingIngredient */
            $existingIngredient = $existingByItemId->get($row['item_id']);
            if ($existingIngredient !== null) {
                $existingIngredient->update([
                    'company_owner_id' => $companyOwnerId,
                    'price' => $row['price'],
                ]);
            } else {
                Ingredient::query()->create([
                    'company_owner_id' => $companyOwnerId,
                    'default_package_id' => (int) $defaultPackage->getKey(),
                    'item_id' => $row['item_id'],
                    'price' => $row['price'],
                ]);
            }
        }
    }

    /**
     * Remove stale ItemPacket rows from the previous packet/owner when no active DefaultPackage uses them.
     *
     * @param  list<int>  $keptItemIds
     */
    private function pruneUnusedItemPackets(
        DefaultPackage $currentPackage,
        ?int $oldPacketId,
        ?int $oldCompanyId,
        ?int $oldVendorId,
        int $targetPacketId,
        ?int $companyId,
        ?int $packetVendorId,
        array $keptItemIds
    ): void {
        if ($oldPacketId === null) {
            return;
        }

        $samePacketAndOwner = $oldPacketId === $targetPacketId
            && $oldCompanyId === $companyId
            && $oldVendorId === $packetVendorId;

        $otherPackageSharesPacketAndOwner = DefaultPackage::query()
            ->whereNull('deleted_at')
            ->whereKeyNot($currentPackage->getKey())
            ->where('packet_id', $oldPacketId)
            ->when(
                $oldCompanyId !== null,
                fn ($q) => $q->where('company_id', $oldCompanyId)->whereNull('packet_vendor_id'),
                fn ($q) => $q->where('packet_vendor_id', $oldVendorId)->whereNull('company_id')
            )
            ->exists();

        if ($otherPackageSharesPacketAndOwner) {
            return;
        }

        $staleQuery = ItemPacket::query()
            ->whereNull('deleted_at')
            ->where('packet_id', $oldPacketId)
            ->when(
                $oldCompanyId !== null,
                fn ($q) => $q->where('company_id', $oldCompanyId)->whereNull('packet_vendor_id'),
                fn ($q) => $q->where('packet_vendor_id', $oldVendorId)->whereNull('company_id')
            )
            ->when(
                $samePacketAndOwner && $keptItemIds !== [],
                fn ($q) => $q->whereNotIn('item_id', $keptItemIds)
            );

        $staleIds = $staleQuery->lockForUpdate()->pluck('id')->all();
        if ($staleIds === []) {
            return;
        }

        $referencedIds = DefaultPackage::query()
            ->whereNull('deleted_at')
            ->whereIn('item_packet_id', $staleIds)
            ->pluck('item_packet_id')
            ->map(fn ($id): int => (int) $id)
            ->all();

        $deletableIds = array_values(array_diff(array_map('intval', $staleIds), $referencedIds));
        if ($deletableIds !== []) {
            ItemPacket::query()->whereIn('id', $deletableIds)->delete();
        }
    }

    /**
     * @param  array<int, mixed>  $itemsInput
     * @return list<array{item_id: int, quantity: int, price: float}>
     */
    private function normalizeAndValidateItems(array $itemsInput, ?int $companyId, ?int $packetVendorId): array
    {
        $rows = [];
        $seenItemIds = [];

        foreach ($itemsInput as $index => $rawRow) {
            if (! is_array($rawRow)) {
                throw ValidationException::withMessages([
                    "items.{$index}" => ['Format baris item tidak valid.'],
                ]);
            }

            $itemId = isset($rawRow['item_id']) ? (int) $rawRow['item_id'] : 0;
            $quantity = isset($rawRow['quantity']) ? (int) $rawRow['quantity'] : 0;
            $rawItemPrice = $rawRow['price'] ?? 0;

            if ($itemId <= 0 || in_array($itemId, $seenItemIds, true)) {
                throw ValidationException::withMessages([
                    "items.{$index}.item_id" => ['Item harus valid dan tidak boleh duplikat dalam satu paket.'],
                ]);
            }

            if ($quantity < 1) {
                throw ValidationException::withMessages([
                    "items.{$index}.quantity" => ['Jumlah item minimal 1.'],
                ]);
            }

            if (
                ! is_numeric($rawItemPrice)
                || (float) $rawItemPrice < 0
                || round((float) $rawItemPrice, 2) > 9999999999999999.99
            ) {
                throw ValidationException::withMessages([
                    "items.{$index}.price" => ['Harga item tidak valid.'],
                ]);
            }

            $seenItemIds[] = $itemId;
            $rows[] = [
                'index' => $index,
                'item_id' => $itemId,
                'quantity' => $quantity,
                'price' => round((float) $rawItemPrice, 2),
            ];
        }

        $itemsById = Item::query()
            ->whereNull('deleted_at')
            ->sharedLock()
            ->whereIn('id', $seenItemIds)
            ->get()
            ->keyBy('id');

        $validated = [];
        foreach ($rows as $row) {
            /** @var Item|null $item */
            $item = $itemsById->get($row['item_id']);
            if ($item === null) {
                throw ValidationException::withMessages([
                    "items.{$row['index']}.item_id" => ['The selected item is invalid or has been deleted.'],
                ]);
            }

            $itemCompanyId = $item->company_id !== null ? (int) $item->company_id : null;
            $itemVendorId = $item->packet_vendor_id !== null ? (int) $item->packet_vendor_id : null;

            if ($companyId !== null && ($itemCompanyId !== $companyId || $itemVendorId !== null)) {
                throw ValidationException::withMessages([
                    "items.{$row['index']}.item_id" => ['Item yang dipilih tidak dimiliki oleh perusahaan yang dipilih.'],
                ]);
            }

            if ($packetVendorId !== null && ($itemVendorId !== $packetVendorId || $itemCompanyId !== null)) {
                throw ValidationException::withMessages([
                    "items.{$row['index']}.item_id" => ['Item yang dipilih tidak dimiliki oleh vendor paket yang dipilih.'],
                ]);
            }

            $validated[] = [
                'item_id' => $row['item_id'],
                'quantity' => $row['quantity'],
                'price' => $row['price'],
            ];
        }

        return $validated;
    }

    /**
     * @template TModel of Model
     *
     * @param  class-string<TModel>  $modelClass
     * @return TModel
     */
    private function firstOrCreateActiveByName(string $modelClass, string $name, ?int $companyOwnerId = null): Model
    {
        /** @var Builder<TModel> $query */
        $query = $modelClass::query();
        $wrapped = $query->getGrammar()->wrap('name');

        /** @var TModel|null $existing */
        $existing = $query->whereNull('deleted_at')
            ->when($companyOwnerId !== null, fn ($q) => $q->where('company_owner_id', $companyOwnerId))
            ->whereRaw("LOWER({$wrapped}) = ?", [mb_strtolower($name, 'UTF-8')])
            ->sharedLock()
            ->first();

        if ($existing !== null) {
            return $existing;
        }

        return $modelClass::query()->create([
            'company_owner_id' => $companyOwnerId,
            'name' => $name,
        ]);
    }
}
