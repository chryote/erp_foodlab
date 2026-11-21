<?php

namespace App\Modules\CHO\Actions;

use App\Models\Employee;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;

/**
 * Creates an employee and optionally syncs nested documents atomically.
 */
class CreateEmployeeAction
{
    public function __construct(
        protected SyncEmployeeDocumentsAction $syncEmployeeDocuments,
        protected AssertEmployeeContextAction $assertEmployeeContext,
    ) {}

    /**
     * @param  array<string, mixed>  $attributes
     */
    public function execute(array $attributes): Employee
    {
        $documents = Arr::pull($attributes, 'documents');

        return DB::transaction(function () use ($attributes, $documents): Employee {
            $this->assertEmployeeContext->execute($attributes);

            $employee = Employee::query()->create($attributes);

            if (is_array($documents) && $documents !== []) {
                $this->syncEmployeeDocuments->execute($employee, $documents);
            }

            return $employee;
        });
    }
}
