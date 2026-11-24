<?php

namespace App\Modules\CPO\Controllers;

use App\Http\Controllers\Concerns\RespondsWithApiList;
use App\Http\Controllers\Controller;
use App\Http\Resources\PacketResource;
use App\Models\Packet;
use App\Modules\CPO\Requests\SavePacketRequest;
use App\Modules\CPO\Services\PacketService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PacketController extends Controller
{
    use RespondsWithApiList;

    public function __construct(
        protected PacketService $packetService,
    ) {}

    public function index(Request $request): JsonResponse
    {
        return $this->respondWithList(
            PacketResource::class,
            $this->packetService->list($request),
            ['cache_key' => PacketService::CACHE_KEY_LIST]
        );
    }

    public function store(SavePacketRequest $request): JsonResponse
    {
        $packet = $this->packetService->createPacket($request->payload());

        return (new PacketResource($packet))
            ->response()
            ->setStatusCode(201);
    }

    public function show(Packet $packet): JsonResponse
    {
        return (new PacketResource($packet))->response();
    }

    public function update(SavePacketRequest $request, Packet $packet): JsonResponse
    {
        $updated = $this->packetService->updatePacket($packet, $request->payload());

        return (new PacketResource($updated))->response();
    }

    public function destroy(Packet $packet): JsonResponse
    {
        $this->packetService->deletePacket($packet);

        return response()->json([
            'message' => 'Packet deleted successfully.',
        ]);
    }
}
