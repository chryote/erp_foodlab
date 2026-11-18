<?php

use App\Modules\CHO\Controllers\ChoController;
use Illuminate\Support\Facades\Route;

Route::prefix('cho')->group(function () {
    Route::get('/', [ChoController::class, 'index'])->name('api.modules.cho.index');
});
