<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('payroll_items', function (Blueprint $table) {
            $table->unsignedSmallInteger('attendance_days')
                ->default(0)
                ->after('payroll_group');
            $table->string('status', 30)
                ->default('draft')
                ->after('total_net');
            $table->foreignId('finalized_by')
                ->nullable()
                ->after('notes')
                ->constrained('users')
                ->restrictOnDelete();
            $table->timestamp('finalized_at')
                ->nullable()
                ->after('finalized_by');

            $table->index(
                ['payroll_run_id', 'deleted_at', 'status'],
                'payroll_items_run_del_status_idx'
            );
        });
    }

    public function down(): void
    {
        Schema::table('payroll_items', function (Blueprint $table) {
            $table->dropIndex('payroll_items_run_del_status_idx');
            $table->dropForeign(['finalized_by']);
            $table->dropColumn([
                'attendance_days',
                'status',
                'finalized_by',
                'finalized_at',
            ]);
        });
    }
};
