<?php

namespace App\Modules\CHO\Actions;

use App\Models\Employee;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;

/**
 * Updates an employee with row locking and optionally syncs nested documents.
 */
class UpdateEmployeeAction
{
    public function __construct(
        protected SyncEmployeeDocumentsAction $syncEmployeeDocuments,
        protected AssertEmployeeContextAction $assertEmployeeContext,
    ) {}

    /**
     * @param  array<string, mixed>  $attributes
     */
    public function execute(Employee $employee, array $attributes): Employee
    {
        $hasDocuments = array_key_exists('documents', $attributes);
        $documents = Arr::pull($attributes, 'documents');

        return DB::transaction(function () use ($employee, $attributes, $hasDocuments, $documents): Employee {
            $locked = Employee::query()->lockForUpdate()->findOrFail($employee->getKey());

            $this->assertEmployeeContext->execute($attributes, $locked);

            if ($attributes !== []) {
                $locked->update($attributes);
            }

            if ($hasDocuments && is_array($documents)) {
                $this->syncEmployeeDocuments->execute($locked, $documents);
            }

            return $locked;
        });
    }
}
