<?php

use App\Enums\PacketVendorType;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('packet_vendors', function (Blueprint $table) {
            $table->string('type', 30)
                ->default(PacketVendorType::Bahan->value)
                ->after('name');

            $table->index(['deleted_at', 'type', 'name', 'id'], 'packet_vendors_del_type_name_id_idx');
        });
    }

    public function down(): void
    {
        Schema::table('packet_vendors', function (Blueprint $table) {
            $table->dropIndex('packet_vendors_del_type_name_id_idx');
            $table->dropColumn('type');
        });
    }
};
