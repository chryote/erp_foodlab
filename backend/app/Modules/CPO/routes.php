<?php

use App\Modules\CPO\Controllers\CpoController;
use App\Modules\CPO\Controllers\ItemController;
use Illuminate\Support\Facades\Route;

Route::prefix('cpo')->group(function () {
    Route::get('/', [CpoController::class, 'index'])->name('api.modules.cpo.index');

    Route::get('/items', [ItemController::class, 'index'])->name('api.modules.cpo.items.index');
    Route::post('/items', [ItemController::class, 'store'])->name('api.modules.cpo.items.store');
    Route::get('/items/{item}', [ItemController::class, 'show'])->name('api.modules.cpo.items.show');
    Route::put('/items/{item}', [ItemController::class, 'update'])->name('api.modules.cpo.items.update');
    Route::patch('/items/{item}', [ItemController::class, 'update'])->name('api.modules.cpo.items.patch');
    Route::delete('/items/{item}', [ItemController::class, 'destroy'])->name('api.modules.cpo.items.destroy');
});
