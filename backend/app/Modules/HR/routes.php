<?php

use App\Modules\HR\Controllers\EmployeeShiftController;
use Illuminate\Support\Facades\Route;

Route::prefix('hr')->group(function () {
    Route::get('/employee-shifts', [EmployeeShiftController::class, 'index'])->name('api.modules.hr.employee-shifts.index');
    Route::post('/employee-shifts', [EmployeeShiftController::class, 'store'])->name('api.modules.hr.employee-shifts.store');
    Route::get('/employee-shifts/{employeeShift}', [EmployeeShiftController::class, 'show'])->name('api.modules.hr.employee-shifts.show');
    Route::put('/employee-shifts/{employeeShift}', [EmployeeShiftController::class, 'update'])->name('api.modules.hr.employee-shifts.update');
    Route::patch('/employee-shifts/{employeeShift}', [EmployeeShiftController::class, 'update'])->name('api.modules.hr.employee-shifts.patch');
    Route::delete('/employee-shifts/{employeeShift}', [EmployeeShiftController::class, 'destroy'])->name('api.modules.hr.employee-shifts.destroy');
});
