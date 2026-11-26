<?php

namespace App\Modules\CPO\Controllers;

use App\Http\Controllers\Concerns\RespondsWithApiList;
use App\Http\Controllers\Controller;
use App\Http\Resources\PacketNameResource;
use App\Models\PacketName;
use App\Modules\CPO\Requests\SavePacketNameRequest;
use App\Modules\CPO\Services\PacketNameService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PacketNameController extends Controller
{
    use RespondsWithApiList;

    public function __construct(
        protected PacketNameService $packetNameService,
    ) {}

    public function index(Request $request): JsonResponse
    {
        return $this->respondWithList(
            PacketNameResource::class,
            $this->packetNameService->list($request),
            ['cache_key' => PacketNameService::CACHE_KEY_LIST]
        );
    }

    public function store(SavePacketNameRequest $request): JsonResponse
    {
        $packetName = $this->packetNameService->createPacketName($request->payload());

        return (new PacketNameResource($packetName))
            ->response()
            ->setStatusCode(201);
    }

    public function show(PacketName $packetName): JsonResponse
    {
        return (new PacketNameResource($packetName))->response();
    }

    public function update(SavePacketNameRequest $request, PacketName $packetName): JsonResponse
    {
        $updated = $this->packetNameService->updatePacketName($packetName, $request->payload());

        return (new PacketNameResource($updated))->response();
    }

    public function destroy(PacketName $packetName): JsonResponse
    {
        $this->packetNameService->deletePacketName($packetName);

        return response()->json([
            'message' => 'Packet name deleted successfully.',
        ]);
    }
}
