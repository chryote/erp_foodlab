<?php

use App\Http\Controllers\Concerns\RespondsWithApiList;
use App\Http\Controllers\Controller;
use App\Http\Controllers\HealthController;
use App\Http\Middleware\EnforceIdempotencyKey;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\ServiceProvider;

$modules = array_map(
    basename(...),
    glob(__DIR__.'/../../app/Modules/*', GLOB_ONLYDIR) ?: []
);
sort($modules);

$moduleControllers = array_map(fn (string $m) => "App\\Modules\\{$m}\\Controllers", $modules);
$moduleRequests = array_map(fn (string $m) => "App\\Modules\\{$m}\\Requests", $modules);
$moduleServices = array_map(fn (string $m) => "App\\Modules\\{$m}\\Services", $modules);
$moduleActions = array_map(fn (string $m) => "App\\Modules\\{$m}\\Actions", $modules);

$allControllers = ['App\Http\Controllers', ...$moduleControllers];
$allRequests = ['App\Http\Requests', ...$moduleRequests];
$allServices = ['App\Services', ...$moduleServices];

// =============================================================================
// 1. Presets & Dangerous Functions
// =============================================================================

arch()->preset()->php();

arch()->preset()->security()
    ->ignoring(EnforceIdempotencyKey::class); // Uses sha1() solely for compacting cache keys alongside sha256 payload hashes

arch('forbids env(), sleep(), and usleep() in application code')
    ->expect(['env', 'sleep', 'usleep'])
    ->not->toBeUsed();

// =============================================================================
// 2. Flat Entity Pattern (AGENTS.md Rule 1: No Repositories / DTOs / CQRS)
// =============================================================================

arch('enforces flat entity architecture with no Repositories, DTOs, or CQRS handlers')
    ->expect('App')
    ->not->toHaveSuffix('Repository');

arch('forbids DTO suffixes in App')
    ->expect('App')
    ->not->toHaveSuffix('Dto');

arch('forbids uppercase DTO suffixes in App')
    ->expect('App')
    ->not->toHaveSuffix('DTO');

arch('forbids CQRS QueryHandler suffixes in App')
    ->expect('App')
    ->not->toHaveSuffix('QueryHandler');

arch('forbids CQRS CommandHandler suffixes in App')
    ->expect('App')
    ->not->toHaveSuffix('CommandHandler');

// =============================================================================
// 3. Eloquent Models (AGENTS.md Rules 1, 3, 5)
// =============================================================================

arch('enforces Eloquent models live in App\Models, extend Model, use HasFactory, and omit Model suffix')
    ->expect('App\Models')
    ->classes()
    ->toExtend(Model::class)
    ->toUseTrait(HasFactory::class)
    ->not->toHaveSuffix('Model')
    ->not->toUse([
        'App\Http\Controllers',
        'App\Http\Requests',
        'App\Http\Resources',
        'App\Modules',
        'App\Services',
        Cache::class,
        DB::class,
    ]);

arch('enforces all ERP domain models use SoftDeletes (no hard-deletes)')
    ->expect('App\Models')
    ->classes()
    ->toUseTrait(SoftDeletes::class)
    ->ignoring(User::class);

arch('prevents Model subclasses outside App\Models')
    ->expect('App')
    ->not->toExtend(Model::class)
    ->ignoring('App\Models');

// =============================================================================
// 4. PHP Backed Enums (AGENTS.md Rule 3)
// =============================================================================

arch('enforces App\Enums contains only BackedEnums')
    ->expect('App\Enums')
    ->toBeEnums()
    ->ignoring('App\Enums\Concerns');

arch('enforces App\Enums implement BackedEnum')
    ->expect('App\Enums')
    ->toImplement(BackedEnum::class)
    ->ignoring('App\Enums\Concerns');

arch('enforces App\Enums only depend on App\Enums\Concerns')
    ->expect('App\Enums')
    ->toOnlyUse('App\Enums\Concerns')
    ->ignoring('App\Enums\Concerns');

arch('enforces App\Enums\Concerns are traits')
    ->expect('App\Enums\Concerns')
    ->toBeTraits();

arch('prevents enums outside App\Enums')
    ->expect('App')
    ->not->toBeEnums()
    ->ignoring('App\Enums');

// =============================================================================
// 5. FormRequests (AGENTS.md Rules 1, 4, 5)
// =============================================================================

arch('enforces FormRequests extend FormRequest, end with Request, expose authorize/rules, and avoid upper layers')
    ->expect($allRequests)
    ->classes()
    ->toExtend(FormRequest::class)
    ->toHaveSuffix('Request')
    ->toHaveMethods(['authorize', 'rules'])
    ->not->toUse([
        'App\Http\Controllers',
        'App\Http\Resources',
        'App\Services',
    ]);

arch('enforces module FormRequests normalize inputs in prepareForValidation() and expose typed payload()')
    ->expect($moduleRequests)
    ->classes()
    ->toHaveMethods(['prepareForValidation', 'payload']);

arch('prevents FormRequest subclasses outside Requests namespaces')
    ->expect('App')
    ->not->toExtend(FormRequest::class)
    ->ignoring($allRequests);

// =============================================================================
// 6. JsonResources (AGENTS.md Rules 1, 4)
// =============================================================================

arch('enforces JsonResources live in App\Http\Resources, extend JsonResource, and stay free of services/DB/cache')
    ->expect('App\Http\Resources')
    ->classes()
    ->toExtend(JsonResource::class)
    ->toHaveSuffix('Resource')
    ->toHaveMethod('toArray')
    ->not->toUse([
        'App\Http\Controllers',
        'App\Http\Requests',
        'App\Modules',
        'App\Services',
        DB::class,
        Cache::class,
    ]);

