<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('default_packages', function (Blueprint $table) {
            $table->id();
            $table->string('brand_name', 150);
            $table->foreignId('packet_name_id')->constrained('packet_names')->restrictOnDelete();
            $table->foreignId('packet_vendor_id')->constrained('packet_vendors')->restrictOnDelete();
            $table->foreignId('packet_category_id')->constrained('packet_categories')->restrictOnDelete();
            $table->foreignId('item_packet_id')->constrained('item_packet')->restrictOnDelete();
            $table->decimal('price', 18, 2)->default(0);
            $table->timestamps();
            $table->softDeletes();
            $table->unsignedTinyInteger('active_flag')
                ->nullable()
                ->virtualAs('CASE WHEN deleted_at IS NULL THEN 1 ELSE NULL END');

            $table->unique(
                ['brand_name', 'packet_name_id', 'packet_vendor_id', 'packet_category_id', 'item_packet_id', 'active_flag'],
                'default_packages_brand_pkt_vend_cat_ip_active_unique'
            );
            $table->index(['deleted_at', 'brand_name', 'id'], 'default_packages_del_brand_id_idx');
            $table->index(['deleted_at', 'packet_category_id', 'packet_vendor_id'], 'default_packages_del_cat_vendor_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('default_packages');
    }
};
