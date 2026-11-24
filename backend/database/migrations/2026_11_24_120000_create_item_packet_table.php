<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('item_packet', function (Blueprint $table) {
            $table->id();
            $table->foreignId('packet_id')->constrained('packets')->restrictOnDelete();
            $table->foreignId('item_id')->constrained('items')->restrictOnDelete();
            $table->unsignedInteger('quantity')->default(1);
            $table->timestamps();
            $table->softDeletes();
            $table->unsignedTinyInteger('active_flag')
                ->nullable()
                ->virtualAs('CASE WHEN deleted_at IS NULL THEN 1 ELSE NULL END');

            $table->unique(
                ['packet_id', 'item_id', 'active_flag'],
                'item_packet_packet_item_active_unique'
            );
            $table->index(['deleted_at', 'packet_id', 'id'], 'item_packet_del_packet_id_idx');
            $table->index(['deleted_at', 'item_id', 'id'], 'item_packet_del_item_id_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('item_packet');
    }
};
