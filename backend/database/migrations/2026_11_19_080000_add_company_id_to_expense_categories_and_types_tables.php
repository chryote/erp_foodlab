<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('expense_categories') && ! Schema::hasColumn('expense_categories', 'company_id')) {
            Schema::table('expense_categories', function (Blueprint $table) {
                $table->foreignId('company_id')
                    ->nullable()
                    ->after('id')
                    ->constrained('companies')
                    ->cascadeOnDelete();
                $table->index('company_id');
            });
        }

        if (Schema::hasTable('expense_types') && ! Schema::hasColumn('expense_types', 'company_id')) {
            Schema::table('expense_types', function (Blueprint $table) {
                $table->foreignId('company_id')
                    ->nullable()
                    ->after('expense_category_id')
                    ->constrained('companies')
                    ->cascadeOnDelete();
                $table->index('company_id');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('expense_types') && Schema::hasColumn('expense_types', 'company_id')) {
            Schema::table('expense_types', function (Blueprint $table) {
                $table->dropConstrainedForeignId('company_id');
            });
        }

        if (Schema::hasTable('expense_categories') && Schema::hasColumn('expense_categories', 'company_id')) {
            Schema::table('expense_categories', function (Blueprint $table) {
                $table->dropConstrainedForeignId('company_id');
            });
        }
    }
};
