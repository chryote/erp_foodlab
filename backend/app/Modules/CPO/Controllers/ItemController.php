<?php

namespace App\Modules\CPO\Controllers;

use App\Http\Controllers\Concerns\RespondsWithApiList;
use App\Http\Controllers\Controller;
use App\Http\Resources\ItemResource;
use App\Models\Item;
use App\Modules\CPO\Requests\SaveItemRequest;
use App\Modules\CPO\Services\ItemService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ItemController extends Controller
{
    use RespondsWithApiList;

    public function __construct(
        protected ItemService $itemService,
    ) {}

    public function index(Request $request): JsonResponse
    {
        return $this->respondWithList(
            ItemResource::class,
            $this->itemService->list($request),
            ['cache_key' => ItemService::CACHE_KEY_LIST]
        );
    }

    public function store(SaveItemRequest $request): JsonResponse
    {
        $item = $this->itemService->createItem($request->payload());

        return (new ItemResource($item))
            ->response()
            ->setStatusCode(201);
    }

    public function show(Item $item): JsonResponse
    {
        return (new ItemResource($item))->response();
    }

    public function update(SaveItemRequest $request, Item $item): JsonResponse
    {
        $updated = $this->itemService->updateItem($item, $request->payload());

        return (new ItemResource($updated))->response();
    }

    public function destroy(Item $item): JsonResponse
    {
        $this->itemService->deleteItem($item);

        return response()->json([
            'message' => 'Item deleted successfully.',
        ]);
    }
}
