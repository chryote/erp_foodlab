<?php

namespace App\Modules\CPO\Controllers;

use App\Http\Controllers\Concerns\RespondsWithApiList;
use App\Http\Controllers\Controller;
use App\Http\Resources\DefaultPackageResource;
use App\Models\DefaultPackage;
use App\Modules\CPO\Requests\SaveDefaultPackageRequest;
use App\Modules\CPO\Services\DefaultPackageService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DefaultPackageController extends Controller
{
    use RespondsWithApiList;

    public function __construct(
        protected DefaultPackageService $defaultPackageService,
    ) {}

    public function index(Request $request): JsonResponse
    {
        return $this->respondWithList(
            DefaultPackageResource::class,
            $this->defaultPackageService->list($request),
            ['cache_key' => DefaultPackageService::CACHE_KEY_LIST]
        );
    }

    public function store(SaveDefaultPackageRequest $request): JsonResponse
    {
        $defaultPackage = $this->defaultPackageService->createDefaultPackage($request->payload());

        return (new DefaultPackageResource($defaultPackage))
            ->response()
            ->setStatusCode(201);
    }

    public function show(DefaultPackage $defaultPackage): JsonResponse
    {
        return (new DefaultPackageResource(
            $defaultPackage->load(['packetName', 'packetVendor', 'packetCategory', 'itemPacket'])
        ))->response();
    }

    public function update(SaveDefaultPackageRequest $request, DefaultPackage $defaultPackage): JsonResponse
    {
        $updated = $this->defaultPackageService->updateDefaultPackage($defaultPackage, $request->payload());

        return (new DefaultPackageResource($updated))->response();
    }

    public function destroy(DefaultPackage $defaultPackage): JsonResponse
    {
        $this->defaultPackageService->deleteDefaultPackage($defaultPackage);

        return response()->json([
            'message' => 'Default package deleted successfully.',
        ]);
    }
}
