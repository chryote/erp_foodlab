<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('companies') && ! Schema::hasColumn('companies', 'series')) {
            Schema::table('companies', function (Blueprint $table) {
                $table->unsignedInteger('series')->default(1)->after('name')->index();
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('companies') && Schema::hasColumn('companies', 'series')) {
            Schema::table('companies', function (Blueprint $table) {
                $table->dropIndex(['series']);
                $table->dropColumn('series');
            });
        }
    }
};
