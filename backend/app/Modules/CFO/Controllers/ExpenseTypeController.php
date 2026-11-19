<?php

namespace App\Modules\CFO\Controllers;

use App\Http\Controllers\Controller;
use App\Models\ExpenseType;
use App\Modules\CFO\Services\ExpenseTypeService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ExpenseTypeController extends Controller
{
    public function __construct(
        protected ExpenseTypeService $expenseTypeService,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $search = $request->query('search');
        $expenseCategoryId = $request->query('expense_category_id');
        $perPage = $request->query('per_page');
        $page = $request->query('page');

        if ($search !== null || $perPage !== null || $page !== null) {
            $paginator = $this->expenseTypeService->paginateExpenseTypes(
                is_string($search) ? $search : null,
                max(1, (int) ($perPage ?? 10)),
                max(1, (int) ($page ?? 1)),
                $expenseCategoryId !== null ? (int) $expenseCategoryId : null
            );

            return response()->json([
                'data' => $paginator->items(),
                'meta' => [
                    'count' => count($paginator->items()),
                    'total' => $paginator->total(),
                    'page' => $paginator->currentPage(),
                    'per_page' => $paginator->perPage(),
                    'last_page' => $paginator->lastPage(),
                    'cache_key' => ExpenseTypeService::CACHE_KEY_LIST,
                ],
            ]);
        }

        $expenseTypes = $expenseCategoryId !== null
            ? $this->expenseTypeService->listExpenseTypeByExpenseCategory((int) $expenseCategoryId)
            : $this->expenseTypeService->listExpenseTypes();

        return response()->json([
            'data' => $expenseTypes,
            'meta' => [
                'count' => $expenseTypes->count(),
                'total' => $expenseTypes->count(),
                'page' => 1,
                'per_page' => max(1, $expenseTypes->count()),
                'last_page' => 1,
                'cache_key' => ExpenseTypeService::CACHE_KEY_LIST,
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'expense_category_id' => [
                'required',
                'integer',
                Rule::exists('expense_categories', 'id')->whereNull('deleted_at'),
            ],
            'name' => ['required', 'string', 'max:150'],
        ]);

        $validated['name'] = (string) $validated['name'];

        $expenseType = $this->expenseTypeService->createExpenseType($validated);

        return response()->json([
            'data' => $expenseType,
        ], 201);
    }

    public function show(ExpenseType $expenseType): JsonResponse
    {
        return response()->json([
            'data' => $expenseType->load('expenseCategory'),
        ]);
    }

    public function update(Request $request, ExpenseType $expenseType): JsonResponse
    {
        $validated = $request->validate([
            'expense_category_id' => [
                'required',
                'integer',
                Rule::exists('expense_categories', 'id')->whereNull('deleted_at'),
            ],
            'name' => ['required', 'string', 'max:150'],
        ]);

        $validated['name'] = (string) $validated['name'];

        $updated = $this->expenseTypeService->updateExpenseType($expenseType, $validated);

        return response()->json([
            'data' => $updated,
        ]);
    }

    public function destroy(ExpenseType $expenseType): JsonResponse
    {
        $this->expenseTypeService->deleteExpenseType($expenseType);

        return response()->json([
            'message' => 'Expense type deleted successfully.',
        ]);
    }
}
