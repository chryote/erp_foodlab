<?php

use App\Modules\CMO\Controllers\CmoController;
use Illuminate\Support\Facades\Route;

Route::prefix('cmo')->group(function () {
    Route::get('/', [CmoController::class, 'index'])->name('api.modules.cmo.index');
});
