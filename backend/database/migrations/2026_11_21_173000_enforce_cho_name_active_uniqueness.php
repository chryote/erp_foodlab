<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $this->deduplicateByCompanyAndName('employee_positions', 'employee_position_id');
        $this->deduplicateByCompanyAndName('employment_statuses', 'employment_status_id');
        $this->deduplicateByCompanyAndName('tax_statuses', 'tax_status_id');

        Schema::table('employee_positions', function (Blueprint $table) {
            $table->unique(
                ['company_id', 'name', 'active_flag'],
                'employee_positions_company_name_active_unique'
            );
        });

        Schema::table('employment_statuses', function (Blueprint $table) {
            $table->unique(
                ['company_id', 'name', 'active_flag'],
                'employment_statuses_company_name_active_unique'
            );
        });

        Schema::table('tax_statuses', function (Blueprint $table) {
            $table->unique(
                ['company_id', 'name', 'active_flag'],
                'tax_statuses_company_name_active_unique'
            );
        });
    }

    public function down(): void
    {
        Schema::table('tax_statuses', function (Blueprint $table) {
            $table->dropUnique('tax_statuses_company_name_active_unique');
        });

        Schema::table('employment_statuses', function (Blueprint $table) {
            $table->dropUnique('employment_statuses_company_name_active_unique');
        });

        Schema::table('employee_positions', function (Blueprint $table) {
            $table->dropUnique('employee_positions_company_name_active_unique');
        });
    }

    private function deduplicateByCompanyAndName(string $table, string $employeeForeignKey): void
    {
        $rows = DB::table($table)
            ->whereNull('deleted_at')
            ->orderBy('id')
            ->get(['id', 'company_id', 'name']);

        $seen = [];
        $now = now();

        foreach ($rows as $row) {
            $trimmed = trim((string) $row->name);
            $normalized = preg_replace('/\s+/u', ' ', $trimmed) ?? $trimmed;
            $key = (int) $row->company_id.'|'.mb_strtolower($normalized, 'UTF-8');

            if (! array_key_exists($key, $seen)) {
                $seen[$key] = (int) $row->id;

                continue;
            }

            $keepId = $seen[$key];
            $dupId = (int) $row->id;

            DB::table('employees')
                ->where($employeeForeignKey, $dupId)
                ->update([$employeeForeignKey => $keepId]);

            DB::table($table)
                ->where('id', $dupId)
                ->update(['deleted_at' => $now, 'updated_at' => $now]);
        }
    }
};
