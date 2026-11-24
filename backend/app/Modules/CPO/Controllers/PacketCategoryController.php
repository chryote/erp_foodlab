<?php

namespace App\Modules\CPO\Controllers;

use App\Http\Controllers\Concerns\RespondsWithApiList;
use App\Http\Controllers\Controller;
use App\Http\Resources\PacketCategoryResource;
use App\Models\PacketCategory;
use App\Modules\CPO\Requests\SavePacketCategoryRequest;
use App\Modules\CPO\Services\PacketCategoryService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PacketCategoryController extends Controller
{
    use RespondsWithApiList;

    public function __construct(
        protected PacketCategoryService $packetCategoryService,
    ) {}

    public function index(Request $request): JsonResponse
    {
        return $this->respondWithList(
            PacketCategoryResource::class,
            $this->packetCategoryService->list($request),
            ['cache_key' => PacketCategoryService::CACHE_KEY_LIST]
        );
    }

    public function store(SavePacketCategoryRequest $request): JsonResponse
    {
        $packetCategory = $this->packetCategoryService->createPacketCategory($request->payload());

        return (new PacketCategoryResource($packetCategory))
            ->response()
            ->setStatusCode(201);
    }

    public function show(PacketCategory $packetCategory): JsonResponse
    {
        return (new PacketCategoryResource($packetCategory))->response();
    }

    public function update(SavePacketCategoryRequest $request, PacketCategory $packetCategory): JsonResponse
    {
        $updated = $this->packetCategoryService->updatePacketCategory($packetCategory, $request->payload());

        return (new PacketCategoryResource($updated))->response();
    }

    public function destroy(PacketCategory $packetCategory): JsonResponse
    {
        $this->packetCategoryService->deletePacketCategory($packetCategory);

        return response()->json([
            'message' => 'Packet category deleted successfully.',
        ]);
    }
}
