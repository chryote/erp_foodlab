<?php

namespace App\Modules\CFO\Controllers;

use App\Http\Controllers\Controller;
use App\Http\Resources\ExpenseTypeResource;
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
        $companyId = $request->query('company_id');
        $perPage = $request->query('per_page');
        $page = $request->query('page');

        if ($search !== null || $perPage !== null || $page !== null) {
            $paginator = $this->expenseTypeService->paginateExpenseTypes(
                is_string($search) ? $search : null,
                max(1, (int) ($perPage ?? 10)),
                max(1, (int) ($page ?? 1)),
                $expenseCategoryId !== null ? (int) $expenseCategoryId : null,
                $companyId !== null ? (int) $companyId : null
            );

            return response()->json([
                'data' => ExpenseTypeResource::collection($paginator->items()),
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

        $expenseTypes = $this->expenseTypeService->listFilteredExpenseTypes(
            $expenseCategoryId !== null ? (int) $expenseCategoryId : null,
            $companyId !== null ? (int) $companyId : null
        );

        return response()->json([
            'data' => ExpenseTypeResource::collection($expenseTypes),
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
        $companyId = (int) $request->input('company_id');

        $validated = $request->validate([
            'company_id' => [
                'required',
                'integer',
                Rule::exists('companies', 'id')->whereNull('deleted_at'),
            ],
            'expense_category_id' => [
                'required',
                'integer',
                Rule::exists('expense_categories', 'id')
                    ->whereNull('deleted_at')
                    ->where('company_id', $companyId),
            ],
            'name' => ['required', 'string', 'max:150'],
        ]);

        $validated['name'] = (string) $validated['name'];

        $expenseType = $this->expenseTypeService->createExpenseType($validated);

        return (new ExpenseTypeResource($expenseType))
            ->response()
            ->setStatusCode(201);
    }

    public function show(ExpenseType $expenseType): JsonResponse
    {
        return (new ExpenseTypeResource($expenseType->load(['expenseCategory', 'company'])))->response();
    }

    public function update(Request $request, ExpenseType $expenseType): JsonResponse
    {
        $companyId = (int) $request->input('company_id');

        $validated = $request->validate([
            'company_id' => [
                'required',
                'integer',
                Rule::exists('companies', 'id')->whereNull('deleted_at'),
            ],
            'expense_category_id' => [
                'required',
                'integer',
                Rule::exists('expense_categories', 'id')
                    ->whereNull('deleted_at')
                    ->where('company_id', $companyId),
            ],
            'name' => ['required', 'string', 'max:150'],
        ]);

        $validated['name'] = (string) $validated['name'];

        $updated = $this->expenseTypeService->updateExpenseType($expenseType, $validated);

        return (new ExpenseTypeResource($updated))->response();
    }

    public function destroy(ExpenseType $expenseType): JsonResponse
    {
        $this->expenseTypeService->deleteExpenseType($expenseType);

        return response()->json([
            'message' => 'Expense type deleted successfully.',
        ]);
    }
}
