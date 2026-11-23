<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('employee_positions', function (Blueprint $table) {
            $table->index(['company_id', 'deleted_at', 'name', 'id'], 'employee_positions_comp_del_name_id_idx');
            $table->index(['deleted_at', 'name', 'id'], 'employee_positions_del_name_id_idx');
            $table->dropIndex('employee_positions_company_deleted_idx');
        });

        Schema::table('employment_statuses', function (Blueprint $table) {
            $table->index(['company_id', 'deleted_at', 'name', 'id'], 'employment_statuses_comp_del_name_id_idx');
            $table->index(['deleted_at', 'name', 'id'], 'employment_statuses_del_name_id_idx');
            $table->dropIndex('employment_statuses_company_deleted_idx');
        });

        Schema::table('payroll_grades', function (Blueprint $table) {
            $table->index(['company_id', 'deleted_at', 'grade', 'sub_grade'], 'payroll_grades_comp_del_grade_sub_idx');
            $table->index(['deleted_at', 'grade', 'sub_grade'], 'payroll_grades_del_grade_sub_idx');
            $table->dropIndex('payroll_grades_company_deleted_idx');
        });

        Schema::table('tax_statuses', function (Blueprint $table) {
            $table->index(['company_id', 'deleted_at', 'code', 'id'], 'tax_statuses_comp_del_code_id_idx');
            $table->index(['deleted_at', 'code', 'id'], 'tax_statuses_del_code_id_idx');
            $table->dropIndex('tax_statuses_company_deleted_idx');
        });

        Schema::table('employees', function (Blueprint $table) {
            $table->index(['company_id', 'deleted_at', 'name', 'id'], 'employees_comp_del_name_id_idx');
            $table->index(['deleted_at', 'name', 'id'], 'employees_del_name_id_idx');
            $table->dropIndex('employees_company_deleted_idx');
        });

        Schema::table('employee_documents', function (Blueprint $table) {
            $table->index(['employee_id', 'deleted_at'], 'employee_documents_emp_deleted_idx');
        });
    }

    public function down(): void
    {
        Schema::table('employee_documents', function (Blueprint $table) {
            $table->dropIndex('employee_documents_emp_deleted_idx');
        });

        Schema::table('employees', function (Blueprint $table) {
            $table->index(['company_id', 'deleted_at'], 'employees_company_deleted_idx');
            $table->dropIndex('employees_comp_del_name_id_idx');
            $table->dropIndex('employees_del_name_id_idx');
        });

        Schema::table('tax_statuses', function (Blueprint $table) {
            $table->index(['company_id', 'deleted_at'], 'tax_statuses_company_deleted_idx');
            $table->dropIndex('tax_statuses_comp_del_code_id_idx');
            $table->dropIndex('tax_statuses_del_code_id_idx');
        });

        Schema::table('payroll_grades', function (Blueprint $table) {
            $table->index(['company_id', 'deleted_at'], 'payroll_grades_company_deleted_idx');
            $table->dropIndex('payroll_grades_comp_del_grade_sub_idx');
            $table->dropIndex('payroll_grades_del_grade_sub_idx');
        });

        Schema::table('employment_statuses', function (Blueprint $table) {
            $table->index(['company_id', 'deleted_at'], 'employment_statuses_company_deleted_idx');
            $table->dropIndex('employment_statuses_comp_del_name_id_idx');
            $table->dropIndex('employment_statuses_del_name_id_idx');
        });

        Schema::table('employee_positions', function (Blueprint $table) {
            $table->index(['company_id', 'deleted_at'], 'employee_positions_company_deleted_idx');
            $table->dropIndex('employee_positions_comp_del_name_id_idx');
            $table->dropIndex('employee_positions_del_name_id_idx');
        });
    }
};
