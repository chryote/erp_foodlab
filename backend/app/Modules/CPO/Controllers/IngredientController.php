<?php

namespace App\Modules\CPO\Controllers;

use App\Http\Controllers\Concerns\RespondsWithApiList;
use App\Http\Controllers\Controller;
use App\Http\Resources\IngredientResource;
use App\Models\Ingredient;
use App\Modules\CPO\Requests\SaveIngredientRequest;
use App\Modules\CPO\Services\IngredientService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class IngredientController extends Controller
{
    use RespondsWithApiList;

    public function __construct(
        protected IngredientService $ingredientService,
    ) {}

    public function index(Request $request): JsonResponse
    {
        return $this->respondWithList(
            IngredientResource::class,
            $this->ingredientService->list($request),
            ['cache_key' => IngredientService::CACHE_KEY_LIST]
        );
    }

    public function store(SaveIngredientRequest $request): JsonResponse
    {
        $ingredient = $this->ingredientService->createIngredient($request->payload());

        return (new IngredientResource($ingredient))
            ->response()
            ->setStatusCode(201);
    }

    public function show(Ingredient $ingredient): JsonResponse
    {
        return (new IngredientResource(
            $ingredient->load(['defaultPackage', 'item'])
        ))->response();
    }

    public function update(SaveIngredientRequest $request, Ingredient $ingredient): JsonResponse
    {
        $updated = $this->ingredientService->updateIngredient($ingredient, $request->payload());

        return (new IngredientResource($updated))->response();
    }

    public function destroy(Ingredient $ingredient): JsonResponse
    {
        $this->ingredientService->deleteIngredient($ingredient);

        return response()->json([
            'message' => 'Ingredient deleted successfully.',
        ]);
    }
}
