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

    Route::post('/expense-categories', [ErpInertiaController::class, 'storeExpenseCategory'])
        ->name('expense-categories.store');
    Route::put('/expense-categories/{expenseCategory}', [ErpInertiaController::class, 'updateExpenseCategory'])
        ->name('expense-categories.update');
    Route::delete('/expense-categories/{expenseCategory}', [ErpInertiaController::class, 'destroyExpenseCategory'])
        ->name('expense-categories.destroy');

    Route::post('/expense-types', [ErpInertiaController::class, 'storeExpenseType'])
        ->name('expense-types.store');
    Route::put('/expense-types/{expenseType}', [ErpInertiaController::class, 'updateExpenseType'])
        ->name('expense-types.update');
    Route::delete('/expense-types/{expenseType}', [ErpInertiaController::class, 'destroyExpenseType'])
        ->name('expense-types.destroy');

    Route::post('/expense-items', [ErpInertiaController::class, 'storeExpenseItem'])
        ->name('expense-items.store');
    Route::put('/expense-items/{expenseItem}', [ErpInertiaController::class, 'updateExpenseItem'])
        ->name('expense-items.update');
    Route::delete('/expense-items/{expenseItem}', [ErpInertiaController::class, 'destroyExpenseItem'])
        ->name('expense-items.destroy');
});
