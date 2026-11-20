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
        if (Schema::hasTable('employees') && ! Schema::hasColumn('employees', 'employment_status_id')) {
            Schema::table('employees', function (Blueprint $table) {
                $table->foreignId('employment_status_id')
                    ->nullable()
                    ->after('employee_position_id')
                    ->constrained('employment_statuses')
                    ->restrictOnDelete();
                $table->index('employment_status_id');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('employees') && Schema::hasColumn('employees', 'employment_status_id')) {
            Schema::table('employees', function (Blueprint $table) {
                $table->dropConstrainedForeignId('employment_status_id');
            });
        }
    }
};
