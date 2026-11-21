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
        if (! Schema::hasTable('employee_positions') || ! Schema::hasColumn('employee_positions', 'code')) {
            return;
        }

        Schema::table('employee_positions', function (Blueprint $table) {
            $table->string('code', 50)->nullable()->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (! Schema::hasTable('employee_positions') || ! Schema::hasColumn('employee_positions', 'code')) {
            return;
        }

        Schema::table('employee_positions', function (Blueprint $table) {
            $table->string('code', 50)->nullable(false)->change();
        });
    }
};
