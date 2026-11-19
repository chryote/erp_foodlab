<?php

namespace App\Modules\CFO\Controllers;

use App\Http\Controllers\Controller;
use App\Http\Resources\ExpenseCategoryResource;
use App\Models\ExpenseCategory;
use App\Modules\CFO\Services\ExpenseCategoryService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ExpenseCategoryController extends Controller
{
    public function __construct(
        protected ExpenseCategoryService $expenseCategoryService
    ) {}

    public function index(Request $request): JsonResponse
    {
        $search = $request->query('search');
        $companyId = $request->query('company_id');
        $perPage = $request->query('per_page');
        $page = $request->query('page');

        if ($search !== null || $perPage !== null || $page !== null) {
            $paginator = $this->expenseCategoryService->paginateExpenseCategories(
                is_string($search) ? $search : null,
                max(1, (int) ($perPage ?? 10)),
                max(1, (int) ($page ?? 1)),
                $companyId !== null ? (int) $companyId : null
            );

            return response()->json([
                'data' => ExpenseCategoryResource::collection($paginator->items()),
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

        $expenseCategories = $this->expenseCategoryService->listFilteredExpenseCategories(
            $companyId !== null ? (int) $companyId : null
        );

        return response()->json([
            'data' => ExpenseCategoryResource::collection($expenseCategories),
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
            'company_id' => [
                'required',
                'integer',
                Rule::exists('companies', 'id')->whereNull('deleted_at'),
            ],
            'name' => ['required', 'string', 'max:150'],
        ]);

        $validated['name'] = (string) $validated['name'];

        $expenseCategory = $this->expenseCategoryService->createExpenseCategory($validated);

        return (new ExpenseCategoryResource($expenseCategory))
            ->response()
            ->setStatusCode(201);
    }

    public function show(ExpenseCategory $expenseCategory): JsonResponse
    {
        return (new ExpenseCategoryResource($expenseCategory->load('company')))->response();
    }

    public function update(Request $request, ExpenseCategory $expenseCategory): JsonResponse
    {
        $validated = $request->validate([
            'company_id' => [
                'required',
                'integer',
                Rule::exists('companies', 'id')->whereNull('deleted_at'),
            ],
            'name' => ['required', 'string', 'max:150'],
        ]);

        $validated['name'] = (string) $validated['name'];

        $updated = $this->expenseCategoryService->updateExpenseCategory($expenseCategory, $validated);

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
