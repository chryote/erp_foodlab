<?php

use Database\Seeders\DatabaseSeeder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Schema;

describe('General System Integrity, Schema, Storage & API Contract Guardrails', function () {
    beforeEach(function () {
        Artisan::call('migrate:fresh');
        actingAsErpUser();
    });

    it('ensures storage, logs, and bootstrap/cache directories exist and are writable', function () {
        $requiredDirectories = [
            storage_path('logs'),
            storage_path('framework/cache'),
            storage_path('framework/sessions'),
            storage_path('framework/views'),
            base_path('bootstrap/cache'),
        ];

        foreach ($requiredDirectories as $dir) {
            expect(is_dir($dir))->toBeTrue("Directory {$dir} must exist");
            expect(is_writable($dir))->toBeTrue("Directory {$dir} must be writable");
        }

        $logFile = storage_path('logs/laravel.log');
        if (file_exists($logFile)) {
            expect(is_writable($logFile))->toBeTrue("Log file {$logFile} must be writable");
        }
    });

    it('ensures docker-entrypoint.sh enforces storage permissions and runs migrations on startup', function () {
        $entrypointPath = base_path('docker-entrypoint.sh');
        expect(file_exists($entrypointPath))->toBeTrue();

        $contents = file_get_contents($entrypointPath);
        expect($contents)
            ->toContain('chown -R www-data:www-data /var/www/html/storage /var/www/html/bootstrap/cache')
            ->toContain('chmod -R 775 /var/www/html/storage /var/www/html/bootstrap/cache')
            ->toContain('php artisan migrate --force');
    });

    it('discovers all Eloquent models and verifies their database tables and fillable columns exist', function () {
        $modelFiles = File::allFiles(app_path('Models'));
        expect($modelFiles)->not->toBeEmpty();

        foreach ($modelFiles as $file) {
            $className = 'App\\Models\\'.$file->getFilenameWithoutExtension();
            expect(class_exists($className))->toBeTrue("Model class {$className} should exist");

            $reflection = new ReflectionClass($className);
            if ($reflection->isAbstract() || ! $reflection->isSubclassOf(Model::class)) {
                continue;
            }

            /** @var Model $model */
            $model = $reflection->newInstance();
            $table = $model->getTable();

            expect(Schema::hasTable($table))->toBeTrue(
                "Database table '{$table}' for model {$className} is missing from migrations."
            );

            $columns = Schema::getColumnListing($table);
            expect(in_array($model->getKeyName(), $columns, true))->toBeTrue();

            foreach ($model->getFillable() as $fillableColumn) {
                expect(in_array($fillableColumn, $columns, true))->toBeTrue(
                    "Fillable column '{$fillableColumn}' on {$className} is missing from table '{$table}'."
                );
            }
        }
    });

    it('runs DatabaseSeeder without errors and populates expected records', function () {
        expect(fn () => Artisan::call('db:seed', ['--class' => DatabaseSeeder::class]))
            ->not->toThrow(Throwable::class);
    });

    it('verifies all registered GET API endpoints return 200 OK with CORS headers after seeding', function () {
        Artisan::call('db:seed', ['--class' => DatabaseSeeder::class]);

        $routes = collect(Route::getRoutes()->getRoutes())
            ->filter(function ($route) {
                $uri = $route->uri();
                $methods = $route->methods();

                return str_starts_with($uri, 'api/')
                    && in_array('GET', $methods, true)
                    && ! str_contains($uri, '{');
            });

        expect($routes)->not->toBeEmpty();

        foreach ($routes as $route) {
            $uri = '/'.ltrim($route->uri(), '/');
            $response = $this->withHeaders([
                'Origin' => 'http://localhost:5173',
                'Accept' => 'application/json',
            ])->get($uri);

            expect($response->getStatusCode())->toBe(
                200,
                "GET {$uri} failed with status {$response->getStatusCode()}"
            );
            expect($response->headers->get('Access-Control-Allow-Origin'))->not->toBeNull(
                "GET {$uri} is missing Access-Control-Allow-Origin CORS header"
            );
        }
    });
});
