<?php

use App\Http\Controllers\ErpInertiaController;
use Illuminate\Support\Facades\Route;

Route::get('/', [ErpInertiaController::class, 'index'])->name('erp.dashboard');

Route::prefix('cfo')->name('cfo.')->group(function () {
    Route::post('/companies', [ErpInertiaController::class, 'storeCompany'])
        ->name('companies.store');
    Route::put('/companies/{company}', [ErpInertiaController::class, 'updateCompany'])
        ->name('companies.update');
    Route::delete('/companies/{company}', [ErpInertiaController::class, 'destroyCompany'])
        ->name('companies.destroy');

    Route::post('/capital-companies', [ErpInertiaController::class, 'storeCapitalCompany'])
        ->name('capital-companies.store');
    Route::put('/capital-companies/{capitalCompany}', [ErpInertiaController::class, 'updateCapitalCompany'])
        ->name('capital-companies.update');
    Route::delete('/capital-companies/{capitalCompany}', [ErpInertiaController::class, 'destroyCapitalCompany'])
        ->name('capital-companies.destroy');
});
