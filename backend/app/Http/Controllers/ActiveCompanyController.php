<?php

namespace App\Http\Controllers;

use App\Http\Resources\CompanyResource;
use App\Models\Company;
use App\Support\ActiveCompany;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ActiveCompanyController extends Controller
{
    public function show(): JsonResponse
    {
        $company = active_company();

        return response()->json([
            'data' => $company !== null ? new CompanyResource($company) : null,
        ]);
    }

    public function update(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'company_id' => [
                'nullable',
                'integer',
                Rule::exists('companies', 'id')->whereNull('deleted_at'),
            ],
        ]);

        $companyId = $validated['company_id'] ?? null;
        $company = $companyId !== null
            ? Company::query()->find((int) $companyId)
            : null;

        ActiveCompany::persist($request->user(), $company);

        return response()->json([
            'data' => $company !== null ? new CompanyResource($company) : null,
        ]);
    }
}
