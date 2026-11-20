<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('company_assets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained('companies')->restrictOnDelete();
            $table->date('asset_date');
            $table->string('name', 150)->index();
            $table->unsignedInteger('amount')->default(1);
            $table->double('price_per_unit')->default(0);
            $table->double('total_price')->default(0);
            $table->timestamps();
            $table->softDeletes();

            $table->index(['company_id', 'asset_date']);
            $table->index('asset_date');
            $table->index('amount');
            $table->index('total_price');
            $table->index('created_at');
            $table->index('updated_at');
            $table->index('deleted_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('company_assets');
    }
};
