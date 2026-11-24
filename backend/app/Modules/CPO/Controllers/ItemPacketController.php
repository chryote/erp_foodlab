<?php

namespace App\Modules\CPO\Controllers;

use App\Http\Controllers\Concerns\RespondsWithApiList;
use App\Http\Controllers\Controller;
use App\Http\Resources\ItemPacketResource;
use App\Models\ItemPacket;
use App\Modules\CPO\Requests\SaveItemPacketRequest;
use App\Modules\CPO\Services\ItemPacketService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ItemPacketController extends Controller
{
    use RespondsWithApiList;

    public function __construct(
        protected ItemPacketService $itemPacketService,
    ) {}

    public function index(Request $request): JsonResponse
    {
        return $this->respondWithList(
            ItemPacketResource::class,
            $this->itemPacketService->list($request),
            ['cache_key' => ItemPacketService::CACHE_KEY_LIST]
        );
    }

    public function store(SaveItemPacketRequest $request): JsonResponse
    {
        $itemPacket = $this->itemPacketService->createItemPacket($request->payload());

        return (new ItemPacketResource($itemPacket))
            ->response()
            ->setStatusCode(201);
    }

    public function show(ItemPacket $itemPacket): JsonResponse
    {
        return (new ItemPacketResource($itemPacket->load(['packet', 'item'])))->response();
    }

    public function update(SaveItemPacketRequest $request, ItemPacket $itemPacket): JsonResponse
    {
        $updated = $this->itemPacketService->updateItemPacket($itemPacket, $request->payload());

        return (new ItemPacketResource($updated))->response();
    }

    public function destroy(ItemPacket $itemPacket): JsonResponse
    {
        $this->itemPacketService->deleteItemPacket($itemPacket);

        return response()->json([
            'message' => 'Item packet deleted successfully.',
        ]);
    }
}
