<?php

return [
    'enabled' => (bool) env('PROMETHEUS_ENABLED', true),
    'namespace' => env('PROMETHEUS_NAMESPACE', 'erp_foodlab'),
    'sample_list_cache_ttl' => (int) env('SAMPLE_LIST_CACHE_TTL', 60),
];
