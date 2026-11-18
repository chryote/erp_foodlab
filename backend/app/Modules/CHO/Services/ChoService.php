<?php

namespace App\Modules\CHO\Services;

use Illuminate\Support\Facades\Cache;

class ChoService
{
    public const CACHE_KEY = 'erp_foodlab:module:cho';

    public function getOverview(): array
    {
        return Cache::remember(self::CACHE_KEY, 60, fn () => [
            'code' => 'CHO',
            'title' => 'CHO (SDM)',
            'subtitle' => 'Sumber Daya Manusia, Kehadiran, Payroll & KPI Analis Lab',
            'status' => 'active',
            'primary_kpi' => [
                'label' => 'Total Karyawan Aktif',
                'value' => '148 Personel',
                'trend' => '98.6% Hadir',
            ],
            'highlights' => [
                ['label' => 'Analis Laboratorium', 'value' => '42 Staf'],
                ['label' => 'Operator Produksi & QC', 'value' => '76 Staf'],
                ['label' => 'Pelatihan ISO 17025', 'value' => '100% Lulus'],
            ],
            'recent_items' => [
                ['id' => 'HR-CHO-101', 'name' => 'Sertifikasi Analis Mikrobiologi Pangan', 'status' => 'Completed'],
                ['id' => 'HR-CHO-102', 'name' => 'Rekrutmen Supervisor Quality Assurance', 'status' => 'Interview'],
                ['id' => 'HR-CHO-103', 'name' => 'Evaluasi KPI Semester II', 'status' => 'Active'],
            ],
        ]);
    }
}
