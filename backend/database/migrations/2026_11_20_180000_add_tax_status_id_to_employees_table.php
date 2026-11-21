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
        if (Schema::hasTable('employees') && ! Schema::hasColumn('employees', 'tax_status_id')) {
            Schema::table('employees', function (Blueprint $table) {
                $table->foreignId('tax_status_id')
                    ->nullable()
                    ->after('payroll_grade_id')
                    ->constrained('tax_statuses')
                    ->restrictOnDelete();
                $table->index('tax_status_id');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('employees') && Schema::hasColumn('employees', 'tax_status_id')) {
            Schema::table('employees', function (Blueprint $table) {
                $table->dropConstrainedForeignId('tax_status_id');
            });
        }
    }
};
