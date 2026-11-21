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
        Schema::create('employees', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained('companies')->restrictOnDelete();
            $table->foreignId('employee_position_id')->nullable()->constrained('employee_positions')->restrictOnDelete();
            $table->string('name', 150)->index();
            $table->string('email', 150)->nullable();
            $table->string('phone', 50)->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index('company_id');
            $table->index('employee_position_id');
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
        Schema::dropIfExists('employees');
    }
};
