<?php

use App\Models\Employee;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (! Schema::hasTable('employees')) {
            return;
        }

        if (! Schema::hasColumn('employees', 'employee_attendance_code')) {
            Schema::table('employees', function (Blueprint $table) {
                $table->string('employee_attendance_code', 255)
                    ->nullable()
                    ->index('employees_employee_attendance_code_index')
                    ->after('npwp_number');
            });
        }

        $positionsById = DB::table('employee_positions')->pluck('name', 'id');

        DB::table('employees')
            ->select(['id', 'name', 'employee_position_id'])
            ->orderBy('id')
            ->chunkById(200, function ($rows) use ($positionsById): void {
                foreach ($rows as $row) {
                    $positionName = $row->employee_position_id !== null
                        ? ($positionsById[$row->employee_position_id] ?? null)
                        : null;

                    $code = Employee::formatAttendanceCode(
                        (int) $row->id,
                        (string) $row->name,
                        $positionName !== null ? (string) $positionName : null,
                    );

                    DB::table('employees')
                        ->where('id', $row->id)
                        ->update(['employee_attendance_code' => $code]);
                }
            });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (! Schema::hasTable('employees') || ! Schema::hasColumn('employees', 'employee_attendance_code')) {
            return;
        }

        Schema::table('employees', function (Blueprint $table) {
            $table->dropIndex('employees_employee_attendance_code_index');
            $table->dropColumn('employee_attendance_code');
        });
    }
};
