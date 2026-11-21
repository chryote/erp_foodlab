<?php

namespace App\Modules\CHO\Controllers;

use App\Enums\JenisDokumen;
use App\Http\Controllers\Concerns\RespondsWithApiList;
use App\Http\Controllers\Controller;
use App\Http\Resources\EmployeeResource;
use App\Models\Employee;
use App\Modules\CHO\Requests\SaveEmployeeRequest;
use App\Modules\CHO\Services\EmployeeService;
use App\Services\DocumentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class EmployeeController extends Controller
{
    use RespondsWithApiList;

    public function __construct(
        protected EmployeeService $employeeService,
    ) {}

    public function index(Request $request): JsonResponse
    {
        return $this->respondWithList(
            EmployeeResource::class,
            $this->employeeService->list($request),
            ['cache_key' => EmployeeService::CACHE_KEY_LIST]
        );
    }

    public function store(SaveEmployeeRequest $request): JsonResponse
    {
        $employee = $this->employeeService->createEmployee($request->payload());

        return (new EmployeeResource($employee))
            ->response()
            ->setStatusCode(201);
    }

    public function show(Employee $employee): JsonResponse
    {
        return (new EmployeeResource(
            $employee->load([
                'company',
                'employeePosition',
                'employmentStatus',
                'payrollGrade',
                'taxStatus',
                'documents',
            ])
        ))->response();
    }

    public function update(SaveEmployeeRequest $request, Employee $employee): JsonResponse
    {
        $updated = $this->employeeService->updateEmployee($employee, $request->payload());

        return (new EmployeeResource($updated))->response();
    }

    public function destroy(Employee $employee): JsonResponse
    {
        $this->employeeService->deleteEmployee($employee);

        return response()->json([
            'message' => 'Employee deleted successfully.',
        ]);
    }

    public function uploadDocument(Request $request, DocumentService $documents): JsonResponse
    {
        $documentType = $request->filled('document_type')
            ? JenisDokumen::tryFrom($request->string('document_type')->toString())
            : null;

        $request->validate([
            'document_type' => ['sometimes', 'nullable', Rule::enum(JenisDokumen::class)],
            'document' => $documents->rules(documentType: $documentType),
        ]);

        $directory = $documentType !== null
            ? $documentType->storageDirectory('employees')
            : 'employees/documents';

        $uploaded = $documents->upload(
            file: $request->file('document'),
            directory: $directory,
            skipValidation: true,
            documentType: $documentType,
        );

        return response()->json($uploaded, 201);
    }
}
