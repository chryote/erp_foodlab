<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('payroll_grades', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained('companies')->restrictOnDelete();
            $table->unsignedTinyInteger('grade')->index();
            $table->string('sub_grade', 10);
            $table->string('level_label', 150)->nullable();
            $table->double('base_salary');
            $table->double('position_allowance')->default(0);
            $table->double('total_gross');
            $table->double('bpjs_kesehatan_company');
            $table->double('bpjs_kesehatan_employee');
            $table->double('bpjs_ketenagakerjaan_company');
            $table->double('bpjs_ketenagakerjaan_employee');
            $table->double('net_employee_received');
            $table->double('total_company_cost');
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['grade', 'sub_grade', 'deleted_at']);
            $table->index('company_id');
            $table->index('created_at');
            $table->index('updated_at');
            $table->index('deleted_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('payroll_grades');
    }
};
