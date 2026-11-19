<?php

namespace App\Modules\CFO\Controllers;

use App\Http\Controllers\Controller;
use App\Models\ExpenseItem;
use App\Modules\CFO\Services\ExpenseItemService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ExpenseItemController extends Controller
{
    public function __construct(
        protected ExpenseItemService $expenseItemService,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $search = $request->query('search');
        $expenseCategoryId = $request->query('expense_category_id');
        $expenseTypeId = $request->query('expense_type_id');
        $companyId = $request->query('company_id');
        $perPage = $request->query('per_page');
        $page = $request->query('page');

        if ($search !== null || $perPage !== null || $page !== null) {
            $paginator = $this->expenseItemService->paginateExpenseItems(
                is_string($search) ? $search : null,
                max(1, (int) ($perPage ?? 10)),
                max(1, (int) ($page ?? 1)),
                $expenseCategoryId !== null ? (int) $expenseCategoryId : null,
                $expenseTypeId !== null ? (int) $expenseTypeId : null,
                $companyId !== null ? (int) $companyId : null
            );

            return response()->json([
                'data' => $paginator->items(),
                'meta' => [
                    'count' => count($paginator->items()),
                    'total' => $paginator->total(),
                    'page' => $paginator->currentPage(),
                    'per_page' => $paginator->perPage(),
                    'last_page' => $paginator->lastPage(),
                    'cache_key' => ExpenseItemService::CACHE_KEY_LIST,
                ],
            ]);
        }

        $expenseItems = $this->expenseItemService->listFilteredExpenseItems(
            $expenseCategoryId !== null ? (int) $expenseCategoryId : null,
            $expenseTypeId !== null ? (int) $expenseTypeId : null,
            $companyId !== null ? (int) $companyId : null
        );

        return response()->json([
            'data' => $expenseItems,
            'meta' => [
                'count' => $expenseItems->count(),
                'total' => $expenseItems->count(),
                'page' => 1,
                'per_page' => max(1, $expenseItems->count()),
                'last_page' => 1,
                'cache_key' => ExpenseItemService::CACHE_KEY_LIST,
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $companyId = (int) $request->input('company_id');

        $validated = $request->validate([
            'company_id' => [
                'required',
                'integer',
                Rule::exists('companies', 'id')->whereNull('deleted_at'),
            ],
            'expense_category_id' => [
                'sometimes',
                'nullable',
                'integer',
                Rule::exists('expense_categories', 'id')
                    ->whereNull('deleted_at')
                    ->where('company_id', $companyId),
            ],
            'expense_type_id' => [
                'required',
                'integer',
                Rule::exists('expense_types', 'id')
                    ->whereNull('deleted_at')
                    ->where('company_id', $companyId),
            ],
            'name' => ['required', 'string', 'max:150'],
            'amount' => ['required', 'numeric', 'min:0'],
        ]);

        $validated['name'] = (string) $validated['name'];
        $validated['amount'] = (float) $validated['amount'];

        $expenseItem = $this->expenseItemService->createExpenseItem($validated);

        return response()->json([
            'data' => $expenseItem,
        ], 201);
    }

    public function show(ExpenseItem $expenseItem): JsonResponse
    {
        return response()->json([
            'data' => $expenseItem->load(['expenseCategory', 'expenseType', 'company']),
        ]);
    }

    public function update(Request $request, ExpenseItem $expenseItem): JsonResponse
    {
        $companyId = (int) $request->input('company_id');

        $validated = $request->validate([
            'company_id' => [
                'required',
                'integer',
                Rule::exists('companies', 'id')->whereNull('deleted_at'),
            ],
            'expense_category_id' => [
                'sometimes',
                'nullable',
                'integer',
                Rule::exists('expense_categories', 'id')
                    ->whereNull('deleted_at')
                    ->where('company_id', $companyId),
            ],
            'expense_type_id' => [
                'required',
                'integer',
                Rule::exists('expense_types', 'id')
                    ->whereNull('deleted_at')
                    ->where('company_id', $companyId),
            ],
            'name' => ['required', 'string', 'max:150'],
            'amount' => ['required', 'numeric', 'min:0'],
        ]);

        $validated['name'] = (string) $validated['name'];
        $validated['amount'] = (float) $validated['amount'];

        $updated = $this->expenseItemService->updateExpenseItem($expenseItem, $validated);

        return response()->json([
            'data' => $updated,
        ]);
    }

    public function destroy(ExpenseItem $expenseItem): JsonResponse
    {
        $this->expenseItemService->deleteExpenseItem($expenseItem);

        return response()->json([
            'message' => 'Expense item deleted successfully.',
        ]);
    }
}
