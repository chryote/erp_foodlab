<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Company extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'companies';

    protected $fillable = [
        'name',
        'series',
    ];

    protected function casts(): array
    {
        return [
            'series' => 'integer',
        ];
    }

    public function capitalCompanies(): HasMany
    {
        return $this->hasMany(CapitalCompany::class);
    }

    public function expenseCategories(): HasMany
    {
        return $this->hasMany(ExpenseCategory::class);
    }

    public function expenseTypes(): HasMany
    {
        return $this->hasMany(ExpenseType::class);
    }

    public function expenseItems(): HasMany
    {
        return $this->hasMany(ExpenseItem::class);
    }

    public function companyAssets(): HasMany
    {
        return $this->hasMany(CompanyAsset::class);
    }

    public function employeePositions(): HasMany
    {
        return $this->hasMany(EmployeePosition::class);
    }

    public function employmentStatuses(): HasMany
    {
        return $this->hasMany(EmploymentStatus::class);
    }

    public function payrollGrades(): HasMany
    {
        return $this->hasMany(PayrollGrade::class);
    }

    public function employees(): HasMany
    {
        return $this->hasMany(Employee::class);
    }
}
