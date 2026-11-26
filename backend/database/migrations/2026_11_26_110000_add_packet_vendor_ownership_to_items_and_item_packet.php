<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('items', function (Blueprint $table) {
            $table->dropForeign(['company_id']);
        });

        Schema::table('items', function (Blueprint $table) {
            $table->unsignedBigInteger('company_id')->nullable()->change();
            $table->unsignedBigInteger('packet_vendor_id')->nullable()->after('company_id');

            $table->foreign('company_id', 'items_company_id_foreign')
                ->references('id')
                ->on('companies')
                ->restrictOnDelete();

            $table->foreign('packet_vendor_id', 'items_packet_vendor_id_foreign')
                ->references('id')
                ->on('packet_vendors')
                ->restrictOnDelete();

            $table->unique(['packet_vendor_id', 'name', 'active_flag'], 'items_vendor_name_active_unique');
            $table->unique(['packet_vendor_id', 'code', 'active_flag'], 'items_vendor_code_active_unique');
            $table->index(['packet_vendor_id', 'deleted_at', 'name', 'id'], 'items_vendor_del_name_id_idx');
            $table->index(['packet_vendor_id', 'deleted_at', 'code', 'id'], 'items_vendor_del_code_id_idx');
            $table->index(['packet_vendor_id', 'deleted_at', 'type'], 'items_vendor_del_type_idx');
        });

        Schema::table('item_packet', function (Blueprint $table) {
            $table->dropForeign(['company_id']);
        });

        Schema::table('item_packet', function (Blueprint $table) {
            $table->unsignedBigInteger('company_id')->nullable()->change();
            $table->unsignedBigInteger('packet_vendor_id')->nullable()->after('company_id');

            $table->foreign('company_id', 'item_packet_company_id_foreign')
                ->references('id')
                ->on('companies')
                ->restrictOnDelete();

            $table->foreign('packet_vendor_id', 'item_packet_packet_vendor_id_foreign')
                ->references('id')
                ->on('packet_vendors')
                ->restrictOnDelete();

            $table->unique(
                ['packet_vendor_id', 'packet_id', 'item_id', 'active_flag'],
                'item_packet_vendor_packet_item_active_unique'
            );
            $table->index(['packet_vendor_id', 'deleted_at', 'packet_id', 'id'], 'item_packet_vendor_del_packet_id_idx');
            $table->index(['packet_vendor_id', 'deleted_at', 'item_id', 'id'], 'item_packet_vendor_del_item_id_idx');
        });
    }

    public function down(): void
    {
        Schema::table('item_packet', function (Blueprint $table) {
            $table->dropForeign(['packet_vendor_id']);
            $table->dropForeign(['company_id']);
            $table->dropUnique('item_packet_vendor_packet_item_active_unique');
            $table->dropIndex('item_packet_vendor_del_packet_id_idx');
            $table->dropIndex('item_packet_vendor_del_item_id_idx');
            $table->dropColumn('packet_vendor_id');
        });

        Schema::table('item_packet', function (Blueprint $table) {
            $table->unsignedBigInteger('company_id')->nullable(false)->change();
            $table->foreign('company_id', 'item_packet_company_id_foreign')
                ->references('id')
                ->on('companies')
                ->restrictOnDelete();
        });

        Schema::table('items', function (Blueprint $table) {
            $table->dropForeign(['packet_vendor_id']);
            $table->dropForeign(['company_id']);
            $table->dropUnique('items_vendor_name_active_unique');
            $table->dropUnique('items_vendor_code_active_unique');
            $table->dropIndex('items_vendor_del_name_id_idx');
            $table->dropIndex('items_vendor_del_code_id_idx');
            $table->dropIndex('items_vendor_del_type_idx');
            $table->dropColumn('packet_vendor_id');
        });

        Schema::table('items', function (Blueprint $table) {
            $table->unsignedBigInteger('company_id')->nullable(false)->change();
            $table->foreign('company_id', 'items_company_id_foreign')
                ->references('id')
                ->on('companies')
                ->restrictOnDelete();
        });
    }
};
