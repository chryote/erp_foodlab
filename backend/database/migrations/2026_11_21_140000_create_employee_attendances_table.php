<?php

use App\Enums\AttendanceStatusEnum;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('employee_attendances', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')
                ->constrained('companies')
                ->restrictOnDelete();
            $table->foreignId('employee_id')
                ->constrained('employees')
                ->restrictOnDelete();
            $table->foreignId('employee_shift_id')
                ->nullable()
                ->constrained('employee_shifts')
                ->restrictOnDelete();
            $table->date('attendance_date');
            $table->timestamp('clock_in_at')->nullable();
            $table->timestamp('clock_out_at')->nullable();
            $table->unsignedSmallInteger('late_minutes')->default(0);
            $table->unsignedSmallInteger('overtime_minutes')->default(0);
            $table->string('status', 30)->default(AttendanceStatusEnum::PRESENT->value);
            $table->string('notes', 500)->nullable();
            $table->timestamps();
            $table->softDeletes();
            // CASE WHEN works identically in both MySQL 8.0 and in-memory SQLite tests
            $table->unsignedTinyInteger('active_flag')
                ->nullable()
                ->storedAs('CASE WHEN deleted_at IS NULL THEN 1 ELSE NULL END');

            $table->unique(
                ['company_id', 'employee_id', 'attendance_date', 'active_flag'],
                'employee_attendances_company_emp_date_active_unique'
            );
            $table->index(['company_id', 'deleted_at'], 'employee_attendances_company_deleted_idx');
            $table->index(['company_id', 'attendance_date'], 'employee_attendances_company_date_idx');
            $table->index(['employee_id', 'attendance_date'], 'employee_attendances_emp_date_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('employee_attendances');
    }
};
