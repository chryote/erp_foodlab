<?php

namespace App\Modules\CFO\Controllers;

use App\Http\Controllers\Concerns\RespondsWithApiList;
use App\Http\Controllers\Controller;
use App\Http\Resources\ExpenseCategoryResource;
use App\Models\ExpenseCategory;
use App\Modules\CFO\Requests\SaveExpenseCategoryRequest;
use App\Modules\CFO\Services\ExpenseCategoryService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ExpenseCategoryController extends Controller
{
    use RespondsWithApiList;

    public function __construct(
        protected ExpenseCategoryService $expenseCategoryService
    ) {}

    public function index(Request $request): JsonResponse
    {
        return $this->respondWithList(
            ExpenseCategoryResource::class,
            $this->expenseCategoryService->list($request),
            ['cache_key' => ExpenseCategoryService::CACHE_KEY_LIST]
        );
    }

    public function store(SaveExpenseCategoryRequest $request): JsonResponse
    {
        $expenseCategory = $this->expenseCategoryService->createExpenseCategory($request->payload());

        return (new ExpenseCategoryResource($expenseCategory))
            ->response()
            ->setStatusCode(201);
    }

    public function show(ExpenseCategory $expenseCategory): JsonResponse
    {
        return (new ExpenseCategoryResource($expenseCategory->load('company')))->response();
    }

    public function update(SaveExpenseCategoryRequest $request, ExpenseCategory $expenseCategory): JsonResponse
    {
        $updated = $this->expenseCategoryService->updateExpenseCategory($expenseCategory, $request->payload());

        return (new ExpenseCategoryResource($updated))->response();
    }

    public function destroy(ExpenseCategory $expenseCategory): JsonResponse
    {
        $this->expenseCategoryService->deleteExpenseCategory($expenseCategory);

        return response()->json([
            'message' => 'Expense category deleted successfully.',
        ]);
    }
}
