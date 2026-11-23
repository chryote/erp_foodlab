<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payroll_runs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained('companies')->restrictOnDelete();
            $table->string('code', 50)->nullable();
            $table->string('name', 150);
            $table->date('period_date');
            $table->string('status', 30)->default('draft');
            $table->decimal('total_base_salary', 18, 2)->default(0.00);
            $table->decimal('total_bpjs_kesehatan', 18, 2)->default(0.00);
            $table->decimal('total_bpjs_ketenagakerjaan', 18, 2)->default(0.00);
            $table->decimal('total_bonus', 18, 2)->default(0.00);
            $table->decimal('total_overtime', 18, 2)->default(0.00);
            $table->decimal('total_deduction', 18, 2)->default(0.00);
            $table->decimal('total_thr', 18, 2)->default(0.00);
            $table->decimal('total_pph21', 18, 2)->default(0.00);
            $table->decimal('total_net', 18, 2)->default(0.00);
            $table->string('notes', 500)->nullable();
            $table->foreignId('approved_by')->nullable()->constrained('users')->restrictOnDelete();
            $table->timestamp('approved_at')->nullable();
            $table->timestamps();
            $table->softDeletes();
            $table->unsignedTinyInteger('active_flag')
                ->nullable()
                ->virtualAs('CASE WHEN deleted_at IS NULL THEN 1 ELSE NULL END');

            $table->unique(
                ['company_id', 'period_date', 'active_flag'],
                'payroll_runs_company_period_active_unique'
            );
            $table->unique(
                ['company_id', 'code', 'active_flag'],
                'payroll_runs_company_code_active_unique'
            );
            $table->unique(
                ['company_id', 'name', 'active_flag'],
                'payroll_runs_company_name_active_unique'
            );

            $table->index(
                ['company_id', 'deleted_at', 'period_date', 'id'],
                'payroll_runs_comp_del_period_id_idx'
            );
            $table->index(
                ['deleted_at', 'period_date', 'id'],
                'payroll_runs_del_period_id_idx'
            );
            $table->index(
                ['company_id', 'deleted_at', 'status'],
                'payroll_runs_comp_del_status_idx'
            );
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payroll_runs');
    }
};
