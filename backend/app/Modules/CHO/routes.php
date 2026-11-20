<?php

use App\Modules\CHO\Controllers\ChoController;
use App\Modules\CHO\Controllers\EmployeePositionController;
use Illuminate\Support\Facades\Route;

Route::prefix('cho')->group(function () {
    Route::get('/', [ChoController::class, 'index'])->name('api.modules.cho.index');

    Route::get('/employee-positions', [EmployeePositionController::class, 'index'])->name('api.modules.cho.employee-positions.index');
    Route::post('/employee-positions', [EmployeePositionController::class, 'store'])->name('api.modules.cho.employee-positions.store');
    Route::get('/employee-positions/{employeePosition}', [EmployeePositionController::class, 'show'])->name('api.modules.cho.employee-positions.show');
    Route::put('/employee-positions/{employeePosition}', [EmployeePositionController::class, 'update'])->name('api.modules.cho.employee-positions.update');
    Route::patch('/employee-positions/{employeePosition}', [EmployeePositionController::class, 'update'])->name('api.modules.cho.employee-positions.patch');
    Route::delete('/employee-positions/{employeePosition}', [EmployeePositionController::class, 'destroy'])->name('api.modules.cho.employee-positions.destroy');
});
