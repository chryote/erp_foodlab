<?php

use App\Modules\CPO\Controllers\CpoController;
use App\Modules\CPO\Controllers\DefaultPackageController;
use App\Modules\CPO\Controllers\IngredientController;
use App\Modules\CPO\Controllers\ItemController;
use App\Modules\CPO\Controllers\ItemPacketController;
use App\Modules\CPO\Controllers\PacketCategoryController;
use App\Modules\CPO\Controllers\PacketController;
use App\Modules\CPO\Controllers\PacketNameController;
use App\Modules\CPO\Controllers\PacketVendorController;
use Illuminate\Support\Facades\Route;

Route::prefix('cpo')->group(function () {
    Route::get('/', [CpoController::class, 'index'])->name('api.modules.cpo.index');

    Route::get('/items', [ItemController::class, 'index'])->name('api.modules.cpo.items.index');
    Route::post('/items', [ItemController::class, 'store'])->name('api.modules.cpo.items.store');
    Route::get('/items/{item}', [ItemController::class, 'show'])->name('api.modules.cpo.items.show');
    Route::put('/items/{item}', [ItemController::class, 'update'])->name('api.modules.cpo.items.update');
    Route::patch('/items/{item}', [ItemController::class, 'update'])->name('api.modules.cpo.items.patch');
    Route::delete('/items/{item}', [ItemController::class, 'destroy'])->name('api.modules.cpo.items.destroy');

    Route::get('/packets', [PacketController::class, 'index'])->name('api.modules.cpo.packets.index');
    Route::post('/packets', [PacketController::class, 'store'])->name('api.modules.cpo.packets.store');
    Route::get('/packets/{packet}', [PacketController::class, 'show'])->name('api.modules.cpo.packets.show');
    Route::put('/packets/{packet}', [PacketController::class, 'update'])->name('api.modules.cpo.packets.update');
    Route::patch('/packets/{packet}', [PacketController::class, 'update'])->name('api.modules.cpo.packets.patch');
    Route::delete('/packets/{packet}', [PacketController::class, 'destroy'])->name('api.modules.cpo.packets.destroy');

    Route::get('/packet-names', [PacketNameController::class, 'index'])->name('api.modules.cpo.packet-names.index');
    Route::post('/packet-names', [PacketNameController::class, 'store'])->name('api.modules.cpo.packet-names.store');
    Route::get('/packet-names/{packetName}', [PacketNameController::class, 'show'])->name('api.modules.cpo.packet-names.show');
    Route::put('/packet-names/{packetName}', [PacketNameController::class, 'update'])->name('api.modules.cpo.packet-names.update');
    Route::patch('/packet-names/{packetName}', [PacketNameController::class, 'update'])->name('api.modules.cpo.packet-names.patch');
    Route::delete('/packet-names/{packetName}', [PacketNameController::class, 'destroy'])->name('api.modules.cpo.packet-names.destroy');

    Route::get('/packet-vendors', [PacketVendorController::class, 'index'])->name('api.modules.cpo.packet-vendors.index');
    Route::post('/packet-vendors', [PacketVendorController::class, 'store'])->name('api.modules.cpo.packet-vendors.store');
    Route::get('/packet-vendors/{packetVendor}', [PacketVendorController::class, 'show'])->name('api.modules.cpo.packet-vendors.show');
    Route::put('/packet-vendors/{packetVendor}', [PacketVendorController::class, 'update'])->name('api.modules.cpo.packet-vendors.update');
    Route::patch('/packet-vendors/{packetVendor}', [PacketVendorController::class, 'update'])->name('api.modules.cpo.packet-vendors.patch');
    Route::delete('/packet-vendors/{packetVendor}', [PacketVendorController::class, 'destroy'])->name('api.modules.cpo.packet-vendors.destroy');

    Route::get('/packet-categories', [PacketCategoryController::class, 'index'])->name('api.modules.cpo.packet-categories.index');
    Route::post('/packet-categories', [PacketCategoryController::class, 'store'])->name('api.modules.cpo.packet-categories.store');
    Route::get('/packet-categories/{packetCategory}', [PacketCategoryController::class, 'show'])->name('api.modules.cpo.packet-categories.show');
    Route::put('/packet-categories/{packetCategory}', [PacketCategoryController::class, 'update'])->name('api.modules.cpo.packet-categories.update');
    Route::patch('/packet-categories/{packetCategory}', [PacketCategoryController::class, 'update'])->name('api.modules.cpo.packet-categories.patch');
    Route::delete('/packet-categories/{packetCategory}', [PacketCategoryController::class, 'destroy'])->name('api.modules.cpo.packet-categories.destroy');

    Route::get('/item-packets', [ItemPacketController::class, 'index'])->name('api.modules.cpo.item-packets.index');
    Route::post('/item-packets', [ItemPacketController::class, 'store'])->name('api.modules.cpo.item-packets.store');
    Route::get('/item-packets/{itemPacket}', [ItemPacketController::class, 'show'])->name('api.modules.cpo.item-packets.show');
    Route::put('/item-packets/{itemPacket}', [ItemPacketController::class, 'update'])->name('api.modules.cpo.item-packets.update');
    Route::patch('/item-packets/{itemPacket}', [ItemPacketController::class, 'update'])->name('api.modules.cpo.item-packets.patch');
    Route::delete('/item-packets/{itemPacket}', [ItemPacketController::class, 'destroy'])->name('api.modules.cpo.item-packets.destroy');

    Route::get('/default-packages', [DefaultPackageController::class, 'index'])->name('api.modules.cpo.default-packages.index');
    Route::post('/default-packages', [DefaultPackageController::class, 'store'])->name('api.modules.cpo.default-packages.store');
    Route::get('/default-packages/{defaultPackage}', [DefaultPackageController::class, 'show'])->name('api.modules.cpo.default-packages.show');
    Route::put('/default-packages/{defaultPackage}', [DefaultPackageController::class, 'update'])->name('api.modules.cpo.default-packages.update');
    Route::patch('/default-packages/{defaultPackage}', [DefaultPackageController::class, 'update'])->name('api.modules.cpo.default-packages.patch');
    Route::delete('/default-packages/{defaultPackage}', [DefaultPackageController::class, 'destroy'])->name('api.modules.cpo.default-packages.destroy');

    Route::get('/ingredients', [IngredientController::class, 'index'])->name('api.modules.cpo.ingredients.index');
    Route::post('/ingredients', [IngredientController::class, 'store'])->name('api.modules.cpo.ingredients.store');
    Route::get('/ingredients/{ingredient}', [IngredientController::class, 'show'])->name('api.modules.cpo.ingredients.show');
    Route::put('/ingredients/{ingredient}', [IngredientController::class, 'update'])->name('api.modules.cpo.ingredients.update');
    Route::patch('/ingredients/{ingredient}', [IngredientController::class, 'update'])->name('api.modules.cpo.ingredients.patch');
    Route::delete('/ingredients/{ingredient}', [IngredientController::class, 'destroy'])->name('api.modules.cpo.ingredients.destroy');
});
