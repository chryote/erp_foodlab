<?php

use App\Modules\CPO\Controllers\CpoController;
use Illuminate\Support\Facades\Route;

Route::prefix('cpo')->group(function () {
    Route::get('/', [CpoController::class, 'index'])->name('api.modules.cpo.index');
});
