<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('capital_companies') && ! Schema::hasColumn('capital_companies', 'stakeholder_name')) {
            Schema::table('capital_companies', function (Blueprint $table) {
                $table->string('stakeholder_name', 150)->default('')->after('company_id')->index();
            });
        }

        if (Schema::hasTable('companies') && Schema::hasColumn('companies', 'stakeholder_name')) {
            Schema::table('companies', function (Blueprint $table) {
                $table->dropIndex(['stakeholder_name']);
                $table->dropColumn('stakeholder_name');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('companies') && ! Schema::hasColumn('companies', 'stakeholder_name')) {
            Schema::table('companies', function (Blueprint $table) {
                $table->string('stakeholder_name', 150)->nullable()->default('')->after('name')->index();
            });
        }

        if (Schema::hasTable('capital_companies') && Schema::hasColumn('capital_companies', 'stakeholder_name')) {
            Schema::table('capital_companies', function (Blueprint $table) {
                $table->dropIndex(['stakeholder_name']);
                $table->dropColumn('stakeholder_name');
            });
        }
    }
};
