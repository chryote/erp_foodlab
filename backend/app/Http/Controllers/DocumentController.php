<?php

namespace App\Http\Controllers;

use App\Enums\JenisDokumen;
use App\Services\DocumentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class DocumentController extends Controller
{
    public function __construct(
        protected DocumentService $documents
    ) {}

    public function store(Request $request): JsonResponse
    {
        $documentType = $request->filled('document_type')
            ? JenisDokumen::tryFrom($request->string('document_type')->toString())
            : null;

        // Validate in controller using the service's rules
        $request->validate([
            'document_type' => ['sometimes', 'nullable', Rule::enum(JenisDokumen::class)],
            'document' => $this->documents->rules(documentType: $documentType),
        ]);

        // Pass skipValidation: true since we already validated above
        $uploaded = $this->documents->upload(
            file: $request->file('document'),
            directory: "users/{$request->user()->id}/documents",
            skipValidation: true,
            documentType: $documentType,
        );

        return response()->json($uploaded, 201);
    }
}
