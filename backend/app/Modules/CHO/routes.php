<?php

use App\Modules\CHO\Controllers\ChoController;
use App\Modules\CHO\Controllers\EmployeePositionController;
use App\Modules\CHO\Controllers\EmploymentStatusController;
use App\Modules\CHO\Controllers\PayrollGradeController;
use Illuminate\Support\Facades\Route;

Route::prefix('cho')->group(function () {
    Route::get('/', [ChoController::class, 'index'])->name('api.modules.cho.index');

    Route::get('/employee-positions', [EmployeePositionController::class, 'index'])->name('api.modules.cho.employee-positions.index');
    Route::post('/employee-positions', [EmployeePositionController::class, 'store'])->name('api.modules.cho.employee-positions.store');
    Route::get('/employee-positions/{employeePosition}', [EmployeePositionController::class, 'show'])->name('api.modules.cho.employee-positions.show');
    Route::put('/employee-positions/{employeePosition}', [EmployeePositionController::class, 'update'])->name('api.modules.cho.employee-positions.update');
    Route::patch('/employee-positions/{employeePosition}', [EmployeePositionController::class, 'update'])->name('api.modules.cho.employee-positions.patch');
    Route::delete('/employee-positions/{employeePosition}', [EmployeePositionController::class, 'destroy'])->name('api.modules.cho.employee-positions.destroy');

    Route::get('/employment-statuses', [EmploymentStatusController::class, 'index'])->name('api.modules.cho.employment-statuses.index');
    Route::post('/employment-statuses', [EmploymentStatusController::class, 'store'])->name('api.modules.cho.employment-statuses.store');
    Route::get('/employment-statuses/{employmentStatus}', [EmploymentStatusController::class, 'show'])->name('api.modules.cho.employment-statuses.show');
    Route::put('/employment-statuses/{employmentStatus}', [EmploymentStatusController::class, 'update'])->name('api.modules.cho.employment-statuses.update');
    Route::patch('/employment-statuses/{employmentStatus}', [EmploymentStatusController::class, 'update'])->name('api.modules.cho.employment-statuses.patch');
    Route::delete('/employment-statuses/{employmentStatus}', [EmploymentStatusController::class, 'destroy'])->name('api.modules.cho.employment-statuses.destroy');

    Route::get('/payroll-grades', [PayrollGradeController::class, 'index'])->name('api.modules.cho.payroll-grades.index');
    Route::post('/payroll-grades', [PayrollGradeController::class, 'store'])->name('api.modules.cho.payroll-grades.store');
    Route::get('/payroll-grades/{payrollGrade}', [PayrollGradeController::class, 'show'])->name('api.modules.cho.payroll-grades.show');
    Route::put('/payroll-grades/{payrollGrade}', [PayrollGradeController::class, 'update'])->name('api.modules.cho.payroll-grades.update');
    Route::patch('/payroll-grades/{payrollGrade}', [PayrollGradeController::class, 'update'])->name('api.modules.cho.payroll-grades.patch');
    Route::delete('/payroll-grades/{payrollGrade}', [PayrollGradeController::class, 'destroy'])->name('api.modules.cho.payroll-grades.destroy');
});
