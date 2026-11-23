<?php

use App\Enums\ShiftStatusEnum;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('employee_shifts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')
                ->constrained('companies')
                ->restrictOnDelete();
            $table->string('code', 50)->nullable();
            $table->string('name', 150);
            $table->time('start_time');
            $table->time('end_time');
            $table->unsignedSmallInteger('break_minutes')->default(0);
            $table->unsignedSmallInteger('grace_period_minutes')->default(0);
            $table->boolean('is_overnight')->default(false);
            $table->string('status', 30)->default(ShiftStatusEnum::ACTIVE->value);
            $table->text('description')->nullable();
            $table->timestamps();
            $table->softDeletes();
            // CASE WHEN works identically in both MySQL 8.0 and in-memory SQLite tests
            $table->unsignedTinyInteger('active_flag')
                ->nullable()
                ->storedAs('CASE WHEN deleted_at IS NULL THEN 1 ELSE NULL END');

            $table->unique(['company_id', 'code', 'active_flag'], 'employee_shifts_company_code_active_unique');
            $table->index(['company_id', 'deleted_at'], 'employee_shifts_company_deleted_idx');
            $table->index(['company_id', 'status'], 'employee_shifts_company_status_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('employee_shifts');
    }
};
