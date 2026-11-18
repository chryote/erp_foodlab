<?php

namespace App\Modules\CDO\Services;

use Illuminate\Support\Facades\Cache;

class CdoService
{
    public const CACHE_KEY = 'erp_foodlab:module:cdo';

    public function getOverview(): array
    {
        return Cache::remember(self::CACHE_KEY, 60, fn () => [
            'code' => 'CDO',
            'title' => 'CDO (Pemasaran)',
            'subtitle' => 'Kampanye Digital, Akuisisi Mitra B2B, Branding & Analitik Pasar',
            'status' => 'active',
            'primary_kpi' => [
                'label' => 'Prospek B2B Baru Bulan Ini',
                'value' => '340 Leads',
                'trend' => '+18.5% ROAS',
            ],
            'highlights' => [
                ['label' => 'Kampanye Aktif', 'value' => '12 Kampanye'],
                ['label' => 'Konversi MQL ke SQL', 'value' => '28.4%'],
                ['label' => 'Biaya Akuisisi (CAC)', 'value' => 'Rp 420.000'],
            ],
            'recent_items' => [
                ['id' => 'MKT-CDO-301', 'name' => 'Pameran Pangan sehat & Sertifikasi Halal', 'status' => 'Running'],
                ['id' => 'MKT-CDO-302', 'name' => 'Kampanye Katalog Produk Organik Q4', 'status' => 'Running'],
                ['id' => 'MKT-CDO-303', 'name' => 'Webinar Keamanan Pangan Industri', 'status' => 'Scheduled'],
            ],
        ]);
    }
}
