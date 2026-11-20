<?php

namespace App\Modules\CHO\Actions;

use App\Models\Employee;
use App\Models\EmployeeDocument;

/**
 * Synchronizes an employee's documents within an active database transaction.
 */
class SyncEmployeeDocumentsAction
{
    /**
     * @param  array<int, array{document_type: string, file_url: string}>  $documents
     */
    public function execute(Employee $employee, array $documents): void
    {
        $existing = $employee->documents()
            ->lockForUpdate()
            ->get()
            ->keyBy(fn (EmployeeDocument $document): string => $document->document_type->value);

        $incomingTypes = [];

        foreach ($documents as $item) {
            $documentType = (string) $item['document_type'];
            $fileUrl = (string) $item['file_url'];
            $incomingTypes[] = $documentType;

            $current = $existing->get($documentType);

            if ($current instanceof EmployeeDocument) {
                if ($current->file_url !== $fileUrl) {
                    $current->update(['file_url' => $fileUrl]);
                }

                continue;
            }

            $employee->documents()->create([
                'document_type' => $documentType,
                'file_url' => $fileUrl,
            ]);
        }

        foreach ($existing as $documentType => $staleDocument) {
            if (! in_array($documentType, $incomingTypes, true)) {
                $staleDocument->delete();
            }
        }
    }
}
