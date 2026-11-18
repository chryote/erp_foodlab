<?php

use App\Modules\CFO\Controllers\CapitalCompanyController;
use App\Modules\CFO\Controllers\CfoController;
use App\Modules\CFO\Controllers\CompanyController;
use Illuminate\Support\Facades\Route;

Route::prefix('cfo')->group(function () {
    Route::get('/', [CfoController::class, 'index'])->name('api.modules.cfo.index');

    Route::get('/companies', [CompanyController::class, 'index'])->name('api.modules.cfo.companies.index');
    Route::post('/companies', [CompanyController::class, 'store'])->name('api.modules.cfo.companies.store');
    Route::get('/companies/{company}', [CompanyController::class, 'show'])->name('api.modules.cfo.companies.show');
    Route::put('/companies/{company}', [CompanyController::class, 'update'])->name('api.modules.cfo.companies.update');
    Route::patch('/companies/{company}', [CompanyController::class, 'update'])->name('api.modules.cfo.companies.patch');
    Route::delete('/companies/{company}', [CompanyController::class, 'destroy'])->name('api.modules.cfo.companies.destroy');

    Route::get('/capital-companies', [CapitalCompanyController::class, 'index'])->name('api.modules.cfo.capital-companies.index');
    Route::post('/capital-companies', [CapitalCompanyController::class, 'store'])->name('api.modules.cfo.capital-companies.store');
    Route::get('/capital-companies/{capitalCompany}', [CapitalCompanyController::class, 'show'])->name('api.modules.cfo.capital-companies.show');
    Route::put('/capital-companies/{capitalCompany}', [CapitalCompanyController::class, 'update'])->name('api.modules.cfo.capital-companies.update');
    Route::patch('/capital-companies/{capitalCompany}', [CapitalCompanyController::class, 'update'])->name('api.modules.cfo.capital-companies.patch');
    Route::delete('/capital-companies/{capitalCompany}', [CapitalCompanyController::class, 'destroy'])->name('api.modules.cfo.capital-companies.destroy');
});

