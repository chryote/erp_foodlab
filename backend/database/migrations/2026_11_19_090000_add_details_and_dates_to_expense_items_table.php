<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('expense_items')) {
            return;
        }

        Schema::table('expense_items', function (Blueprint $table) {
            if (! Schema::hasColumn('expense_items', 'purchased_on')) {
                $table->date('purchased_on')->nullable()->after('amount')->index();
            }
            if (! Schema::hasColumn('expense_items', 'closing_date')) {
                $table->date('closing_date')->nullable()->after('purchased_on')->index();
            }
            if (! Schema::hasColumn('expense_items', 'employee_id')) {
                $table->unsignedBigInteger('employee_id')->nullable()->after('closing_date')->index();
            }
            if (! Schema::hasColumn('expense_items', 'detail')) {
                $table->string('detail', 500)->nullable()->after('employee_id');
            }
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('expense_items')) {
            return;
        }

        Schema::table('expense_items', function (Blueprint $table) {
            if (Schema::hasColumn('expense_items', 'detail')) {
                $table->dropColumn('detail');
            }
            if (Schema::hasColumn('expense_items', 'employee_id')) {
                $table->dropIndex(['employee_id']);
                $table->dropColumn('employee_id');
            }
            if (Schema::hasColumn('expense_items', 'closing_date')) {
                $table->dropIndex(['closing_date']);
                $table->dropColumn('closing_date');
            }
            if (Schema::hasColumn('expense_items', 'purchased_on')) {
                $table->dropIndex(['purchased_on']);
                $table->dropColumn('purchased_on');
            }
        });
    }
};
