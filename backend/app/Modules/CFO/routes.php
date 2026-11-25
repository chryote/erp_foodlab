<?php

use App\Modules\CFO\Controllers\CapitalCompanyController;
use App\Modules\CFO\Controllers\CfoController;
use App\Modules\CFO\Controllers\CompanyAssetController;
use App\Modules\CFO\Controllers\CompanyController;
use App\Modules\CFO\Controllers\ExpenseCategoryController;
use App\Modules\CFO\Controllers\ExpenseItemController;
use App\Modules\CFO\Controllers\ExpenseTypeController;
use Illuminate\Support\Facades\Route;

Route::prefix('cfo')->group(function () {
    Route::get('/', [CfoController::class, 'index'])->name('api.modules.cfo.index');
    Route::get('/enums', [CfoController::class, 'enums'])->name('api.modules.cfo.enums');

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

    Route::get('/company-assets', [CompanyAssetController::class, 'index'])->name('api.modules.cfo.company-assets.index');
    Route::post('/company-assets', [CompanyAssetController::class, 'store'])->name('api.modules.cfo.company-assets.store');
    Route::get('/company-assets/{companyAsset}', [CompanyAssetController::class, 'show'])->name('api.modules.cfo.company-assets.show');
    Route::put('/company-assets/{companyAsset}', [CompanyAssetController::class, 'update'])->name('api.modules.cfo.company-assets.update');
    Route::patch('/company-assets/{companyAsset}', [CompanyAssetController::class, 'update'])->name('api.modules.cfo.company-assets.patch');
    Route::delete('/company-assets/{companyAsset}', [CompanyAssetController::class, 'destroy'])->name('api.modules.cfo.company-assets.destroy');

    Route::get('/expense-categories', [ExpenseCategoryController::class, 'index'])->name('api.modules.cfo.expense-categories.index');
    Route::post('/expense-categories', [ExpenseCategoryController::class, 'store'])->name('api.modules.cfo.expense-categories.store');
    Route::get('/expense-categories/{expenseCategory}', [ExpenseCategoryController::class, 'show'])->name('api.modules.cfo.expense-categories.show');
    Route::put('/expense-categories/{expenseCategory}', [ExpenseCategoryController::class, 'update'])->name('api.modules.cfo.expense-categories.update');
    Route::patch('/expense-categories/{expenseCategory}', [ExpenseCategoryController::class, 'update'])->name('api.modules.cfo.expense-categories.patch');
    Route::delete('/expense-categories/{expenseCategory}', [ExpenseCategoryController::class, 'destroy'])->name('api.modules.cfo.expense-categories.destroy');

    Route::get('/expense-types', [ExpenseTypeController::class, 'index'])->name('api.modules.cfo.expense-types.index');
    Route::post('/expense-types', [ExpenseTypeController::class, 'store'])->name('api.modules.cfo.expense-types.store');
    Route::get('/expense-types/{expenseType}', [ExpenseTypeController::class, 'show'])->name('api.modules.cfo.expense-types.show');
    Route::put('/expense-types/{expenseType}', [ExpenseTypeController::class, 'update'])->name('api.modules.cfo.expense-types.update');
    Route::patch('/expense-types/{expenseType}', [ExpenseTypeController::class, 'update'])->name('api.modules.cfo.expense-types.patch');
    Route::delete('/expense-types/{expenseType}', [ExpenseTypeController::class, 'destroy'])->name('api.modules.cfo.expense-types.destroy');

    Route::get('/expense-items', [ExpenseItemController::class, 'index'])->name('api.modules.cfo.expense-items.index');
    Route::post('/expense-items', [ExpenseItemController::class, 'store'])->name('api.modules.cfo.expense-items.store');
    Route::get('/expense-items/{expenseItem}', [ExpenseItemController::class, 'show'])->name('api.modules.cfo.expense-items.show');
    Route::put('/expense-items/{expenseItem}', [ExpenseItemController::class, 'update'])->name('api.modules.cfo.expense-items.update');
    Route::patch('/expense-items/{expenseItem}', [ExpenseItemController::class, 'update'])->name('api.modules.cfo.expense-items.patch');
    Route::delete('/expense-items/{expenseItem}', [ExpenseItemController::class, 'destroy'])->name('api.modules.cfo.expense-items.destroy');
});
