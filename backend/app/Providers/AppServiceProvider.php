<?php

namespace App\Providers;

use App\Models\User;
use App\Support\ActiveCompany;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        require_once app_path('Support/helpers.php');

        $this->app->bind('active_company', static fn () => ActiveCompany::get());
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Gate::define('viewApiDocs', fn (?User $user = null) => app()->environment(['local', 'testing']));
    }
}
