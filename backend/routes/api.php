<?php

use App\Http\Controllers\HealthController;
use App\Http\Controllers\LabSampleController;
use App\Http\Controllers\MetricsController;
use Illuminate\Support\Facades\Route;

Route::get('/health', HealthController::class)->name('api.health');
Route::get('/metrics', MetricsController::class)->name('api.metrics');

Route::prefix('v1')->group(function () {
    Route::get('/samples', [LabSampleController::class, 'index'])->name('api.samples.index');
    Route::post('/samples', [LabSampleController::class, 'store'])->name('api.samples.store');
    Route::get('/samples/{labSample}', [LabSampleController::class, 'show'])->name('api.samples.show');
});
