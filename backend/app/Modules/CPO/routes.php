<?php

use App\Modules\CPO\Controllers\CpoController;
use App\Modules\CPO\Controllers\ItemController;
use App\Modules\CPO\Controllers\ItemPacketController;
use App\Modules\CPO\Controllers\PacketController;
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

    Route::get('/item-packets', [ItemPacketController::class, 'index'])->name('api.modules.cpo.item-packets.index');
    Route::post('/item-packets', [ItemPacketController::class, 'store'])->name('api.modules.cpo.item-packets.store');
    Route::get('/item-packets/{itemPacket}', [ItemPacketController::class, 'show'])->name('api.modules.cpo.item-packets.show');
    Route::put('/item-packets/{itemPacket}', [ItemPacketController::class, 'update'])->name('api.modules.cpo.item-packets.update');
    Route::patch('/item-packets/{itemPacket}', [ItemPacketController::class, 'update'])->name('api.modules.cpo.item-packets.patch');
    Route::delete('/item-packets/{itemPacket}', [ItemPacketController::class, 'destroy'])->name('api.modules.cpo.item-packets.destroy');
});
