<?php

namespace App\Models;

use App\Enums\CompanyType;
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
        'type',
    ];

    protected $hidden = [
        'active_flag',
    ];

    protected function casts(): array
    {
        return [
            'series' => 'integer',
            'type' => CompanyType::class,
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

    public function employees(): HasMany
    {
        return $this->hasMany(Employee::class);
    }

    public function employeeShifts(): HasMany
    {
        return $this->hasMany(EmployeeShift::class);
    }

    public function employeeAttendances(): HasMany
    {
        return $this->hasMany(EmployeeAttendance::class);
    }

    public function employeeShiftAssignments(): HasMany
    {
        return $this->hasMany(EmployeeShiftAssignment::class);
    }

    public function payrollRuns(): HasMany
    {
        return $this->hasMany(PayrollRun::class);
    }

    public function payrollItems(): HasMany
    {
        return $this->hasMany(PayrollItem::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(Item::class);
    }

    public function itemPackets(): HasMany
    {
        return $this->hasMany(ItemPacket::class);
    }

    public function defaultPackages(): HasMany
    {
        return $this->hasMany(DefaultPackage::class);
    }
}
