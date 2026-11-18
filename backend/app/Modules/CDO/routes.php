<?php

use App\Modules\CDO\Controllers\CdoController;
use Illuminate\Support\Facades\Route;

Route::prefix('cdo')->group(function () {
    Route::get('/', [CdoController::class, 'index'])->name('api.modules.cdo.index');
});
