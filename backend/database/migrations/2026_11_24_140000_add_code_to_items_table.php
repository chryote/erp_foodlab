<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('items', function (Blueprint $table) {
            $table->string('code', 50)->nullable()->after('company_id');

            $table->unique(['company_id', 'code', 'active_flag'], 'items_company_code_active_unique');
            $table->index(['company_id', 'deleted_at', 'code', 'id'], 'items_comp_del_code_id_idx');
            $table->index(['deleted_at', 'code', 'id'], 'items_del_code_id_idx');
        });
    }

    public function down(): void
    {
        Schema::table('items', function (Blueprint $table) {
            $table->dropUnique('items_company_code_active_unique');
            $table->dropIndex('items_comp_del_code_id_idx');
            $table->dropIndex('items_del_code_id_idx');
            $table->dropColumn('code');
        });
    }
};
