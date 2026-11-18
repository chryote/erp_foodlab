<?php

use App\Modules\CFO\Controllers\CfoController;
use Illuminate\Support\Facades\Route;

Route::prefix('cfo')->group(function () {
    Route::get('/', [CfoController::class, 'index'])->name('api.modules.cfo.index');
});
