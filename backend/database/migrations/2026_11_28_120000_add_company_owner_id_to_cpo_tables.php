<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('packet_categories', function (Blueprint $table) {
            $table->unsignedBigInteger('company_owner_id')->nullable()->after('id');
            $table->foreign('company_owner_id', 'packet_categories_company_owner_id_foreign')
                ->references('id')
                ->on('companies')
                ->restrictOnDelete();

            $table->dropUnique('packet_categories_name_active_unique');
            $table->unique(['company_owner_id', 'name', 'active_flag'], 'packet_categories_owner_name_active_unique');
            $table->index(['company_owner_id', 'deleted_at', 'name', 'id'], 'packet_categories_owner_del_name_id_idx');
        });

        Schema::table('packet_names', function (Blueprint $table) {
            $table->unsignedBigInteger('company_owner_id')->nullable()->after('id');
            $table->foreign('company_owner_id', 'packet_names_company_owner_id_foreign')
                ->references('id')
                ->on('companies')
                ->restrictOnDelete();

            $table->dropUnique('packet_names_name_active_unique');
            $table->unique(['company_owner_id', 'name', 'active_flag'], 'packet_names_owner_name_active_unique');
            $table->index(['company_owner_id', 'deleted_at', 'name', 'id'], 'packet_names_owner_del_name_id_idx');
        });

        Schema::table('packet_vendors', function (Blueprint $table) {
            $table->unsignedBigInteger('company_owner_id')->nullable()->after('id');
            $table->foreign('company_owner_id', 'packet_vendors_company_owner_id_foreign')
                ->references('id')
                ->on('companies')
                ->restrictOnDelete();

            $table->dropUnique('packet_vendors_name_active_unique');
            $table->unique(['company_owner_id', 'name', 'active_flag'], 'packet_vendors_owner_name_active_unique');
            $table->index(['company_owner_id', 'deleted_at', 'name', 'id'], 'packet_vendors_owner_del_name_id_idx');
            $table->index(['company_owner_id', 'deleted_at', 'type', 'name', 'id'], 'packet_vendors_owner_del_type_name_id_idx');
        });

        Schema::table('packets', function (Blueprint $table) {
            $table->unsignedBigInteger('company_owner_id')->nullable()->after('id');
            $table->foreign('company_owner_id', 'packets_company_owner_id_foreign')
                ->references('id')
                ->on('companies')
                ->restrictOnDelete();

            $table->dropUnique('packets_name_active_unique');
            $table->unique(['company_owner_id', 'name', 'active_flag'], 'packets_owner_name_active_unique');
            $table->index(['company_owner_id', 'deleted_at', 'name', 'id'], 'packets_owner_del_name_id_idx');
        });

        Schema::table('items', function (Blueprint $table) {
            $table->unsignedBigInteger('company_owner_id')->nullable()->after('id');
            $table->foreign('company_owner_id', 'items_company_owner_id_foreign')
                ->references('id')
                ->on('companies')
                ->restrictOnDelete();

            $table->dropUnique('items_company_name_active_unique');
            $table->dropUnique('items_company_code_active_unique');
            $table->dropUnique('items_vendor_name_active_unique');
            $table->dropUnique('items_vendor_code_active_unique');

            $table->unique(['company_owner_id', 'company_id', 'name', 'active_flag'], 'items_owner_comp_name_active_unique');
            $table->unique(['company_owner_id', 'company_id', 'code', 'active_flag'], 'items_owner_comp_code_active_unique');
            $table->unique(['company_owner_id', 'packet_vendor_id', 'name', 'active_flag'], 'items_owner_vend_name_active_unique');
            $table->unique(['company_owner_id', 'packet_vendor_id', 'code', 'active_flag'], 'items_owner_vend_code_active_unique');

            $table->index(['company_owner_id', 'deleted_at', 'name', 'id'], 'items_owner_del_name_id_idx');
            $table->index(['company_owner_id', 'deleted_at', 'type'], 'items_owner_del_type_idx');
        });

        Schema::table('item_packet', function (Blueprint $table) {
            $table->unsignedBigInteger('company_owner_id')->nullable()->after('id');
            $table->foreign('company_owner_id', 'item_packet_company_owner_id_foreign')
                ->references('id')
                ->on('companies')
                ->restrictOnDelete();

            $table->dropUnique('item_packet_comp_packet_item_active_unique');
            $table->dropUnique('item_packet_vendor_packet_item_active_unique');

            $table->unique(['company_owner_id', 'company_id', 'packet_id', 'item_id', 'active_flag'], 'ip_owner_comp_pkt_item_active_unique');
            $table->unique(['company_owner_id', 'packet_vendor_id', 'packet_id', 'item_id', 'active_flag'], 'ip_owner_vend_pkt_item_active_unique');

            $table->index(['company_owner_id', 'deleted_at', 'packet_id', 'id'], 'item_packet_owner_del_pkt_id_idx');
            $table->index(['company_owner_id', 'deleted_at', 'item_id', 'id'], 'item_packet_owner_del_item_id_idx');
        });

        Schema::table('default_packages', function (Blueprint $table) {
            $table->unsignedBigInteger('company_owner_id')->nullable()->after('id');
            $table->foreign('company_owner_id', 'default_packages_company_owner_id_foreign')
                ->references('id')
                ->on('companies')
                ->restrictOnDelete();

            $table->dropUnique('default_packages_brand_pkt_vend_cat_ip_active_unique');
            $table->dropUnique('default_packages_brand_comp_cat_ip_active_unique');
            $table->dropUnique('default_packages_brand_vend_cat_pkt_active_unique');
            $table->dropUnique('default_packages_brand_comp_cat_pkt_active_unique');

            $table->unique(['company_owner_id', 'brand_name', 'packet_name_id', 'packet_vendor_id', 'packet_category_id', 'item_packet_id', 'active_flag'], 'dp_owner_brand_vend_cat_ip_active_unique');
            $table->unique(['company_owner_id', 'brand_name', 'packet_name_id', 'company_id', 'packet_category_id', 'item_packet_id', 'active_flag'], 'dp_owner_brand_comp_cat_ip_active_unique');
            $table->unique(['company_owner_id', 'brand_name', 'packet_name_id', 'packet_vendor_id', 'packet_category_id', 'packet_id', 'active_flag'], 'dp_owner_brand_vend_cat_pkt_active_unique');
            $table->unique(['company_owner_id', 'brand_name', 'packet_name_id', 'company_id', 'packet_category_id', 'packet_id', 'active_flag'], 'dp_owner_brand_comp_cat_pkt_active_unique');

            $table->index(['company_owner_id', 'deleted_at', 'brand_name', 'id'], 'dp_owner_del_brand_id_idx');
        });

        Schema::table('ingredients', function (Blueprint $table) {
            $table->unsignedBigInteger('company_owner_id')->nullable()->after('id');
            $table->foreign('company_owner_id', 'ingredients_company_owner_id_foreign')
                ->references('id')
                ->on('companies')
                ->restrictOnDelete();

            $table->index(['company_owner_id', 'deleted_at', 'default_package_id', 'id'], 'ingredients_owner_del_pkg_id_idx');
        });

        $firstCompanyId = DB::table('companies')->whereNull('deleted_at')->orderBy('id')->value('id')
            ?? DB::table('companies')->orderBy('id')->value('id');

        if ($firstCompanyId !== null) {
            foreach (['packet_categories', 'packet_names', 'packet_vendors', 'packets'] as $table) {
                DB::table($table)->whereNull('company_owner_id')->update(['company_owner_id' => $firstCompanyId]);
            }

            foreach (['items', 'item_packet', 'default_packages'] as $table) {
                DB::table($table)
                    ->whereNull('company_owner_id')
                    ->update(['company_owner_id' => DB::raw('COALESCE(company_id, '.(int) $firstCompanyId.')')]);
            }

            $packageOwners = DB::table('default_packages')->pluck('company_owner_id', 'id');
            foreach ($packageOwners as $packageId => $ownerId) {
                if ($ownerId !== null) {
                    DB::table('ingredients')
                        ->where('default_package_id', $packageId)
                        ->whereNull('company_owner_id')
                        ->update(['company_owner_id' => $ownerId]);
                }
            }
            DB::table('ingredients')->whereNull('company_owner_id')->update(['company_owner_id' => $firstCompanyId]);
        }
    }

    public function down(): void
    {
        Schema::table('ingredients', function (Blueprint $table) {
            $table->dropForeign(['company_owner_id']);
            $table->dropIndex('ingredients_owner_del_pkg_id_idx');
            $table->dropColumn('company_owner_id');
        });

        Schema::table('default_packages', function (Blueprint $table) {
            $table->dropForeign(['company_owner_id']);
            $table->dropUnique('dp_owner_brand_vend_cat_ip_active_unique');
            $table->dropUnique('dp_owner_brand_comp_cat_ip_active_unique');
            $table->dropUnique('dp_owner_brand_vend_cat_pkt_active_unique');
            $table->dropUnique('dp_owner_brand_comp_cat_pkt_active_unique');
            $table->dropIndex('dp_owner_del_brand_id_idx');
            $table->dropColumn('company_owner_id');

            $table->unique(['brand_name', 'packet_name_id', 'packet_vendor_id', 'packet_category_id', 'item_packet_id', 'active_flag'], 'default_packages_brand_pkt_vend_cat_ip_active_unique');
            $table->unique(['brand_name', 'packet_name_id', 'company_id', 'packet_category_id', 'item_packet_id', 'active_flag'], 'default_packages_brand_comp_cat_ip_active_unique');
            $table->unique(['brand_name', 'packet_name_id', 'packet_vendor_id', 'packet_category_id', 'packet_id', 'active_flag'], 'default_packages_brand_vend_cat_pkt_active_unique');
            $table->unique(['brand_name', 'packet_name_id', 'company_id', 'packet_category_id', 'packet_id', 'active_flag'], 'default_packages_brand_comp_cat_pkt_active_unique');
        });

        Schema::table('item_packet', function (Blueprint $table) {
            $table->dropForeign(['company_owner_id']);
            $table->dropUnique('ip_owner_comp_pkt_item_active_unique');
            $table->dropUnique('ip_owner_vend_pkt_item_active_unique');
            $table->dropIndex('item_packet_owner_del_pkt_id_idx');
            $table->dropIndex('item_packet_owner_del_item_id_idx');
            $table->dropColumn('company_owner_id');

            $table->unique(['company_id', 'packet_id', 'item_id', 'active_flag'], 'item_packet_comp_packet_item_active_unique');
            $table->unique(['packet_vendor_id', 'packet_id', 'item_id', 'active_flag'], 'item_packet_vendor_packet_item_active_unique');
        });

        Schema::table('items', function (Blueprint $table) {
            $table->dropForeign(['company_owner_id']);
            $table->dropUnique('items_owner_comp_name_active_unique');
            $table->dropUnique('items_owner_comp_code_active_unique');
            $table->dropUnique('items_owner_vend_name_active_unique');
            $table->dropUnique('items_owner_vend_code_active_unique');
            $table->dropIndex('items_owner_del_name_id_idx');
            $table->dropIndex('items_owner_del_type_idx');
            $table->dropColumn('company_owner_id');

            $table->unique(['company_id', 'name', 'active_flag'], 'items_company_name_active_unique');
            $table->unique(['company_id', 'code', 'active_flag'], 'items_company_code_active_unique');
            $table->unique(['packet_vendor_id', 'name', 'active_flag'], 'items_vendor_name_active_unique');
            $table->unique(['packet_vendor_id', 'code', 'active_flag'], 'items_vendor_code_active_unique');
        });

        Schema::table('packets', function (Blueprint $table) {
            $table->dropForeign(['company_owner_id']);
            $table->dropUnique('packets_owner_name_active_unique');
            $table->dropIndex('packets_owner_del_name_id_idx');
            $table->dropColumn('company_owner_id');

            $table->unique(['name', 'active_flag'], 'packets_name_active_unique');
        });

        Schema::table('packet_vendors', function (Blueprint $table) {
            $table->dropForeign(['company_owner_id']);
            $table->dropUnique('packet_vendors_owner_name_active_unique');
            $table->dropIndex('packet_vendors_owner_del_name_id_idx');
            $table->dropIndex('packet_vendors_owner_del_type_name_id_idx');
            $table->dropColumn('company_owner_id');

            $table->unique(['name', 'active_flag'], 'packet_vendors_name_active_unique');
        });

        Schema::table('packet_names', function (Blueprint $table) {
            $table->dropForeign(['company_owner_id']);
            $table->dropUnique('packet_names_owner_name_active_unique');
            $table->dropIndex('packet_names_owner_del_name_id_idx');
            $table->dropColumn('company_owner_id');

            $table->unique(['name', 'active_flag'], 'packet_names_name_active_unique');
        });

        Schema::table('packet_categories', function (Blueprint $table) {
            $table->dropForeign(['company_owner_id']);
            $table->dropUnique('packet_categories_owner_name_active_unique');
            $table->dropIndex('packet_categories_owner_del_name_id_idx');
            $table->dropColumn('company_owner_id');

            $table->unique(['name', 'active_flag'], 'packet_categories_name_active_unique');
        });
    }
};
