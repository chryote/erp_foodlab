<?php

namespace App\Modules\CFO\Controllers;

use App\Http\Controllers\Concerns\RespondsWithApiList;
use App\Http\Controllers\Controller;
use App\Http\Resources\ExpenseItemResource;
use App\Models\ExpenseItem;
use App\Modules\CFO\Requests\SaveExpenseItemRequest;
use App\Modules\CFO\Services\ExpenseItemService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ExpenseItemController extends Controller
{
    use RespondsWithApiList;

    public function __construct(
        protected ExpenseItemService $expenseItemService,
    ) {}

    public function index(Request $request): JsonResponse
    {
        return $this->respondWithList(
            ExpenseItemResource::class,
            $this->expenseItemService->list($request),
            ['cache_key' => ExpenseItemService::CACHE_KEY_LIST]
        );
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
