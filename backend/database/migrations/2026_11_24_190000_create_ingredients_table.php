<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ingredients', function (Blueprint $table) {
            $table->id();
            $table->foreignId('default_package_id')->constrained('default_packages')->restrictOnDelete();
            $table->foreignId('item_id')->constrained('items')->restrictOnDelete();
            $table->decimal('price', 18, 2)->default(0);
            $table->timestamps();
            $table->softDeletes();
            $table->unsignedTinyInteger('active_flag')
                ->nullable()
                ->virtualAs('CASE WHEN deleted_at IS NULL THEN 1 ELSE NULL END');

            $table->unique(
                ['default_package_id', 'item_id', 'active_flag'],
                'ingredients_pkg_item_active_unique'
            );
            $table->index(['deleted_at', 'default_package_id', 'id'], 'ingredients_del_pkg_id_idx');
            $table->index(['deleted_at', 'item_id', 'id'], 'ingredients_del_item_id_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ingredients');
    }
};
