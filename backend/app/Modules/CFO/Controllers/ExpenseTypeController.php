<?php

namespace App\Modules\CFO\Controllers;

use App\Http\Controllers\Concerns\RespondsWithApiList;
use App\Http\Controllers\Controller;
use App\Http\Resources\ExpenseTypeResource;
use App\Models\ExpenseType;
use App\Modules\CFO\Requests\SaveExpenseTypeRequest;
use App\Modules\CFO\Services\ExpenseTypeService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ExpenseTypeController extends Controller
{
    use RespondsWithApiList;

    public function __construct(
        protected ExpenseTypeService $expenseTypeService
    ) {}

    public function index(Request $request): JsonResponse
    {
        return $this->respondWithList(
            ExpenseTypeResource::class,
            $this->expenseTypeService->list($request),
            ['cache_key' => ExpenseTypeService::CACHE_KEY_LIST]
        );
    }

    public function store(SaveExpenseTypeRequest $request): JsonResponse
    {
        $expenseType = $this->expenseTypeService->createExpenseType($request->payload());

        return (new ExpenseTypeResource($expenseType))
            ->response()
            ->setStatusCode(201);
    }

    public function show(ExpenseType $expenseType): JsonResponse
    {
        return (new ExpenseTypeResource($expenseType->load(['expenseCategory', 'company'])))->response();
    }

    public function update(SaveExpenseTypeRequest $request, ExpenseType $expenseType): JsonResponse
    {
        $updated = $this->expenseTypeService->updateExpenseType($expenseType, $request->payload());

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
