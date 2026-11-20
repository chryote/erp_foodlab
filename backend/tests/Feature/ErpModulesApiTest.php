<?php

use Illuminate\Support\Facades\Cache;

describe('ERP Modules API (/api/v1/modules)', function () {
    beforeEach(function () {
        Cache::flush();
        actingAsErpUser();
    });

    it('returns all 5 ERP modules on the main menu endpoint', function () {
        $response = $this->getJson('/api/v1/modules');

        $response->assertOk()
            ->assertJsonCount(5, 'data')
            ->assertJsonPath('data.0.code', 'CFO')
            ->assertJsonPath('data.0.title', 'CFO (Keuangan)')
            ->assertJsonPath('data.1.code', 'CHO')
            ->assertJsonPath('data.1.title', 'CHO (SDM)')
            ->assertJsonPath('data.2.code', 'CPO')
            ->assertJsonPath('data.2.title', 'CPO (Persediaan Barang Dagang)')
            ->assertJsonPath('data.3.code', 'CDO')
            ->assertJsonPath('data.3.title', 'CDO (Pemasaran)')
            ->assertJsonPath('data.4.code', 'CMO')
            ->assertJsonPath('data.4.title', 'CMO (Penjualan)');
    });

    it('serves individual module endpoints from their dedicated module folders', function (string $slug, string $code, string $title) {
        $response = $this->getJson("/api/v1/modules/{$slug}");

        $response->assertOk()
            ->assertJsonPath('data.code', $code)
            ->assertJsonPath('data.title', $title);
    })->with([
        ['cfo', 'CFO', 'CFO (Keuangan)'],
        ['cho', 'CHO', 'CHO (SDM)'],
        ['cpo', 'CPO', 'CPO (Persediaan Barang Dagang)'],
        ['cdo', 'CDO', 'CDO (Pemasaran)'],
        ['cmo', 'CMO', 'CMO (Penjualan)'],
    ]);
});
