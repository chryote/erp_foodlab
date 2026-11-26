<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('default_packages', function (Blueprint $table) {
            $table->dropForeign(['packet_vendor_id']);
            $table->dropForeign(['item_packet_id']);
        });

        Schema::table('default_packages', function (Blueprint $table) {
            $table->unsignedBigInteger('company_id')->nullable()->after('packet_name_id');
            $table->unsignedBigInteger('packet_vendor_id')->nullable()->change();
            $table->unsignedBigInteger('packet_id')->nullable()->after('packet_category_id');
            $table->unsignedBigInteger('item_packet_id')->nullable()->change();

            $table->foreign('company_id', 'default_packages_company_id_foreign')
                ->references('id')
                ->on('companies')
                ->restrictOnDelete();

            $table->foreign('packet_vendor_id', 'default_packages_packet_vendor_id_foreign')
                ->references('id')
                ->on('packet_vendors')
                ->restrictOnDelete();

            $table->foreign('packet_id', 'default_packages_packet_id_foreign')
                ->references('id')
                ->on('packets')
                ->restrictOnDelete();

            $table->foreign('item_packet_id', 'default_packages_item_packet_id_foreign')
                ->references('id')
                ->on('item_packet')
                ->restrictOnDelete();

            $table->unique(
                ['brand_name', 'packet_name_id', 'company_id', 'packet_category_id', 'item_packet_id', 'active_flag'],
                'default_packages_brand_comp_cat_ip_active_unique'
            );
            $table->unique(
                ['brand_name', 'packet_name_id', 'packet_vendor_id', 'packet_category_id', 'packet_id', 'active_flag'],
                'default_packages_brand_vend_cat_pkt_active_unique'
            );
            $table->unique(
                ['brand_name', 'packet_name_id', 'company_id', 'packet_category_id', 'packet_id', 'active_flag'],
                'default_packages_brand_comp_cat_pkt_active_unique'
            );

            $table->index(['deleted_at', 'packet_category_id', 'company_id'], 'default_packages_del_cat_comp_idx');
            $table->index(['deleted_at', 'packet_id', 'id'], 'default_packages_del_pkt_id_idx');
        });

        if (DB::table('default_packages')->whereNull('packet_id')->whereNotNull('item_packet_id')->exists()) {
            $itemPacketPackets = DB::table('item_packet')->pluck('packet_id', 'id');

            foreach ($itemPacketPackets as $itemPacketId => $packetId) {
                if ($packetId !== null) {
                    DB::table('default_packages')
                        ->where('item_packet_id', $itemPacketId)
                        ->whereNull('packet_id')
                        ->update(['packet_id' => $packetId]);
                }
            }
        }
    }

    public function down(): void
    {
        Schema::table('default_packages', function (Blueprint $table) {
            $table->dropForeign(['company_id']);
            $table->dropForeign(['packet_vendor_id']);
            $table->dropForeign(['packet_id']);
            $table->dropForeign(['item_packet_id']);

            $table->dropUnique('default_packages_brand_comp_cat_ip_active_unique');
            $table->dropUnique('default_packages_brand_vend_cat_pkt_active_unique');
            $table->dropUnique('default_packages_brand_comp_cat_pkt_active_unique');

            $table->dropIndex('default_packages_del_cat_comp_idx');
            $table->dropIndex('default_packages_del_pkt_id_idx');

            $table->dropColumn(['company_id', 'packet_id']);
        });

        Schema::table('default_packages', function (Blueprint $table) {
            $table->unsignedBigInteger('packet_vendor_id')->nullable(false)->change();
            $table->unsignedBigInteger('item_packet_id')->nullable(false)->change();

            $table->foreign('packet_vendor_id', 'default_packages_packet_vendor_id_foreign')
                ->references('id')
                ->on('packet_vendors')
                ->restrictOnDelete();

            $table->foreign('item_packet_id', 'default_packages_item_packet_id_foreign')
                ->references('id')
                ->on('item_packet')
                ->restrictOnDelete();
        });
    }
};
