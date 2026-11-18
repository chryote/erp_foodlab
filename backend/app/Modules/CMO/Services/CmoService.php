<?php

namespace App\Modules\CMO\Services;

use Illuminate\Support\Facades\Cache;

class CmoService
{
    public const CACHE_KEY = 'erp_foodlab:module:cmo';

    public function getOverview(): array
    {
        return Cache::remember(self::CACHE_KEY, 60, fn () => [
            'code' => 'CMO',
            'title' => 'CMO (Penjualan)',
            'subtitle' => 'Pesanan Penjualan (Sales Order), Distribusi Ritel, Kontrak & Target Omzet',
            'status' => 'active',
            'primary_kpi' => [
                'label' => 'Total Penjualan Bulan Ini',
                'value' => 'Rp 2.180.000.000',
                'trend' => '104.2% dari Target',
            ],
            'highlights' => [
                ['label' => 'Sales Order Selesai', 'value' => '486 Pesanan'],
                ['label' => 'Mitra Distributor Aktif', 'value' => '94 Mitra'],
                ['label' => 'Tingkat Pengiriman Tepat Waktu', 'value' => '97.8%'],
            ],
            'recent_items' => [
                ['id' => 'SO-CMO-401', 'name' => 'PO Distributor Ritel Jabodetabek', 'status' => 'Delivered'],
                ['id' => 'SO-CMO-402', 'name' => 'Kontrak Suplai Hotel & Restoran Bintang 5', 'status' => 'Processing'],
                ['id' => 'SO-CMO-403', 'name' => 'Ekspor Produk Fermentasi Batch Q4', 'status' => 'Approved'],
            ],
        ]);
    }
}
