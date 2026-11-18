<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('lab_samples', function (Blueprint $table) {
            $table->id();
            $table->string('batch_code', 64)->unique();
            $table->string('product_name', 150);
            $table->string('category', 80)->index();
            $table->decimal('ph_level', 4, 2);
            $table->decimal('moisture_percent', 5, 2);
            $table->string('status', 32)->default('pending')->index();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('lab_samples');
    }
};
