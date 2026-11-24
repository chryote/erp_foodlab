<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $defaultCompanyId = DB::table('companies')
            ->whereNull('deleted_at')
            ->orderBy('id')
            ->value('id') ?? DB::table('companies')->orderBy('id')->value('id');

        Schema::table('items', function (Blueprint $table) {
            $table->unsignedBigInteger('company_id')->nullable()->after('id');
            $table->string('type', 30)->default('Bahan')->after('name');
        });

        if ($defaultCompanyId !== null) {
            DB::table('items')
                ->whereNull('company_id')
                ->update(['company_id' => $defaultCompanyId]);
        }

        if (! DB::table('items')->whereNull('company_id')->exists()) {
            Schema::table('items', function (Blueprint $table) {
                $table->unsignedBigInteger('company_id')->nullable(false)->change();
            });
        }

        Schema::table('items', function (Blueprint $table) {
            $table->foreign('company_id', 'items_company_id_foreign')
                ->references('id')
                ->on('companies')
                ->restrictOnDelete();

            $table->unique(['company_id', 'name', 'active_flag'], 'items_company_name_active_unique');
            $table->index(['company_id', 'deleted_at', 'name', 'id'], 'items_comp_del_name_id_idx');
            $table->index(['company_id', 'deleted_at', 'type'], 'items_comp_del_type_idx');

            $table->dropUnique('items_name_active_unique');
        });

        Schema::table('item_packet', function (Blueprint $table) {
            $table->unsignedBigInteger('company_id')->nullable()->after('id');
        });

        if (DB::table('item_packet')->whereNull('company_id')->exists()) {
            $itemCompanyMap = DB::table('items')->pluck('company_id', 'id');

            foreach ($itemCompanyMap as $itemId => $companyId) {
                if ($companyId !== null) {
                    DB::table('item_packet')
                        ->where('item_id', $itemId)
                        ->whereNull('company_id')
                        ->update(['company_id' => $companyId]);
                }
            }

            if ($defaultCompanyId !== null) {
                DB::table('item_packet')
                    ->whereNull('company_id')
                    ->update(['company_id' => $defaultCompanyId]);
            }
        }

        if (! DB::table('item_packet')->whereNull('company_id')->exists()) {
            Schema::table('item_packet', function (Blueprint $table) {
                $table->unsignedBigInteger('company_id')->nullable(false)->change();
            });
        }

        Schema::table('item_packet', function (Blueprint $table) {
            $table->foreign('company_id', 'item_packet_company_id_foreign')
                ->references('id')
                ->on('companies')
                ->restrictOnDelete();

            // Keep an index starting with packet_id so MySQL can drop item_packet_packet_item_active_unique without FK Error 1553.
            $table->index('packet_id', 'item_packet_packet_id_foreign');

            $table->unique(
                ['company_id', 'packet_id', 'item_id', 'active_flag'],
                'item_packet_comp_packet_item_active_unique'
            );
            $table->index(['company_id', 'deleted_at', 'packet_id', 'id'], 'item_packet_comp_del_packet_id_idx');
            $table->index(['company_id', 'deleted_at', 'item_id', 'id'], 'item_packet_comp_del_item_id_idx');

            $table->dropUnique('item_packet_packet_item_active_unique');
        });
    }

    public function down(): void
    {
        Schema::table('item_packet', function (Blueprint $table) {
            $table->unique(
                ['packet_id', 'item_id', 'active_flag'],
                'item_packet_packet_item_active_unique'
            );

            $table->dropForeign(['company_id']);
            $table->dropUnique('item_packet_comp_packet_item_active_unique');
            $table->dropIndex('item_packet_comp_del_packet_id_idx');
            $table->dropIndex('item_packet_comp_del_item_id_idx');
            $table->dropIndex('item_packet_packet_id_foreign');
            $table->dropColumn('company_id');
        });

        Schema::table('items', function (Blueprint $table) {
            $table->unique(['name', 'active_flag'], 'items_name_active_unique');

            $table->dropForeign(['company_id']);
            $table->dropUnique('items_company_name_active_unique');
            $table->dropIndex('items_comp_del_name_id_idx');
            $table->dropIndex('items_comp_del_type_idx');
            $table->dropColumn(['company_id', 'type']);
        });
    }
};
