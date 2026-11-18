<?php

namespace App\Modules\CFO\Services;

use Illuminate\Support\Facades\Cache;

class CfoService
{
    public const CACHE_KEY = 'erp_foodlab:module:cfo';

    public function getOverview(): array
    {
        return Cache::remember(self::CACHE_KEY, 60, fn () => [
            'code' => 'CFO',
            'title' => 'CFO (Keuangan)',
            'subtitle' => 'Manajemen Keuangan, Arus Kas, Buku Besar & Anggaran',
            'status' => 'active',
            'primary_kpi' => [
                'label' => 'Kas & Setara Kas Bulan Ini',
                'value' => 'Rp 1.450.000.000',
                'trend' => '+12.4%',
            ],
            'highlights' => [
                ['label' => 'Piutang Usaha (AR)', 'value' => 'Rp 320.500.000'],
                ['label' => 'Utang Dagang (AP)', 'value' => 'Rp 185.000.000'],
                ['label' => 'Margin Laba Bersih', 'value' => '21.8%'],
            ],
            'recent_items' => [
                ['id' => 'INV-CFO-001', 'name' => 'Jurnal Penutupan Bulanan FoodLab', 'status' => 'Verified'],
                ['id' => 'INV-CFO-002', 'name' => 'Pembayaran Bahan Baku Dairy', 'status' => 'Paid'],
                ['id' => 'INV-CFO-003', 'name' => 'Audit Pajak PPN Kuartal IV', 'status' => 'In Review'],
            ],
        ]);
    }
}
