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
        if (! Schema::hasTable('tax_statuses') || ! Schema::hasColumn('tax_statuses', 'code')) {
            return;
        }

        Schema::table('tax_statuses', function (Blueprint $table) {
            $table->string('code', 20)->nullable()->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (! Schema::hasTable('tax_statuses') || ! Schema::hasColumn('tax_statuses', 'code')) {
            return;
        }

        Schema::table('tax_statuses', function (Blueprint $table) {
            $table->string('code', 20)->nullable(false)->change();
        });
    }
};
