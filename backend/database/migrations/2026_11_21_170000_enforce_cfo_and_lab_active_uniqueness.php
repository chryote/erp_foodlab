<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    private const ACTIVE_FLAG_EXPRESSION = 'CASE WHEN deleted_at IS NULL THEN 1 ELSE NULL END';

    /**
     * Tables referencing companies.id via company_id.
     *
     * @var array<int, string>
     */
    private const COMPANY_CHILD_TABLES = [
        'capital_companies',
        'company_assets',
        'expense_categories',
        'expense_types',
        'expense_items',
        'employee_positions',
        'employment_statuses',
        'payroll_grades',
        'tax_statuses',
        'employees',
        'employee_shifts',
        'employee_shift_assignments',
        'employee_attendances',
    ];

    public function up(): void
    {
        $this->deduplicateActiveCompanies();
        $this->deduplicateActiveCapitalCompanies();
        $this->deduplicateActiveExpenseCategories();
        $this->deduplicateActiveExpenseTypes();
        $this->deduplicateActiveLabSamples();

        Schema::table('companies', function (Blueprint $table) {
            $table->unsignedTinyInteger('active_flag')
                ->nullable()
                ->virtualAs(self::ACTIVE_FLAG_EXPRESSION)
                ->after('deleted_at');

            $table->unique(
                ['name', 'series', 'active_flag'],
                'companies_name_series_active_unique'
            );
        });

        Schema::table('capital_companies', function (Blueprint $table) {
            $table->unsignedTinyInteger('active_flag')
                ->nullable()
                ->virtualAs(self::ACTIVE_FLAG_EXPRESSION)
                ->after('deleted_at');

            $table->unique(
                ['company_id', 'stakeholder_name', 'active_flag'],
                'capital_companies_company_stakeholder_active_unique'
            );
        });

        Schema::table('expense_categories', function (Blueprint $table) {
            $table->unsignedTinyInteger('active_flag')
                ->nullable()
                ->virtualAs(self::ACTIVE_FLAG_EXPRESSION)
                ->after('deleted_at');

            $table->unique(
                ['company_id', 'name', 'active_flag'],
                'expense_categories_company_name_active_unique'
            );
        });

        Schema::table('expense_types', function (Blueprint $table) {
            $table->unsignedTinyInteger('active_flag')
                ->nullable()
                ->virtualAs(self::ACTIVE_FLAG_EXPRESSION)
                ->after('deleted_at');

            $table->unique(
                ['company_id', 'expense_category_id', 'name', 'active_flag'],
                'expense_types_company_cat_name_active_unique'
            );
        });

        Schema::table('lab_samples', function (Blueprint $table) {
            $table->unsignedTinyInteger('active_flag')
                ->nullable()
                ->virtualAs(self::ACTIVE_FLAG_EXPRESSION)
                ->after('deleted_at');

            $table->unique(['batch_code', 'active_flag'], 'lab_samples_batch_code_active_unique');
            $table->dropUnique('lab_samples_batch_code_unique');
        });
    }

    public function down(): void
    {
        Schema::table('lab_samples', function (Blueprint $table) {
            $table->unique('batch_code', 'lab_samples_batch_code_unique');
            $table->dropUnique('lab_samples_batch_code_active_unique');
            $table->dropColumn('active_flag');
        });

        Schema::table('expense_types', function (Blueprint $table) {
            $table->dropUnique('expense_types_company_cat_name_active_unique');
            $table->dropColumn('active_flag');
        });

        Schema::table('expense_categories', function (Blueprint $table) {
            $table->dropUnique('expense_categories_company_name_active_unique');
            $table->dropColumn('active_flag');
        });

        Schema::table('capital_companies', function (Blueprint $table) {
            $table->dropUnique('capital_companies_company_stakeholder_active_unique');
            $table->dropColumn('active_flag');
        });

        Schema::table('companies', function (Blueprint $table) {
            $table->dropUnique('companies_name_series_active_unique');
            $table->dropColumn('active_flag');
        });
    }

    private function deduplicateActiveCompanies(): void
    {
        $rows = DB::table('companies')
            ->whereNull('deleted_at')
            ->orderBy('id')
            ->get(['id', 'name', 'series']);

        $seen = [];
        $now = now();

        foreach ($rows as $row) {
            $key = mb_strtolower($this->normalizeText((string) $row->name), 'UTF-8').'|'.(int) $row->series;

            if (! array_key_exists($key, $seen)) {
                $seen[$key] = (int) $row->id;

                continue;
            }

            $keepId = $seen[$key];
            $dupId = (int) $row->id;

            foreach (self::COMPANY_CHILD_TABLES as $childTable) {
                if (Schema::hasTable($childTable)) {
                    DB::table($childTable)
                        ->where('company_id', $dupId)
                        ->update(['company_id' => $keepId]);
                }
            }

            DB::table('companies')
                ->where('id', $dupId)
                ->update(['deleted_at' => $now, 'updated_at' => $now]);
        }
    }

    private function deduplicateActiveCapitalCompanies(): void
    {
        $rows = DB::table('capital_companies')
            ->whereNull('deleted_at')
            ->orderBy('id')
            ->get(['id', 'company_id', 'stakeholder_name']);

        $seen = [];
        $now = now();

        foreach ($rows as $row) {
            $key = (int) $row->company_id.'|'.mb_strtolower($this->normalizeText((string) $row->stakeholder_name), 'UTF-8');

            if (! array_key_exists($key, $seen)) {
                $seen[$key] = (int) $row->id;

                continue;
            }

            DB::table('capital_companies')
                ->where('id', (int) $row->id)
                ->update(['deleted_at' => $now, 'updated_at' => $now]);
        }
    }

    private function deduplicateActiveExpenseCategories(): void
    {
        $rows = DB::table('expense_categories')
            ->whereNull('deleted_at')
            ->orderBy('id')
            ->get(['id', 'company_id', 'name']);

        $seen = [];
        $now = now();

        foreach ($rows as $row) {
            $key = (string) ($row->company_id ?? 'null').'|'.mb_strtolower($this->normalizeText((string) $row->name), 'UTF-8');

            if (! array_key_exists($key, $seen)) {
                $seen[$key] = (int) $row->id;

                continue;
            }

            $keepId = $seen[$key];
            $dupId = (int) $row->id;

            DB::table('expense_types')
                ->where('expense_category_id', $dupId)
                ->update(['expense_category_id' => $keepId]);

            DB::table('expense_items')
                ->where('expense_category_id', $dupId)
                ->update(['expense_category_id' => $keepId]);

            DB::table('expense_categories')
                ->where('id', $dupId)
                ->update(['deleted_at' => $now, 'updated_at' => $now]);
        }
    }

    private function deduplicateActiveExpenseTypes(): void
    {
        $rows = DB::table('expense_types')
            ->whereNull('deleted_at')
            ->orderBy('id')
            ->get(['id', 'company_id', 'expense_category_id', 'name']);

        $seen = [];
        $now = now();

        foreach ($rows as $row) {
            $key = (string) ($row->company_id ?? 'null').'|'.(int) $row->expense_category_id.'|'.mb_strtolower($this->normalizeText((string) $row->name), 'UTF-8');

            if (! array_key_exists($key, $seen)) {
                $seen[$key] = (int) $row->id;

                continue;
            }

            $keepId = $seen[$key];
            $dupId = (int) $row->id;

            DB::table('expense_items')
                ->where('expense_type_id', $dupId)
                ->update(['expense_type_id' => $keepId]);

            DB::table('expense_types')
                ->where('id', $dupId)
                ->update(['deleted_at' => $now, 'updated_at' => $now]);
        }
    }

    private function deduplicateActiveLabSamples(): void
    {
        $rows = DB::table('lab_samples')
            ->whereNull('deleted_at')
            ->orderBy('id')
            ->get(['id', 'batch_code']);

        $seen = [];
        $now = now();

        foreach ($rows as $row) {
            $key = mb_strtolower($this->normalizeText((string) $row->batch_code), 'UTF-8');

            if (! array_key_exists($key, $seen)) {
                $seen[$key] = (int) $row->id;

                continue;
            }

            DB::table('lab_samples')
                ->where('id', (int) $row->id)
                ->update(['deleted_at' => $now, 'updated_at' => $now]);
        }
    }

    private function normalizeText(string $value): string
    {
        $trimmed = trim($value);

        return preg_replace('/\s+/u', ' ', $trimmed) ?? $trimmed;
    }
};
