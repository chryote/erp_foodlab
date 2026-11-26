<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('packet_vendors', function (Blueprint $table) {
            $table->id();
            $table->string('name', 150);
            $table->timestamps();
            $table->softDeletes();
            $table->unsignedTinyInteger('active_flag')
                ->nullable()
                ->virtualAs('CASE WHEN deleted_at IS NULL THEN 1 ELSE NULL END');

            $table->unique(['name', 'active_flag'], 'packet_vendors_name_active_unique');
            $table->index(['deleted_at', 'name', 'id'], 'packet_vendors_del_name_id_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('packet_vendors');
    }
};
