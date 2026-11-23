<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $this->deduplicateCodeAndName('employee_positions', 'employee_position_id', ['employees', 'payroll_items']);
        $this->deduplicateCodeAndName('employment_statuses', 'employment_status_id', ['employees']);
        $this->deduplicateCodeAndName('tax_statuses', 'tax_status_id', ['employees']);
        $this->deduplicatePayrollGrades();

        Schema::table('employee_positions', function (Blueprint $table) {
            $table->dropForeign(['company_id']);
            $table->dropUnique('employee_positions_company_code_active_unique');
            $table->dropUnique('employee_positions_company_name_active_unique');
            $table->dropIndex('employee_positions_comp_del_name_id_idx');
            $table->dropColumn('company_id');

            $table->unique(['code', 'active_flag'], 'employee_positions_code_active_unique');
            $table->unique(['name', 'active_flag'], 'employee_positions_name_active_unique');
        });

        Schema::table('employment_statuses', function (Blueprint $table) {
            $table->dropForeign(['company_id']);
            $table->dropUnique('employment_statuses_company_code_active_unique');
            $table->dropUnique('employment_statuses_company_name_active_unique');
            $table->dropIndex('employment_statuses_comp_del_name_id_idx');
            $table->dropColumn('company_id');

            $table->unique(['code', 'active_flag'], 'employment_statuses_code_active_unique');
            $table->unique(['name', 'active_flag'], 'employment_statuses_name_active_unique');
        });

        Schema::table('payroll_grades', function (Blueprint $table) {
            $table->dropForeign(['company_id']);
            $table->dropUnique('payroll_grades_company_grade_sub_active_unique');
            $table->dropIndex('payroll_grades_comp_del_grade_sub_idx');
            $table->dropColumn('company_id');

            $table->unique(['grade', 'sub_grade', 'active_flag'], 'payroll_grades_grade_sub_active_unique');
        });

        Schema::table('tax_statuses', function (Blueprint $table) {
            $table->dropForeign(['company_id']);
            $table->dropUnique('tax_statuses_company_code_active_unique');
            $table->dropUnique('tax_statuses_company_name_active_unique');
            $table->dropIndex('tax_statuses_comp_del_code_id_idx');
            $table->dropColumn('company_id');

            $table->unique(['code', 'active_flag'], 'tax_statuses_code_active_unique');
            $table->unique(['name', 'active_flag'], 'tax_statuses_name_active_unique');
        });
    }

    public function down(): void
    {
        $defaultCompanyId = DB::table('companies')->whereNull('deleted_at')->orderBy('id')->value('id');

        Schema::table('tax_statuses', function (Blueprint $table) {
            $table->dropUnique('tax_statuses_code_active_unique');
            $table->dropUnique('tax_statuses_name_active_unique');
            $table->foreignId('company_id')->nullable()->after('id')->constrained('companies')->restrictOnDelete();
        });
        if ($defaultCompanyId !== null) {
            DB::table('tax_statuses')->whereNull('company_id')->update(['company_id' => $defaultCompanyId]);
        }
        Schema::table('tax_statuses', function (Blueprint $table) {
            $table->unique(['company_id', 'code', 'active_flag'], 'tax_statuses_company_code_active_unique');
            $table->unique(['company_id', 'name', 'active_flag'], 'tax_statuses_company_name_active_unique');
            $table->index(['company_id', 'deleted_at', 'code', 'id'], 'tax_statuses_comp_del_code_id_idx');
        });

        Schema::table('payroll_grades', function (Blueprint $table) {
            $table->dropUnique('payroll_grades_grade_sub_active_unique');
            $table->foreignId('company_id')->nullable()->after('id')->constrained('companies')->restrictOnDelete();
        });
        if ($defaultCompanyId !== null) {
            DB::table('payroll_grades')->whereNull('company_id')->update(['company_id' => $defaultCompanyId]);
        }
        Schema::table('payroll_grades', function (Blueprint $table) {
            $table->unique(['company_id', 'grade', 'sub_grade', 'active_flag'], 'payroll_grades_company_grade_sub_active_unique');
            $table->index(['company_id', 'deleted_at', 'grade', 'sub_grade'], 'payroll_grades_comp_del_grade_sub_idx');
        });

        Schema::table('employment_statuses', function (Blueprint $table) {
            $table->dropUnique('employment_statuses_code_active_unique');
            $table->dropUnique('employment_statuses_name_active_unique');
            $table->foreignId('company_id')->nullable()->after('id')->constrained('companies')->restrictOnDelete();
        });
        if ($defaultCompanyId !== null) {
            DB::table('employment_statuses')->whereNull('company_id')->update(['company_id' => $defaultCompanyId]);
        }
        Schema::table('employment_statuses', function (Blueprint $table) {
            $table->unique(['company_id', 'code', 'active_flag'], 'employment_statuses_company_code_active_unique');
            $table->unique(['company_id', 'name', 'active_flag'], 'employment_statuses_company_name_active_unique');
            $table->index(['company_id', 'deleted_at', 'name', 'id'], 'employment_statuses_comp_del_name_id_idx');
        });

        Schema::table('employee_positions', function (Blueprint $table) {
            $table->dropUnique('employee_positions_code_active_unique');
            $table->dropUnique('employee_positions_name_active_unique');
            $table->foreignId('company_id')->nullable()->after('id')->constrained('companies')->restrictOnDelete();
        });
        if ($defaultCompanyId !== null) {
            DB::table('employee_positions')->whereNull('company_id')->update(['company_id' => $defaultCompanyId]);
        }
        Schema::table('employee_positions', function (Blueprint $table) {
            $table->unique(['company_id', 'code', 'active_flag'], 'employee_positions_company_code_active_unique');
            $table->unique(['company_id', 'name', 'active_flag'], 'employee_positions_company_name_active_unique');
            $table->index(['company_id', 'deleted_at', 'name', 'id'], 'employee_positions_comp_del_name_id_idx');
        });
    }

    /**
     * @param  list<string>  $referencingTables
     */
    private function deduplicateCodeAndName(string $table, string $foreignKey, array $referencingTables): void
    {
        $rows = DB::table($table)
            ->whereNull('deleted_at')
            ->orderBy('id')
            ->get(['id', 'code', 'name']);

        $seenCodes = [];
        $seenNames = [];
        $now = now();

        foreach ($rows as $row) {
            $id = (int) $row->id;
            $codeNorm = $this->normalizeKey($row->code);
            $nameNorm = $this->normalizeKey($row->name);

            $keepId = null;
            if ($codeNorm !== '' && array_key_exists($codeNorm, $seenCodes)) {
                $keepId = $seenCodes[$codeNorm];
            } elseif ($nameNorm !== '' && array_key_exists($nameNorm, $seenNames)) {
                $keepId = $seenNames[$nameNorm];
            }

            if ($keepId !== null) {
                foreach ($referencingTables as $refTable) {
                    DB::table($refTable)
                        ->where($foreignKey, $id)
                        ->update([$foreignKey => $keepId]);
                }

                DB::table($table)
                    ->where('id', $id)
                    ->update(['deleted_at' => $now, 'updated_at' => $now]);

                continue;
            }

            if ($codeNorm !== '') {
                $seenCodes[$codeNorm] = $id;
            }
            if ($nameNorm !== '') {
                $seenNames[$nameNorm] = $id;
            }
        }
    }

    private function deduplicatePayrollGrades(): void
    {
        $rows = DB::table('payroll_grades')
            ->whereNull('deleted_at')
            ->orderBy('id')
            ->get(['id', 'grade', 'sub_grade']);

        $seen = [];
        $now = now();

        foreach ($rows as $row) {
            $id = (int) $row->id;
            $key = (int) $row->grade.'|'.$this->normalizeKey($row->sub_grade);

            if (! array_key_exists($key, $seen)) {
                $seen[$key] = $id;

                continue;
            }

            $keepId = $seen[$key];
            DB::table('employees')
                ->where('payroll_grade_id', $id)
                ->update(['payroll_grade_id' => $keepId]);

            DB::table('payroll_grades')
                ->where('id', $id)
                ->update(['deleted_at' => $now, 'updated_at' => $now]);
        }
    }

    private function normalizeKey(mixed $value): string
    {
        if ($value === null) {
            return '';
        }

        $trimmed = trim((string) $value);
        if ($trimmed === '') {
            return '';
        }

        $collapsed = preg_replace('/\s+/u', ' ', $trimmed) ?? $trimmed;

        return mb_strtolower($collapsed, 'UTF-8');
    }
};
