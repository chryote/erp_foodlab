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
        if (Schema::hasTable('employees') && ! Schema::hasColumn('employees', 'payroll_grade_id')) {
            Schema::table('employees', function (Blueprint $table) {
                $table->foreignId('payroll_grade_id')
                    ->nullable()
                    ->after('employment_status_id')
                    ->constrained('payroll_grades')
                    ->restrictOnDelete();
                $table->index('payroll_grade_id');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('employees') && Schema::hasColumn('employees', 'payroll_grade_id')) {
            Schema::table('employees', function (Blueprint $table) {
                $table->dropConstrainedForeignId('payroll_grade_id');
            });
        }
    }
};
