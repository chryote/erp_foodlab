<?php

namespace App\Modules\CPO\Controllers;

use App\Http\Controllers\Concerns\RespondsWithApiList;
use App\Http\Controllers\Controller;
use App\Http\Resources\PacketVendorResource;
use App\Models\PacketVendor;
use App\Modules\CPO\Requests\SavePacketVendorRequest;
use App\Modules\CPO\Services\PacketVendorService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PacketVendorController extends Controller
{
    use RespondsWithApiList;

    public function __construct(
        protected PacketVendorService $packetVendorService,
    ) {}

    public function index(Request $request): JsonResponse
    {
        return $this->respondWithList(
            PacketVendorResource::class,
            $this->packetVendorService->list($request),
            ['cache_key' => PacketVendorService::CACHE_KEY_LIST]
        );
    }

    public function store(SavePacketVendorRequest $request): JsonResponse
    {
        $packetVendor = $this->packetVendorService->createPacketVendor($request->payload());

        return (new PacketVendorResource($packetVendor))
            ->response()
            ->setStatusCode(201);
    }

    public function show(PacketVendor $packetVendor): JsonResponse
    {
        return (new PacketVendorResource($packetVendor))->response();
    }

    public function update(SavePacketVendorRequest $request, PacketVendor $packetVendor): JsonResponse
    {
        $updated = $this->packetVendorService->updatePacketVendor($packetVendor, $request->payload());

        return (new PacketVendorResource($updated))->response();
    }

    public function destroy(PacketVendor $packetVendor): JsonResponse
    {
        $this->packetVendorService->deletePacketVendor($packetVendor);

        return response()->json([
            'message' => 'Packet vendor deleted successfully.',
        ]);
    }
}
