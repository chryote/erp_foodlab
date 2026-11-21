<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
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

        Schema::table('employees', function (Blueprint $table) {
            if (! Schema::hasColumn('employees', 'photo_url')) {
                $table->string('photo_url', 255)->nullable()->after('phone');
            }
            if (! Schema::hasColumn('employees', 'nik_ktp')) {
                $table->string('nik_ktp', 16)->nullable()->unique()->after('photo_url');
            }
            if (! Schema::hasColumn('employees', 'nickname')) {
                $table->string('nickname', 100)->nullable()->after('nik_ktp');
            }
            if (! Schema::hasColumn('employees', 'birth_place')) {
                $table->string('birth_place', 100)->nullable()->after('nickname');
            }
            if (! Schema::hasColumn('employees', 'birth_date')) {
                $table->date('birth_date')->nullable()->after('birth_place');
            }
            if (! Schema::hasColumn('employees', 'gender')) {
                $table->string('gender', 30)->nullable()->index()->after('birth_date');
            }
            if (! Schema::hasColumn('employees', 'religion')) {
                $table->string('religion', 30)->nullable()->index()->after('gender');
            }
            if (! Schema::hasColumn('employees', 'blood_type')) {
                $table->string('blood_type', 10)->nullable()->after('religion');
            }
            if (! Schema::hasColumn('employees', 'mother_name')) {
                $table->string('mother_name', 150)->nullable()->after('blood_type');
            }
            if (! Schema::hasColumn('employees', 'ktp_address')) {
                $table->text('ktp_address')->nullable()->after('mother_name');
            }
            if (! Schema::hasColumn('employees', 'domicile_address')) {
                $table->text('domicile_address')->nullable()->after('ktp_address');
            }
            if (! Schema::hasColumn('employees', 'whatsapp_number')) {
                $table->string('whatsapp_number', 30)->nullable()->after('domicile_address');
            }
            if (! Schema::hasColumn('employees', 'emergency_phone_number')) {
                $table->string('emergency_phone_number', 30)->nullable()->after('whatsapp_number');
            }
            if (! Schema::hasColumn('employees', 'instagram')) {
                $table->string('instagram', 100)->nullable()->after('emergency_phone_number');
            }
            if (! Schema::hasColumn('employees', 'tiktok')) {
                $table->string('tiktok', 100)->nullable()->after('instagram');
            }
            if (! Schema::hasColumn('employees', 'bpjs_ketenagakerjaan')) {
                $table->string('bpjs_ketenagakerjaan', 50)->nullable()->after('tiktok');
            }
            if (! Schema::hasColumn('employees', 'bpjs_kesehatan')) {
                $table->string('bpjs_kesehatan', 50)->nullable()->after('bpjs_ketenagakerjaan');
            }
            if (! Schema::hasColumn('employees', 'npwp_number')) {
                $table->string('npwp_number', 30)->nullable()->after('bpjs_kesehatan');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (! Schema::hasTable('employees')) {
            return;
        }

        Schema::table('employees', function (Blueprint $table) {
            if (Schema::hasColumn('employees', 'nik_ktp')) {
                $table->dropUnique(['nik_ktp']);
            }
            if (Schema::hasColumn('employees', 'gender')) {
                $table->dropIndex(['gender']);
            }
            if (Schema::hasColumn('employees', 'religion')) {
                $table->dropIndex(['religion']);
            }

            $columns = array_values(array_filter([
                'photo_url',
                'nik_ktp',
                'nickname',
                'birth_place',
                'birth_date',
                'gender',
                'religion',
                'blood_type',
                'mother_name',
                'ktp_address',
                'domicile_address',
                'whatsapp_number',
                'emergency_phone_number',
                'instagram',
                'tiktok',
                'bpjs_ketenagakerjaan',
                'bpjs_kesehatan',
                'npwp_number',
            ], fn (string $column): bool => Schema::hasColumn('employees', $column)));

            if ($columns !== []) {
                $table->dropColumn($columns);
            }
        });
    }
};
