<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Schema;
use Laravel\Scout\EngineManager;
use Throwable;

class ScoutBootstrapCommand extends Command
{
    protected $signature = 'scout:bootstrap {--force-import : Re-import all Searchable models even if their Meilisearch index already has documents}';

    protected $description = 'Sync Meilisearch index settings and import any Searchable models whose index is currently empty';

    public function handle(EngineManager $manager): int
    {
        if (config('scout.driver') !== 'meilisearch') {
            $this->info('Scout driver is not set to meilisearch; skipping Scout bootstrap.');

            return self::SUCCESS;
        }

        $this->call('scout:sync-index-settings');

        $engine = $manager->engine('meilisearch');
        $indexSettings = (array) config('scout.meilisearch.index-settings', []);
        $forceImport = (bool) $this->option('force-import');
        $originalQueue = config('scout.queue');

        try {
            config(['scout.queue' => false]);

            foreach (array_keys($indexSettings) as $modelClass) {
                if (! is_string($modelClass) || ! class_exists($modelClass)) {
                    continue;
                }

                $model = new $modelClass;

                if (! Schema::hasTable($model->getTable())) {
                    $this->line("Skipping [{$modelClass}] import: table [{$model->getTable()}] does not exist yet.");

                    continue;
                }

                $indexName = $model->indexableAs();
                $docCount = 0;

                if (! $forceImport) {
                    try {
                        $stats = $engine->index($indexName)->stats();
                        $docCount = (int) ($stats['numberOfDocuments'] ?? 0);
                    } catch (Throwable) {
                        $docCount = 0;
                    }
                }

                if (! $forceImport && $docCount > 0) {
                    $this->line("Index [{$indexName}] already has {$docCount} documents; skipping import.");

                    continue;
                }

                if (! $modelClass::query()->exists()) {
                    $this->line("Table [{$model->getTable()}] is empty; skipping import.");

                    continue;
                }

                $this->call('scout:import', ['model' => $modelClass]);
            }
        } finally {
            config(['scout.queue' => $originalQueue]);
        }

        return self::SUCCESS;
    }
}
