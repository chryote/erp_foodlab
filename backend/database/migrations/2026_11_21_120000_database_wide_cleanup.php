<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    private const ACTIVE_FLAG_EXPRESSION = 'CASE WHEN deleted_at IS NULL THEN 1 ELSE NULL END';

    public function up(): void
    {
        // 1. Convert financial `double` columns to DECIMAL(18, 2)
        Schema::table('capital_companies', function (Blueprint $table) {
            $table->decimal('capital', 18, 2)->change();
            $table->index(['company_id', 'deleted_at'], 'capital_companies_company_deleted_idx');
            $table->dropIndex('capital_companies_company_id_index');
            $table->dropIndex('capital_companies_capital_index');
            $table->dropIndex('capital_companies_created_at_index');
            $table->dropIndex('capital_companies_updated_at_index');
            $table->dropIndex('capital_companies_deleted_at_index');
        });

        Schema::table('company_assets', function (Blueprint $table) {
            $table->decimal('price_per_unit', 18, 2)->default(0)->change();
            $table->decimal('total_price', 18, 2)->default(0)->change();
            $table->index(['company_id', 'deleted_at'], 'company_assets_company_deleted_idx');
            $table->dropIndex('company_assets_amount_index');
            $table->dropIndex('company_assets_total_price_index');
            $table->dropIndex('company_assets_created_at_index');
            $table->dropIndex('company_assets_updated_at_index');
            $table->dropIndex('company_assets_deleted_at_index');
        });

        Schema::table('expense_items', function (Blueprint $table) {
            $table->decimal('amount', 18, 2)->change();
            $table->foreign('employee_id', 'expense_items_employee_id_foreign')
                ->references('id')
                ->on('employees')
                ->restrictOnDelete();
            $table->index(['company_id', 'deleted_at'], 'expense_items_company_deleted_idx');
            $table->dropIndex('expense_items_amount_index');
            $table->dropIndex('expense_items_created_at_index');
            $table->dropIndex('expense_items_updated_at_index');
            $table->dropIndex('expense_items_deleted_at_index');
        });

        Schema::table('payroll_grades', function (Blueprint $table) {
            $table->decimal('base_salary', 18, 2)->change();
            $table->decimal('position_allowance', 18, 2)->default(0)->change();
            $table->decimal('total_gross', 18, 2)->change();
            $table->decimal('bpjs_kesehatan_company', 18, 2)->change();
            $table->decimal('bpjs_kesehatan_employee', 18, 2)->change();
            $table->decimal('bpjs_ketenagakerjaan_company', 18, 2)->change();
            $table->decimal('bpjs_ketenagakerjaan_employee', 18, 2)->change();
            $table->decimal('net_employee_received', 18, 2)->change();
            $table->decimal('total_company_cost', 18, 2)->change();

            $table->unsignedTinyInteger('active_flag')
                ->nullable()
                ->virtualAs(self::ACTIVE_FLAG_EXPRESSION)
                ->after('deleted_at');

            $table->unique(
                ['company_id', 'grade', 'sub_grade', 'active_flag'],
                'payroll_grades_company_grade_sub_active_unique'
            );
            $table->index(['company_id', 'deleted_at'], 'payroll_grades_company_deleted_idx');

            $table->dropUnique('payroll_grades_grade_sub_grade_deleted_at_unique');
            $table->dropIndex('payroll_grades_company_id_index');
            $table->dropIndex('payroll_grades_created_at_index');
            $table->dropIndex('payroll_grades_updated_at_index');
            $table->dropIndex('payroll_grades_deleted_at_index');
            $table->dropIndex('payroll_grades_grade_index');
        });

        // 2. Fix soft-delete & multi-tenant unique constraints + clean up indexes
        Schema::table('employee_documents', function (Blueprint $table) {
            $table->unsignedTinyInteger('active_flag')
                ->nullable()
                ->virtualAs(self::ACTIVE_FLAG_EXPRESSION)
                ->after('deleted_at');

            // Create new unique index first so employee_id remains indexed for its FK
            $table->unique(
                ['employee_id', 'document_type', 'active_flag'],
                'employee_documents_emp_type_active_unique'
            );
            $table->dropUnique('employee_documents_employee_id_document_type_deleted_at_unique');
            $table->dropIndex('employee_documents_employee_id_index');
            $table->dropIndex('employee_documents_created_at_index');
            $table->dropIndex('employee_documents_updated_at_index');
            $table->dropIndex('employee_documents_deleted_at_index');
        });

        Schema::table('employee_positions', function (Blueprint $table) {
            $table->unsignedTinyInteger('active_flag')
                ->nullable()
                ->virtualAs(self::ACTIVE_FLAG_EXPRESSION)
                ->after('deleted_at');

            $table->unique(['company_id', 'code', 'active_flag'], 'employee_positions_company_code_active_unique');
            $table->index(['company_id', 'deleted_at'], 'employee_positions_company_deleted_idx');

            $table->dropUnique('employee_positions_code_unique');
            $table->dropIndex('employee_positions_company_id_index');
            $table->dropIndex('employee_positions_created_at_index');
            $table->dropIndex('employee_positions_updated_at_index');
            $table->dropIndex('employee_positions_deleted_at_index');
        });

        Schema::table('employment_statuses', function (Blueprint $table) {
            $table->unsignedTinyInteger('active_flag')
                ->nullable()
                ->virtualAs(self::ACTIVE_FLAG_EXPRESSION)
                ->after('deleted_at');

            $table->unique(['company_id', 'code', 'active_flag'], 'employment_statuses_company_code_active_unique');
            $table->index(['company_id', 'deleted_at'], 'employment_statuses_company_deleted_idx');

            $table->dropUnique('employment_statuses_code_unique');
            $table->dropIndex('employment_statuses_company_id_index');
            $table->dropIndex('employment_statuses_created_at_index');
            $table->dropIndex('employment_statuses_updated_at_index');
            $table->dropIndex('employment_statuses_deleted_at_index');
        });

        Schema::table('tax_statuses', function (Blueprint $table) {
            $table->unsignedTinyInteger('active_flag')
                ->nullable()
                ->virtualAs(self::ACTIVE_FLAG_EXPRESSION)
                ->after('deleted_at');

            $table->unique(['company_id', 'code', 'active_flag'], 'tax_statuses_company_code_active_unique');
            $table->index(['company_id', 'deleted_at'], 'tax_statuses_company_deleted_idx');

            $table->dropUnique('tax_statuses_code_unique');
            $table->dropIndex('tax_statuses_company_id_index');
            $table->dropIndex('tax_statuses_created_at_index');
            $table->dropIndex('tax_statuses_updated_at_index');
            $table->dropIndex('tax_statuses_deleted_at_index');
        });

        Schema::table('employees', function (Blueprint $table) {
            $table->unsignedTinyInteger('active_flag')
                ->nullable()
                ->virtualAs(self::ACTIVE_FLAG_EXPRESSION)
                ->after('deleted_at');

            $table->unique(['company_id', 'nik_ktp', 'active_flag'], 'employees_company_nik_active_unique');
            $table->index(['company_id', 'deleted_at'], 'employees_company_deleted_idx');

            $table->dropUnique('employees_nik_ktp_unique');
            $table->dropIndex('employees_company_id_index');
            $table->dropIndex('employees_created_at_index');
            $table->dropIndex('employees_updated_at_index');
            $table->dropIndex('employees_deleted_at_index');
            $table->dropIndex('employees_gender_index');
            $table->dropIndex('employees_religion_index');
        });

        // 3. Clean up remaining over-indexed tables
        Schema::table('companies', function (Blueprint $table) {
            $table->dropIndex('companies_created_at_index');
            $table->dropIndex('companies_updated_at_index');
            $table->dropIndex('companies_series_index');
        });

        Schema::table('expense_categories', function (Blueprint $table) {
            $table->index(['company_id', 'deleted_at'], 'expense_categories_company_deleted_idx');
            $table->dropIndex('expense_categories_company_id_index');
            $table->dropIndex('expense_categories_created_at_index');
            $table->dropIndex('expense_categories_updated_at_index');
            $table->dropIndex('expense_categories_deleted_at_index');
        });

        Schema::table('expense_types', function (Blueprint $table) {
            $table->index(['company_id', 'deleted_at'], 'expense_types_company_deleted_idx');
            $table->dropIndex('expense_types_company_id_index');
            $table->dropIndex('expense_types_created_at_index');
            $table->dropIndex('expense_types_updated_at_index');
            $table->dropIndex('expense_types_deleted_at_index');
        });
    }

    public function down(): void
    {
        Schema::table('expense_types', function (Blueprint $table) {
            $table->index('company_id', 'expense_types_company_id_index');
            $table->index('created_at', 'expense_types_created_at_index');
            $table->index('updated_at', 'expense_types_updated_at_index');
            $table->index('deleted_at', 'expense_types_deleted_at_index');
            $table->dropIndex('expense_types_company_deleted_idx');
        });

        Schema::table('expense_categories', function (Blueprint $table) {
            $table->index('company_id', 'expense_categories_company_id_index');
            $table->index('created_at', 'expense_categories_created_at_index');
            $table->index('updated_at', 'expense_categories_updated_at_index');
            $table->index('deleted_at', 'expense_categories_deleted_at_index');
            $table->dropIndex('expense_categories_company_deleted_idx');
        });

        Schema::table('companies', function (Blueprint $table) {
            $table->index('created_at', 'companies_created_at_index');
            $table->index('updated_at', 'companies_updated_at_index');
            $table->index('series', 'companies_series_index');
        });

        Schema::table('employees', function (Blueprint $table) {
            $table->index('company_id', 'employees_company_id_index');
            $table->unique('nik_ktp', 'employees_nik_ktp_unique');
            $table->index('created_at', 'employees_created_at_index');
            $table->index('updated_at', 'employees_updated_at_index');
            $table->index('deleted_at', 'employees_deleted_at_index');
            $table->index('gender', 'employees_gender_index');
            $table->index('religion', 'employees_religion_index');
            $table->dropIndex('employees_company_deleted_idx');
            $table->dropUnique('employees_company_nik_active_unique');
            $table->dropColumn('active_flag');
        });

        Schema::table('tax_statuses', function (Blueprint $table) {
            $table->index('company_id', 'tax_statuses_company_id_index');
            $table->unique('code', 'tax_statuses_code_unique');
            $table->index('created_at', 'tax_statuses_created_at_index');
            $table->index('updated_at', 'tax_statuses_updated_at_index');
            $table->index('deleted_at', 'tax_statuses_deleted_at_index');
            $table->dropIndex('tax_statuses_company_deleted_idx');
            $table->dropUnique('tax_statuses_company_code_active_unique');
            $table->dropColumn('active_flag');
        });

        Schema::table('employment_statuses', function (Blueprint $table) {
            $table->index('company_id', 'employment_statuses_company_id_index');
            $table->unique('code', 'employment_statuses_code_unique');
            $table->index('created_at', 'employment_statuses_created_at_index');
            $table->index('updated_at', 'employment_statuses_updated_at_index');
            $table->index('deleted_at', 'employment_statuses_deleted_at_index');
            $table->dropIndex('employment_statuses_company_deleted_idx');
            $table->dropUnique('employment_statuses_company_code_active_unique');
            $table->dropColumn('active_flag');
        });

        Schema::table('employee_positions', function (Blueprint $table) {
            $table->index('company_id', 'employee_positions_company_id_index');
            $table->unique('code', 'employee_positions_code_unique');
            $table->index('created_at', 'employee_positions_created_at_index');
            $table->index('updated_at', 'employee_positions_updated_at_index');
            $table->index('deleted_at', 'employee_positions_deleted_at_index');
            $table->dropIndex('employee_positions_company_deleted_idx');
            $table->dropUnique('employee_positions_company_code_active_unique');
            $table->dropColumn('active_flag');
        });

        Schema::table('employee_documents', function (Blueprint $table) {
            $table->index('employee_id', 'employee_documents_employee_id_index');
            $table->unique(
                ['employee_id', 'document_type', 'deleted_at'],
                'employee_documents_employee_id_document_type_deleted_at_unique'
            );
            $table->dropUnique('employee_documents_emp_type_active_unique');
            $table->dropColumn('active_flag');
            $table->index('created_at', 'employee_documents_created_at_index');
            $table->index('updated_at', 'employee_documents_updated_at_index');
            $table->index('deleted_at', 'employee_documents_deleted_at_index');
        });

        Schema::table('payroll_grades', function (Blueprint $table) {
            $table->index('company_id', 'payroll_grades_company_id_index');
            $table->unique(
                ['grade', 'sub_grade', 'deleted_at'],
                'payroll_grades_grade_sub_grade_deleted_at_unique'
            );
            $table->index('created_at', 'payroll_grades_created_at_index');
            $table->index('updated_at', 'payroll_grades_updated_at_index');
            $table->index('deleted_at', 'payroll_grades_deleted_at_index');
            $table->index('grade', 'payroll_grades_grade_index');
            $table->dropIndex('payroll_grades_company_deleted_idx');
            $table->dropUnique('payroll_grades_company_grade_sub_active_unique');
            $table->dropColumn('active_flag');

            $table->double('base_salary')->change();
            $table->double('position_allowance')->default(0)->change();
            $table->double('total_gross')->change();
            $table->double('bpjs_kesehatan_company')->change();
            $table->double('bpjs_kesehatan_employee')->change();
            $table->double('bpjs_ketenagakerjaan_company')->change();
            $table->double('bpjs_ketenagakerjaan_employee')->change();
            $table->double('net_employee_received')->change();
            $table->double('total_company_cost')->change();
        });

        Schema::table('expense_items', function (Blueprint $table) {
            $table->dropIndex('expense_items_company_deleted_idx');
            $table->dropForeign(['employee_id']);
            $table->index('amount', 'expense_items_amount_index');
            $table->index('created_at', 'expense_items_created_at_index');
            $table->index('updated_at', 'expense_items_updated_at_index');
            $table->index('deleted_at', 'expense_items_deleted_at_index');
            $table->double('amount')->change();
        });

        Schema::table('company_assets', function (Blueprint $table) {
            $table->dropIndex('company_assets_company_deleted_idx');
            $table->index('amount', 'company_assets_amount_index');
            $table->index('total_price', 'company_assets_total_price_index');
            $table->index('created_at', 'company_assets_created_at_index');
            $table->index('updated_at', 'company_assets_updated_at_index');
            $table->index('deleted_at', 'company_assets_deleted_at_index');
            $table->double('price_per_unit')->default(0)->change();
            $table->double('total_price')->default(0)->change();
        });

        Schema::table('capital_companies', function (Blueprint $table) {
            $table->index('company_id', 'capital_companies_company_id_index');
            $table->index('capital', 'capital_companies_capital_index');
            $table->index('created_at', 'capital_companies_created_at_index');
            $table->index('updated_at', 'capital_companies_updated_at_index');
            $table->index('deleted_at', 'capital_companies_deleted_at_index');
            $table->dropIndex('capital_companies_company_deleted_idx');
            $table->double('capital')->change();
        });
    }
};
