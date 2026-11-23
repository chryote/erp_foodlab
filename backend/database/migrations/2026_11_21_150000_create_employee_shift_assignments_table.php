<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('employee_shift_assignments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')
                ->constrained('companies')
                ->restrictOnDelete();
            $table->foreignId('employee_id')
                ->constrained('employees')
                ->restrictOnDelete();
            $table->foreignId('employee_shift_id')
                ->constrained('employee_shifts')
                ->restrictOnDelete();
            $table->date('effective_date');
            $table->date('end_date')->nullable();
            $table->string('notes', 255)->nullable();
            $table->timestamps();
            $table->softDeletes();
            // CASE WHEN works identically in both MySQL 8.0 and in-memory SQLite tests
            $table->unsignedTinyInteger('active_flag')
                ->nullable()
                ->storedAs('CASE WHEN deleted_at IS NULL THEN 1 ELSE NULL END');

            $table->unique(
                ['company_id', 'employee_id', 'effective_date', 'active_flag'],
                'employee_shift_assignments_company_emp_eff_active_unique'
            );
            $table->index(['company_id', 'deleted_at'], 'employee_shift_assignments_company_deleted_idx');
            $table->index(['employee_id', 'effective_date', 'end_date'], 'employee_shift_assignments_emp_date_range_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('employee_shift_assignments');
    }
};
