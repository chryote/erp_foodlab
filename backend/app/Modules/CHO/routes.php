<?php

use App\Modules\CHO\Controllers\ChoController;
use App\Modules\CHO\Controllers\EmployeeController;
use App\Modules\CHO\Controllers\EmployeePositionController;
use App\Modules\CHO\Controllers\EmploymentStatusController;
use App\Modules\CHO\Controllers\PayrollGradeController;
use App\Modules\CHO\Controllers\PayrollController;
use App\Modules\CHO\Controllers\PayrollItemController;
use App\Modules\CHO\Controllers\PayrollRunController;
use App\Modules\CHO\Controllers\TaxStatusController;
use Illuminate\Support\Facades\Route;

Route::prefix('cho')->group(function () {
    Route::get('/', [ChoController::class, 'index'])->name('api.modules.cho.index');
    Route::get('/enums', [ChoController::class, 'enums'])->name('api.modules.cho.enums');

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

    Route::get('/tax-statuses', [TaxStatusController::class, 'index'])->name('api.modules.cho.tax-statuses.index');
    Route::post('/tax-statuses', [TaxStatusController::class, 'store'])->name('api.modules.cho.tax-statuses.store');
    Route::get('/tax-statuses/{taxStatus}', [TaxStatusController::class, 'show'])->name('api.modules.cho.tax-statuses.show');
    Route::put('/tax-statuses/{taxStatus}', [TaxStatusController::class, 'update'])->name('api.modules.cho.tax-statuses.update');
    Route::patch('/tax-statuses/{taxStatus}', [TaxStatusController::class, 'update'])->name('api.modules.cho.tax-statuses.patch');
    Route::delete('/tax-statuses/{taxStatus}', [TaxStatusController::class, 'destroy'])->name('api.modules.cho.tax-statuses.destroy');

    Route::get('/employees', [EmployeeController::class, 'index'])->name('api.modules.cho.employees.index');
    Route::post('/employees', [EmployeeController::class, 'store'])->name('api.modules.cho.employees.store');
    Route::post('/employees/upload-document', [EmployeeController::class, 'uploadDocument'])->name('api.modules.cho.employees.upload-document');
    Route::get('/employees/{employee}', [EmployeeController::class, 'show'])->name('api.modules.cho.employees.show');
    Route::put('/employees/{employee}', [EmployeeController::class, 'update'])->name('api.modules.cho.employees.update');
    Route::patch('/employees/{employee}', [EmployeeController::class, 'update'])->name('api.modules.cho.employees.patch');
    Route::delete('/employees/{employee}', [EmployeeController::class, 'destroy'])->name('api.modules.cho.employees.destroy');

    Route::get('/payroll-runs', [PayrollRunController::class, 'index'])->name('api.modules.cho.payroll-runs.index');
    Route::post('/payroll-runs', [PayrollRunController::class, 'store'])->name('api.modules.cho.payroll-runs.store');
    Route::get('/payroll-runs/{payrollRun}', [PayrollRunController::class, 'show'])->name('api.modules.cho.payroll-runs.show');
    Route::put('/payroll-runs/{payrollRun}', [PayrollRunController::class, 'update'])->name('api.modules.cho.payroll-runs.update');
    Route::patch('/payroll-runs/{payrollRun}', [PayrollRunController::class, 'update'])->name('api.modules.cho.payroll-runs.patch');
    Route::delete('/payroll-runs/{payrollRun}', [PayrollRunController::class, 'destroy'])->name('api.modules.cho.payroll-runs.destroy');

    Route::get('/payroll-items', [PayrollItemController::class, 'index'])->name('api.modules.cho.payroll-items.index');
    Route::post('/payroll-items', [PayrollItemController::class, 'store'])->name('api.modules.cho.payroll-items.store');
    Route::get('/payroll-items/{payrollItem}', [PayrollItemController::class, 'show'])->name('api.modules.cho.payroll-items.show');
    Route::put('/payroll-items/{payrollItem}', [PayrollItemController::class, 'update'])->name('api.modules.cho.payroll-items.update');
    Route::patch('/payroll-items/{payrollItem}', [PayrollItemController::class, 'update'])->name('api.modules.cho.payroll-items.patch');
    Route::delete('/payroll-items/{payrollItem}', [PayrollItemController::class, 'destroy'])->name('api.modules.cho.payroll-items.destroy');

    Route::get('/payroll/workspace', [PayrollController::class, 'workspace'])->name('api.modules.cho.payroll.workspace');
    Route::post('/payroll/save-row', [PayrollController::class, 'saveRow'])->name('api.modules.cho.payroll.save-row');
    Route::post('/payroll/finalize-row', [PayrollController::class, 'finalizeRow'])->name('api.modules.cho.payroll.finalize-row');
});
