<?php

namespace App\Modules\CFO\Controllers;

use App\Http\Controllers\Controller;
use App\Http\Resources\ExpenseItemResource;
use App\Models\ExpenseItem;
use App\Modules\CFO\Requests\SaveExpenseItemRequest;
use App\Modules\CFO\Services\ExpenseItemService;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ExpenseItemController extends Controller
{
    public function __construct(
        protected ExpenseItemService $expenseItemService,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $result = $this->expenseItemService->list($request);

        if ($result instanceof LengthAwarePaginator) {
            return response()->json([
                'data' => ExpenseItemResource::collection($result->items()),
                'meta' => [
                    'count' => count($result->items()),
                    'total' => $result->total(),
                    'page' => $result->currentPage(),
                    'per_page' => $result->perPage(),
                    'last_page' => $result->lastPage(),
                    'cache_key' => ExpenseItemService::CACHE_KEY_LIST,
                ],
            ]);
        }

        return response()->json([
            'data' => ExpenseItemResource::collection($result),
            'meta' => [
                'count' => $result->count(),
                'total' => $result->count(),
                'page' => 1,
                'per_page' => max(1, $result->count()),
                'last_page' => 1,
                'cache_key' => ExpenseItemService::CACHE_KEY_LIST,
            ],
        ]);
    }

    public function store(SaveExpenseItemRequest $request): JsonResponse
    {
        $expenseItem = $this->expenseItemService->createExpenseItem($request->payload());

        return (new ExpenseItemResource($expenseItem))
            ->response()
            ->setStatusCode(201);
    }

    public function show(ExpenseItem $expenseItem): JsonResponse
    {
        return (new ExpenseItemResource(
            $expenseItem->load(['expenseCategory', 'expenseType', 'company'])
        ))->response();
    }

    public function update(SaveExpenseItemRequest $request, ExpenseItem $expenseItem): JsonResponse
    {
        $updated = $this->expenseItemService->updateExpenseItem($expenseItem, $request->payload());

        return (new ExpenseItemResource($updated))->response();
    }

    public function destroy(ExpenseItem $expenseItem): JsonResponse
    {
        $this->expenseItemService->deleteExpenseItem($expenseItem);

        return response()->json([
            'message' => 'Expense item deleted successfully.',
        ]);
    }
}
