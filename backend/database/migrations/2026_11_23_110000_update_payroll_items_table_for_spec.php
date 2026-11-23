<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('payroll_items', function (Blueprint $table) {
            $table->foreignId('employee_position_id')
                ->nullable()
                ->after('employee_id')
                ->constrained('employee_positions')
                ->restrictOnDelete();
            $table->string('payroll_group', 30)
                ->default('office')
                ->after('employee_position_id');
            $table->string('bank_account_number', 50)
                ->nullable()
                ->after('payroll_group');

            $table->renameColumn('net_amount', 'total_net');
        });

        Schema::table('payroll_items', function (Blueprint $table) {
            // Add replacement indexes starting with payroll_run_id before dropping old ones
            // so MySQL FK checks always retain a supporting index on payroll_run_id.
            $table->index(
                ['payroll_run_id', 'deleted_at', 'payroll_group', 'id'],
                'payroll_items_run_del_group_id_idx'
            );
            $table->index(
                ['company_id', 'deleted_at', 'employee_id'],
                'payroll_items_comp_del_emp_idx'
            );
            $table->index(
                ['deleted_at', 'id'],
                'payroll_items_deleted_id_idx'
            );

            $table->unique(
                ['company_id', 'payroll_run_id', 'employee_id', 'active_flag'],
                'payroll_items_comp_run_emp_active_unique'
            );

            $table->dropUnique('payroll_items_run_emp_active_unique');
            $table->dropIndex('payroll_items_run_del_id_idx');
        });
    }

    public function down(): void
    {
        Schema::table('payroll_items', function (Blueprint $table) {
            $table->index(
                ['payroll_run_id', 'deleted_at', 'id'],
                'payroll_items_run_del_id_idx'
            );
            $table->unique(
                ['payroll_run_id', 'employee_id', 'active_flag'],
                'payroll_items_run_emp_active_unique'
            );

            $table->dropUnique('payroll_items_comp_run_emp_active_unique');
            $table->dropIndex('payroll_items_run_del_group_id_idx');
            $table->dropIndex('payroll_items_comp_del_emp_idx');
            $table->dropIndex('payroll_items_deleted_id_idx');
        });

        Schema::table('payroll_items', function (Blueprint $table) {
            $table->renameColumn('total_net', 'net_amount');

            $table->dropForeign(['employee_position_id']);
            $table->dropColumn([
                'employee_position_id',
                'payroll_group',
                'bank_account_number',
            ]);
        });
    }
};
