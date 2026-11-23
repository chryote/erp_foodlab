<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payroll_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained('companies')->restrictOnDelete();
            $table->foreignId('payroll_run_id')->constrained('payroll_runs')->restrictOnDelete();
            $table->foreignId('employee_id')->constrained('employees')->restrictOnDelete();
            $table->decimal('base_salary', 18, 2)->default(0.00);
            $table->decimal('bpjs_kesehatan', 18, 2)->default(0.00);
            $table->decimal('bpjs_ketenagakerjaan', 18, 2)->default(0.00);
            $table->decimal('bonus', 18, 2)->default(0.00);
            $table->decimal('overtime', 18, 2)->default(0.00);
            $table->decimal('deduction', 18, 2)->default(0.00);
            $table->decimal('thr', 18, 2)->default(0.00);
            $table->decimal('pph21', 18, 2)->default(0.00);
            $table->decimal('net_amount', 18, 2)->default(0.00);
            $table->string('notes', 500)->nullable();
            $table->timestamps();
            $table->softDeletes();
            $table->unsignedTinyInteger('active_flag')
                ->nullable()
                ->virtualAs('CASE WHEN deleted_at IS NULL THEN 1 ELSE NULL END');

            $table->unique(
                ['payroll_run_id', 'employee_id', 'active_flag'],
                'payroll_items_run_emp_active_unique'
            );

            $table->index(
                ['company_id', 'deleted_at', 'payroll_run_id', 'id'],
                'payroll_items_comp_del_run_id_idx'
            );
            $table->index(
                ['payroll_run_id', 'deleted_at', 'id'],
                'payroll_items_run_del_id_idx'
            );
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payroll_items');
    }
};
