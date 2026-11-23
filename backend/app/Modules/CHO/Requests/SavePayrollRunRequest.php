<?php

namespace App\Modules\CHO\Requests;

use App\Enums\PayrollRunStatus;
use App\Models\PayrollRun;
use App\Support\InputNormalizer;
use App\Support\WriteGuard;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class SavePayrollRunRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $normalized = [];

        if ($this->has('code') && is_string($this->input('code'))) {
            $normalized['code'] = InputNormalizer::nullableText($this->input('code'));
        }

        if ($this->has('name') && is_string($this->input('name'))) {
            $normalized['name'] = InputNormalizer::text($this->input('name'));
        }

        if ($this->has('notes') && is_string($this->input('notes'))) {
            $normalized['notes'] = InputNormalizer::nullableText($this->input('notes'));
        }

        if ($this->has('period_date') && is_string($this->input('period_date'))) {
            $normalizedDate = self::normalizePeriodDate($this->input('period_date'));
            if ($normalizedDate !== null) {
                $normalized['period_date'] = $normalizedDate;
            }
        }

        if ($normalized !== []) {
            $this->merge($normalized);
        }
    }

    /**
     * Rollup total_* and approval audit columns are server-managed and ignored from client input.
     *
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $presence = $this->isMethod('PATCH') ? ['sometimes', 'required'] : ['required'];

        return [
            'company_id' => [
                ...$presence,
                'integer',
                Rule::exists('companies', 'id')->whereNull('deleted_at'),
            ],
            'code' => ['sometimes', 'nullable', 'string', 'max:50'],
            'name' => [...$presence, 'string', 'max:150'],
            'period_date' => [...$presence, 'date_format:Y-m-d'],
            'status' => ['sometimes', 'required', 'string', Rule::enum(PayrollRunStatus::class)],
            'notes' => ['sometimes', 'nullable', 'string', 'max:500'],
        ];
    }

    /**
     * @return array<int, callable(Validator): void>
     */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                /** @var PayrollRun|null $routeRun */
                $routeRun = $this->route('payrollRun');

                if (! $validator->errors()->has('status') && $this->has('status')) {
                    $targetStatus = PayrollRunStatus::tryFrom((string) $this->input('status'));

                    if ($routeRun instanceof PayrollRun) {
                        $currentStatus = $routeRun->status instanceof PayrollRunStatus
                            ? $routeRun->status
                            : PayrollRunStatus::tryFrom((string) $routeRun->status);

                        if ($currentStatus !== null && $targetStatus !== null && ! $currentStatus->canTransitionTo($targetStatus)) {
                            $validator->errors()->add(
                                'status',
                                "Cannot transition payroll run status from {$currentStatus->value} to {$targetStatus->value}."
                            );
                        }
                    } elseif ($targetStatus === PayrollRunStatus::VOID) {
                        $validator->errors()->add(
                            'status',
                            'Cannot create a new payroll run directly with void status.'
                        );
                    }
                }

                if (
                    $routeRun instanceof PayrollRun
                    && $this->filled('company_id')
                    && ! $validator->errors()->has('company_id')
                    && (int) $this->input('company_id') !== (int) $routeRun->company_id
                    && $routeRun->items()->exists()
                ) {
                    $validator->errors()->add(
                        'company_id',
                        'Cannot change company for a payroll run that still has active payroll items.'
                    );
                }

                if ($validator->errors()->has('company_id')) {
                    return;
                }

                $effectiveCompanyId = $this->filled('company_id')
                    ? (int) $this->input('company_id')
                    : (int) ($routeRun?->company_id ?? 0);

                if ($effectiveCompanyId <= 0) {
                    return;
                }

                if (! $validator->errors()->has('period_date')) {
                    $effectivePeriodDate = $this->has('period_date')
                        ? self::normalizePeriodDate((string) $this->input('period_date'))
                        : $routeRun?->period_date?->format('Y-m-d');

                    if ($effectivePeriodDate !== null) {
                        $duplicatePeriod = PayrollRun::query()
                            ->whereNull('deleted_at')
                            ->where('company_id', $effectiveCompanyId)
                            ->whereDate('period_date', $effectivePeriodDate)
                            ->when($routeRun !== null, fn ($q) => $q->whereKeyNot($routeRun->getKey()))
                            ->exists();

                        if ($duplicatePeriod) {
                            $validator->errors()->add(
                                'period_date',
                                'Periode payroll untuk perusahaan ini sudah terdaftar.'
                            );
                        }
                    }
                }

                if (! $validator->errors()->has('code')) {
                    $effectiveCode = $this->has('code')
                        ? ($this->input('code') !== null ? InputNormalizer::nullableText((string) $this->input('code')) : null)
                        : $routeRun?->code;

                    if ($effectiveCode !== null && $effectiveCode !== '' && WriteGuard::existsCaseInsensitive(
                        PayrollRun::query(),
                        'code',
                        $effectiveCode,
                        ['company_id' => $effectiveCompanyId],
                        $routeRun?->getKey()
                    )) {
                        $validator->errors()->add('code', 'The code has already been taken.');
                    }
                }

                if (! $validator->errors()->has('name')) {
                    $effectiveName = $this->has('name')
                        ? InputNormalizer::text((string) $this->input('name'))
                        : $routeRun?->name;

                    if ($effectiveName !== null && $effectiveName !== '' && WriteGuard::existsCaseInsensitive(
                        PayrollRun::query(),
                        'name',
                        $effectiveName,
                        ['company_id' => $effectiveCompanyId],
                        $routeRun?->getKey()
                    )) {
                        $validator->errors()->add(
                            'name',
                            'Nama payroll run sudah terdaftar pada perusahaan ini.'
                        );
                    }
                }
            },
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function payload(): array
    {
        $validated = $this->validated();
        $isPatch = $this->isMethod('PATCH');
        /** @var PayrollRun|null $routeRun */
        $routeRun = $this->route('payrollRun');

        if (array_key_exists('company_id', $validated)) {
            $validated['company_id'] = (int) $validated['company_id'];
        }

        if (array_key_exists('code', $validated)) {
            $validated['code'] = $validated['code'] !== null
                ? InputNormalizer::nullableText((string) $validated['code'])
                : null;
        }

        if (array_key_exists('name', $validated)) {
            $validated['name'] = InputNormalizer::text((string) $validated['name']);
        }

        if (array_key_exists('notes', $validated)) {
            $validated['notes'] = $validated['notes'] !== null
                ? InputNormalizer::nullableText((string) $validated['notes'])
                : null;
        }

        if (array_key_exists('period_date', $validated)) {
            $validated['period_date'] = self::normalizePeriodDate((string) $validated['period_date'])
                ?? $validated['period_date'];
        }

        if (! array_key_exists('status', $validated) && ! $isPatch && ! ($routeRun instanceof PayrollRun)) {
            $validated['status'] = PayrollRunStatus::DRAFT->value;
        }

        $targetStatus = array_key_exists('status', $validated)
            ? PayrollRunStatus::tryFrom((string) $validated['status'])
            : null;
        $wasApproved = $routeRun instanceof PayrollRun && $routeRun->status === PayrollRunStatus::APPROVED;

        if ($targetStatus === PayrollRunStatus::APPROVED && ! $wasApproved) {
            $validated['approved_by'] = $this->user()?->getKey() !== null ? (int) $this->user()->getKey() : null;
            $validated['approved_at'] = now();
        }

        return $validated;
    }

    public static function normalizePeriodDate(string $value): ?string
    {
        $trimmed = trim($value);
        if ($trimmed === '') {
            return null;
        }

        $parsed = CarbonImmutable::createFromFormat('!Y-m-d', $trimmed);
        if ($parsed === false || $parsed->format('Y-m-d') !== $trimmed) {
            return null;
        }

        return $parsed->startOfMonth()->format('Y-m-d');
    }
}
