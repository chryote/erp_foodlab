<?php

use App\Modules\HR\Controllers\EmployeeAttendanceController;
use App\Modules\HR\Controllers\EmployeeShiftAssignmentController;
use App\Modules\HR\Controllers\EmployeeShiftController;
use Illuminate\Support\Facades\Route;

Route::prefix('hr')->group(function () {
    Route::get('/employee-shifts', [EmployeeShiftController::class, 'index'])->name('api.modules.hr.employee-shifts.index');
    Route::post('/employee-shifts', [EmployeeShiftController::class, 'store'])->name('api.modules.hr.employee-shifts.store');
    Route::get('/employee-shifts/{employeeShift}', [EmployeeShiftController::class, 'show'])->name('api.modules.hr.employee-shifts.show');
    Route::put('/employee-shifts/{employeeShift}', [EmployeeShiftController::class, 'update'])->name('api.modules.hr.employee-shifts.update');
    Route::patch('/employee-shifts/{employeeShift}', [EmployeeShiftController::class, 'update'])->name('api.modules.hr.employee-shifts.patch');
    Route::delete('/employee-shifts/{employeeShift}', [EmployeeShiftController::class, 'destroy'])->name('api.modules.hr.employee-shifts.destroy');

    Route::get('/employee-shift-assignments', [EmployeeShiftAssignmentController::class, 'index'])->name('api.modules.hr.employee-shift-assignments.index');
    Route::post('/employee-shift-assignments', [EmployeeShiftAssignmentController::class, 'store'])->name('api.modules.hr.employee-shift-assignments.store');
    Route::get('/employee-shift-assignments/{employeeShiftAssignment}', [EmployeeShiftAssignmentController::class, 'show'])->name('api.modules.hr.employee-shift-assignments.show');
    Route::put('/employee-shift-assignments/{employeeShiftAssignment}', [EmployeeShiftAssignmentController::class, 'update'])->name('api.modules.hr.employee-shift-assignments.update');
    Route::patch('/employee-shift-assignments/{employeeShiftAssignment}', [EmployeeShiftAssignmentController::class, 'update'])->name('api.modules.hr.employee-shift-assignments.patch');
    Route::delete('/employee-shift-assignments/{employeeShiftAssignment}', [EmployeeShiftAssignmentController::class, 'destroy'])->name('api.modules.hr.employee-shift-assignments.destroy');

    Route::get('/employee-attendances', [EmployeeAttendanceController::class, 'index'])->name('api.modules.hr.employee-attendances.index');
    Route::post('/employee-attendances', [EmployeeAttendanceController::class, 'store'])->name('api.modules.hr.employee-attendances.store');
    Route::post('/employee-attendances/scan', [EmployeeAttendanceController::class, 'scan'])->name('api.modules.hr.employee-attendances.scan');
    Route::get('/employee-attendances/{employeeAttendance}', [EmployeeAttendanceController::class, 'show'])->name('api.modules.hr.employee-attendances.show');
    Route::put('/employee-attendances/{employeeAttendance}', [EmployeeAttendanceController::class, 'update'])->name('api.modules.hr.employee-attendances.update');
    Route::patch('/employee-attendances/{employeeAttendance}', [EmployeeAttendanceController::class, 'update'])->name('api.modules.hr.employee-attendances.patch');
    Route::delete('/employee-attendances/{employeeAttendance}', [EmployeeAttendanceController::class, 'destroy'])->name('api.modules.hr.employee-attendances.destroy');
});
