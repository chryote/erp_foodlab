<?php

namespace App\Modules\CPO\Services;

use Illuminate\Support\Facades\Cache;

class CpoService
{
    public const CACHE_KEY = 'erp_foodlab:module:cpo';

    public function getOverview(): array
    {
        return Cache::remember(self::CACHE_KEY, 60, fn () => [
            'code' => 'CPO',
            'title' => 'CPO (Persediaan Barang Dagang)',
            'subtitle' => 'Kontrol Stok Gudang, Batch Bahan Pangan, Reagen Lab & Cold Storage',
            'status' => 'active',
            'primary_kpi' => [
                'label' => 'Total SKU Tersedia',
                'value' => '1.284 SKU',
                'trend' => '99.2% Akurasi Stok',
            ],
            'highlights' => [
                ['label' => 'Nilai Persediaan Gudang', 'value' => 'Rp 890.000.000'],
                ['label' => 'Batch Lulus Uji QC', 'value' => '312 Batch'],
                ['label' => 'Peringatan Reorder (ROP)', 'value' => '4 Item'],
            ],
            'recent_items' => [
                ['id' => 'STK-CPO-201', 'name' => 'Susu Segar Pasteurisasi Batch A12', 'status' => 'In Stock'],
                ['id' => 'STK-CPO-202', 'name' => 'Minyak Zaitun Cold-Pressed 500ml', 'status' => 'In Stock'],
                ['id' => 'STK-CPO-203', 'name' => 'Kultur Starter Fermentasi Laktat', 'status' => 'Low Stock'],
            ],
        ]);
    }
}
