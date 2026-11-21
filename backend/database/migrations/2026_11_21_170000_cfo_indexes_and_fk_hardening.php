<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('capital_companies', function (Blueprint $table) {
            $table->index(['deleted_at', 'id'], 'capital_companies_deleted_id_idx');

            $table->dropForeign(['company_id']);
            $table->foreign('company_id', 'capital_companies_company_id_foreign')
                ->references('id')
                ->on('companies')
                ->restrictOnDelete();
        });

        Schema::table('company_assets', function (Blueprint $table) {
            $table->index(
                ['company_id', 'deleted_at', 'asset_date', 'id'],
                'company_assets_comp_del_date_id_idx'
            );
            $table->index(
                ['deleted_at', 'asset_date', 'id'],
                'company_assets_del_date_id_idx'
            );
            $table->dropIndex('company_assets_company_deleted_idx');
        });

        Schema::table('expense_categories', function (Blueprint $table) {
            $table->index(['deleted_at', 'id'], 'expense_categories_deleted_id_idx');

            $table->dropForeign(['company_id']);
            $table->foreign('company_id', 'expense_categories_company_id_foreign')
                ->references('id')
                ->on('companies')
                ->restrictOnDelete();
        });

        Schema::table('expense_types', function (Blueprint $table) {
            $table->index(
                ['company_id', 'expense_category_id', 'deleted_at'],
                'expense_types_comp_cat_del_idx'
            );
            $table->index(['deleted_at', 'id'], 'expense_types_deleted_id_idx');

            $table->dropForeign(['company_id']);
            $table->dropForeign(['expense_category_id']);

            $table->foreign('company_id', 'expense_types_company_id_foreign')
                ->references('id')
                ->on('companies')
                ->restrictOnDelete();
            $table->foreign('expense_category_id', 'expense_types_expense_category_id_foreign')
                ->references('id')
                ->on('expense_categories')
                ->restrictOnDelete();
        });

        Schema::table('expense_items', function (Blueprint $table) {
            $table->index(
                ['company_id', 'deleted_at', 'purchased_on'],
                'expense_items_comp_del_purchased_idx'
            );
            $table->index(
                ['company_id', 'deleted_at', 'expense_category_id', 'expense_type_id'],
                'expense_items_comp_del_cat_type_idx'
            );
            $table->index(['deleted_at', 'id'], 'expense_items_deleted_id_idx');

            $table->dropForeign(['company_id']);
            $table->dropForeign(['expense_category_id']);
            $table->dropForeign(['expense_type_id']);

            $table->foreign('company_id', 'expense_items_company_id_foreign')
                ->references('id')
                ->on('companies')
                ->restrictOnDelete();
            $table->foreign('expense_category_id', 'expense_items_expense_category_id_foreign')
                ->references('id')
                ->on('expense_categories')
                ->restrictOnDelete();
            $table->foreign('expense_type_id', 'expense_items_expense_type_id_foreign')
                ->references('id')
                ->on('expense_types')
                ->restrictOnDelete();

            $table->dropIndex('expense_items_company_deleted_idx');
        });
    }

    public function down(): void
    {
        Schema::table('expense_items', function (Blueprint $table) {
            $table->index(['company_id', 'deleted_at'], 'expense_items_company_deleted_idx');

            $table->dropForeign(['company_id']);
            $table->dropForeign(['expense_category_id']);
            $table->dropForeign(['expense_type_id']);

            $table->foreign('company_id', 'expense_items_company_id_foreign')
                ->references('id')
                ->on('companies')
                ->cascadeOnDelete();
            $table->foreign('expense_category_id', 'expense_items_expense_category_id_foreign')
                ->references('id')
                ->on('expense_categories')
                ->cascadeOnDelete();
            $table->foreign('expense_type_id', 'expense_items_expense_type_id_foreign')
                ->references('id')
                ->on('expense_types')
                ->cascadeOnDelete();

            $table->dropIndex('expense_items_comp_del_purchased_idx');
            $table->dropIndex('expense_items_comp_del_cat_type_idx');
            $table->dropIndex('expense_items_deleted_id_idx');
        });

        Schema::table('expense_types', function (Blueprint $table) {
            $table->dropForeign(['company_id']);
            $table->dropForeign(['expense_category_id']);

            $table->foreign('company_id', 'expense_types_company_id_foreign')
                ->references('id')
                ->on('companies')
                ->cascadeOnDelete();
            $table->foreign('expense_category_id', 'expense_types_expense_category_id_foreign')
                ->references('id')
                ->on('expense_categories')
                ->cascadeOnDelete();

            $table->dropIndex('expense_types_comp_cat_del_idx');
            $table->dropIndex('expense_types_deleted_id_idx');
        });

        Schema::table('expense_categories', function (Blueprint $table) {
            $table->dropForeign(['company_id']);
            $table->foreign('company_id', 'expense_categories_company_id_foreign')
                ->references('id')
                ->on('companies')
                ->cascadeOnDelete();

            $table->dropIndex('expense_categories_deleted_id_idx');
        });

        Schema::table('company_assets', function (Blueprint $table) {
            $table->index(['company_id', 'deleted_at'], 'company_assets_company_deleted_idx');
            $table->dropIndex('company_assets_comp_del_date_id_idx');
            $table->dropIndex('company_assets_del_date_id_idx');
        });

        Schema::table('capital_companies', function (Blueprint $table) {
            $table->dropForeign(['company_id']);
            $table->foreign('company_id', 'capital_companies_company_id_foreign')
                ->references('id')
                ->on('companies')
                ->cascadeOnDelete();

            $table->dropIndex('capital_companies_deleted_id_idx');
        });
    }
};