arch('prevents JsonResource subclasses outside App\Http\Resources')
    ->expect('App')
    ->not->toExtend(JsonResource::class)
    ->ignoring('App\Http\Resources');

// =============================================================================
// 7. Thin Controllers (AGENTS.md Rules 1, 4, 5)
// =============================================================================

arch('enforces all Controllers extend base Controller and end with Controller')
    ->expect($allControllers)
    ->classes()
    ->toExtend(Controller::class)
    ->toHaveSuffix('Controller')
    ->ignoring([
        Controller::class,
        'App\Http\Controllers\Concerns',
    ]);

arch('enforces module Controllers delegate queries, locking, and transactions to Services instead of DB or Support helpers')
    ->expect($moduleControllers)
    ->classes()
    ->not->toUse([
        DB::class,
        'App\Support',
    ]);

arch('prevents HTTP Controllers from using DB directly (except HealthController probe)')
    ->expect('App\Http\Controllers')
    ->classes()
    ->not->toUse(DB::class)
    ->ignoring(HealthController::class);

arch('enforces App\Http\Controllers\Concerns are traits')
    ->expect('App\Http\Controllers\Concerns')
    ->toBeTraits();

arch('prevents Controller subclasses outside Controllers namespaces')
    ->expect('App')
    ->not->toExtend(Controller::class)
    ->ignoring($allControllers);

arch('prevents Controller suffixes outside Controllers namespaces')
    ->expect('App')
    ->not->toHaveSuffix('Controller')
    ->ignoring($allControllers);

arch('prevents concrete Controllers from being depended on by any application class')
    ->expect($allControllers)
    ->toBeUsedInNothing()
    ->ignoring([
        Controller::class,
        RespondsWithApiList::class,
    ]);

arch('enforces RespondsWithApiList concern is only used in Controllers')
    ->expect(RespondsWithApiList::class)
    ->toOnlyBeUsedIn($allControllers);

// =============================================================================
// 8. Services & Actions (AGENTS.md Rules 1, 4, 5)
// =============================================================================

arch('enforces Services have Service suffix, extend nothing, and do not depend on Controllers, Requests, or Resources')
    ->expect($allServices)
    ->classes()
    ->toHaveSuffix('Service')
    ->toExtendNothing()
    ->not->toUse([
        ...$allControllers,
        ...$allRequests,
        'App\Http\Resources',
    ]);

arch('enforces Actions have Action suffix, extend nothing, expose execute(), and do not depend on HTTP layers')
    ->expect($moduleActions)
    ->classes()
    ->toHaveSuffix('Action')
    ->toExtendNothing()
    ->toHaveMethod('execute')
    ->not->toUse([
        'App\Http\Controllers',
        'App\Http\Requests',
        'App\Http\Resources',
    ]);

arch('enforces Actions are only invoked by module Services or other Actions')
    ->expect($moduleActions)
    ->toOnlyBeUsedIn([
        ...$moduleServices,
        ...$moduleActions,
    ]);

// =============================================================================
// 9. Middleware, Support Utilities & Service Providers
// =============================================================================

arch('enforces Middleware classes expose handle(), extend nothing, and avoid Controllers or Modules')
    ->expect('App\Http\Middleware')
    ->classes()
    ->toHaveMethod('handle')
    ->toExtendNothing()
    ->not->toUse([
        'App\Http\Controllers',
        'App\Http\Requests',
        'App\Http\Resources',
        'App\Modules',
    ]);

arch('enforces Support utilities are final, extend nothing, and stay independent of HTTP and Module layers')
    ->expect('App\Support')
    ->classes()
    ->toBeFinal()
    ->toExtendNothing()
    ->not->toUse([
        'App\Http\Controllers',
        'App\Http\Requests',
        'App\Http\Resources',
        'App\Modules',
        'App\Services',
    ]);

arch('enforces ServiceProviders live in App\Providers, extend ServiceProvider, and are never referenced directly')
    ->expect('App\Providers')
    ->classes()
    ->toHaveSuffix('ServiceProvider')
    ->toExtend(ServiceProvider::class)
    ->toBeUsedInNothing();

arch('prevents ServiceProvider subclasses outside App\Providers')
    ->expect('App')
    ->not->toExtend(ServiceProvider::class)
    ->ignoring('App\Providers');

arch('prevents ServiceProvider suffixes outside App\Providers')
    ->expect('App')
    ->not->toHaveSuffix('ServiceProvider')
    ->ignoring('App\Providers');

// =============================================================================
// 10. Cross-Module Boundary Enforcement
// =============================================================================

foreach (array_values(array_filter($modules, fn (string $m) => $m !== 'CFO')) as $isolatedModule) {
    $siblingModules = array_values(array_map(
        fn (string $m) => "App\\Modules\\{$m}",
        array_filter($modules, fn (string $m) => $m !== $isolatedModule)
    ));

    arch("enforces {$isolatedModule} module isolation from sibling modules")
        ->expect("App\\Modules\\{$isolatedModule}")
        ->not->toUse($siblingModules);
}

arch('restricts CFO cross-module coupling strictly to CHO payroll delete/cache guards')
    ->expect('App\Modules\CFO')
    ->not->toUse([
        'App\Modules\CDO',
        'App\Modules\CHO\Actions',
        'App\Modules\CHO\Controllers',
        'App\Modules\CHO\Requests',
        'App\Modules\CMO',
        'App\Modules\CPO',
        'App\Modules\HR',
    ]);
