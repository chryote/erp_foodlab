<?php

namespace App\Modules\CFO\Controllers;

use App\Http\Controllers\Controller;
use App\Models\ExpenseCategory;
use App\Modules\CFO\Services\expenseCategoryService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ExpenseCategoryController extends Controller
{
    public function __construct(
        protected ExpenseCategoryService $expenseCategoryService
    ) {}

    public function index(Request $request): JsonResponse
    {
        $search = $request->query('search');
        $perPage = $request->query('per_page');
        $page = $request->query('page');

        if ($search !== null || $perPage !== null || $page !== null) {
            $paginator = $this->expenseCategoryService->paginateExpenseCategories(
                is_string($search) ? $search : null,
                max(1, (int) ($perPage ?? 10)),
                max(1, (int) ($page ?? 1))
            );

            return response()->json([
                'data' => $paginator->items(),
                'meta' => [
                    'count' => count($paginator->items()),
                    'total' => $paginator->total(),
                    'page' => $paginator->currentPage(),
                    'per_page' => $paginator->perPage(),
                    'last_page' => $paginator->lastPage(),
                    'cache_key' => ExpenseCategoryService::CACHE_KEY_LIST,
                ],
            ]);
        }

        $expenseCategories = $this->expenseCategoryService->listExpenseCategories();

        return response()->json([
            'data' => $expenseCategories,
            'meta' => [
                'count' => $expenseCategories->count(),
                'total' => $expenseCategories->count(),
                'page' => 1,
                'per_page' => max(1, $expenseCategories->count()),
                'last_page' => 1,
                'cache_key' => ExpenseCategoryService::CACHE_KEY_LIST,
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:150'],
            'series' => ['sometimes', 'required', 'integer', 'min:1'],
        ]);

        $expenseCategory = $this->expenseCategoryService->createExpenseCategory($validated);

        return response()->json([
            'data' => $expenseCategory,
        ], 201);
    }

    public function show(ExpenseCategory $expenseCategory): JsonResponse
    {
        return response()->json([
            'data' => $expenseCategory,
        ]);
    }

    public function update(Request $request, ExpenseCategory $expenseCategory): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:150'],
            'series' => ['sometimes', 'required', 'integer', 'min:1'],
        ]);

        $updated = $this->expenseCategoryService->updateExpenseCategory($expenseCategory, $validated);

        return response()->json([
            'data' => $updated,
        ]);
    }

    public function destroy(ExpenseCategory $expenseCategory): JsonResponse
    {
        $this->expenseCategoryService->deleteExpenseCategory($expenseCategory);

        return response()->json([
            'message' => 'Expense category deleted successfully.',
        ]);
    }
}
