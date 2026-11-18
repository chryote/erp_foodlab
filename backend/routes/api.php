<?php

use App\Http\Controllers\ErpMenuController;
use App\Http\Controllers\HealthController;
use App\Http\Controllers\LabSampleController;
use App\Http\Controllers\MetricsController;
use Illuminate\Support\Facades\Route;

Route::get('/health', HealthController::class)->name('api.health');
Route::get('/metrics', MetricsController::class)->name('api.metrics');

Route::prefix('v1')->group(function () {
    // ERP Main Menu Modules Summary + Dedicated Module Routes
    Route::get('/modules', ErpMenuController::class)->name('api.modules.index');

    Route::prefix('modules')->group(function () {
        require base_path('app/Modules/CFO/routes.php');
        require base_path('app/Modules/CHO/routes.php');
        require base_path('app/Modules/CPO/routes.php');
        require base_path('app/Modules/CDO/routes.php');
        require base_path('app/Modules/CMO/routes.php');
    });

    // FoodLab Quality Control Samples
    Route::get('/samples', [LabSampleController::class, 'index'])->name('api.samples.index');
    Route::post('/samples', [LabSampleController::class, 'store'])->name('api.samples.store');
    Route::get('/samples/{labSample}', [LabSampleController::class, 'show'])->name('api.samples.show');
});
