import React, { useEffect, useMemo, useState } from 'react';
import type {
  Company,
  PayrollGroup,
  PayrollWorkspaceRow,
  SaveEmployeePayrollPayload,
  TaxStatus,
} from '@/api/client';
import {
  Badge,
  Button,
  ConfirmDialog,
  DecimalInput,
  Modal,
  Pagination,
  SelectInput,
  SummaryBanner,
  TextInput,
} from '@/components/ui';
import { usePayrollWorkspaceResource } from '@/lib/choResources';
import { cn } from '@/lib/utils';
import { formatCapitalIdr } from '@/modules/CFO/CapitalCompanyCrudModal';

export type InputPayrollTabKey = 'all' | PayrollGroup;

export const INPUT_PAYROLL_TABS: Array<{
  key: InputPayrollTabKey;
  label: string;
}> = [{ key: 'all', label: 'Semua Karyawan' }];

interface RowDraftValues {
  bonus: string;
  overtime: string;
  deduction: string;
  thr: string;
}

type PendingRowAction = {
  mode: 'save' | 'finalize';
  row: PayrollWorkspaceRow;
  payload: SaveEmployeePayrollPayload;
  previewPph21: number;
  previewTotalNet: number;
};

const PTKP_BY_CODE: Record<string, number> = {
  'TK/0': 54_000_000,
  'TK/1': 58_500_000,
  'TK/2': 63_000_000,
  'TK/3': 67_500_000,
  'K/0': 58_500_000,
  'K/1': 63_000_000,
  'K/2': 67_500_000,
  'K/3': 72_000_000,
  'K/I/0': 112_500_000,
  'K/I/1': 117_000_000,
  'K/I/2': 121_500_000,
  'K/I/3': 126_000_000,
};

const PASAL_17_BRACKETS: Array<{ limit: number | null; rate: number }> = [
  { limit: 60_000_000, rate: 0.05 },
  { limit: 250_000_000, rate: 0.15 },
  { limit: 500_000_000, rate: 0.25 },
  { limit: 5_000_000_000, rate: 0.3 },
  { limit: null, rate: 0.35 },
];

function getCurrentPeriodDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}-01`;
}

function parseDraftNumber(raw: string | undefined): number {
  if (!raw) {
    return 0;
  }
  const parsed = parseFloat(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed * 100) / 100 : 0;
}

function formatRawDecimal(value: number): string {
  if (!value) {
    return '';
  }
  return String(value);
}

function resolvePtkpPreview(taxStatus?: TaxStatus | null): number {
  if (!taxStatus) {
    return 54_000_000;
  }
  const candidates = [
    (taxStatus.code ?? '').toUpperCase().replace(/\s+/g, ''),
    (taxStatus.name ?? '').toUpperCase().replace(/\s+/g, ''),
  ];
  for (const candidate of candidates) {
    if (!candidate) {
      continue;
    }
    if (PTKP_BY_CODE[candidate]) {
      return PTKP_BY_CODE[candidate];
    }
    const match = candidate.match(/(K\/I\/[0-3]|K\/[0-3]|TK\/[0-3])/);
    if (match && PTKP_BY_CODE[match[1]]) {
      return PTKP_BY_CODE[match[1]];
    }
    const compact = candidate.match(/^(TK|K)([0-3])$/);
    if (compact) {
      const code = `${compact[1]}/${compact[2]}`;
      if (PTKP_BY_CODE[code]) {
        return PTKP_BY_CODE[code];
      }
    }
  }
  const upperName = (taxStatus.name ?? '').toUpperCase();
  const depMatch = upperName.match(/([0-3])/);
  if (depMatch) {
    const prefix = upperName.includes('TIDAK KAWIN')
      ? 'TK'
      : upperName.includes('KAWIN')
        ? 'K'
        : null;
    if (prefix) {
      const key = `${prefix}/${depMatch[1]}`;
      if (PTKP_BY_CODE[key]) {
        return PTKP_BY_CODE[key];
      }
    }
  }
  return 54_000_000;
}

function computePph21Preview(
  baseSalary: number,
  bpjsKesehatan: number,
  bpjsKetenagakerjaan: number,
  bonus: number,
  overtime: number,
  deduction: number,
  thr: number,
  taxStatus?: TaxStatus | null
): number {
  const monthlyTaxable = Math.max(
    0,
    baseSalary +
      bonus +
      overtime +
      thr -
      (bpjsKesehatan + bpjsKetenagakerjaan + deduction)
  );
  if (monthlyTaxable <= 0) {
    return 0;
  }

  const annualGross = monthlyTaxable * 12;
  const biayaJabatan = Math.min(6_000_000, annualGross * 0.05);
  const annualNet = Math.max(0, annualGross - biayaJabatan);
  const ptkp = resolvePtkpPreview(taxStatus);
  const pkp = Math.max(0, Math.floor((annualNet - ptkp) / 1000) * 1000);
  if (pkp <= 0) {
    return 0;
  }

  let annualTax = 0;
  let previousLimit = 0;
  for (const bracket of PASAL_17_BRACKETS) {
    if (bracket.limit === null) {
      annualTax += Math.max(0, pkp - previousLimit) * bracket.rate;
      break;
    }
    if (pkp <= previousLimit) {
      break;
    }
    const slice = Math.min(pkp, bracket.limit) - previousLimit;
    if (slice > 0) {
      annualTax += slice * bracket.rate;
    }
    previousLimit = bracket.limit;
  }

  return Math.round(annualTax / 12);
}

export interface InputPayrollModalProps {
  isOpen: boolean;
  company: Company | null;
  companies?: Company[];
  onClose: () => void;
}

export const InputPayrollModal: React.FC<InputPayrollModalProps> = ({
  isOpen,
  company,
  companies,
  onClose,
}) => {
  const availableCompanies = useMemo<Company[]>(() => {
    if (companies && companies.length > 0) {
      return companies;
    }
    return company ? [company] : [];
  }, [companies, company]);

  const [selectedCompanyId, setSelectedCompanyId] = useState<string>(() =>
    company ? String(company.id) : ''
  );
  const [periodDate, setPeriodDate] = useState<string>(() =>
    getCurrentPeriodDate()
  );
  const period = periodDate ? periodDate.slice(0, 7) : '';
  const [activeTab, setActiveTab] = useState<InputPayrollTabKey>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [drafts, setDrafts] = useState<Record<number, RowDraftValues>>({});
  const [pendingAction, setPendingAction] = useState<PendingRowAction | null>(
    null
  );

  useEffect(() => {
    if (isOpen) {
      setSelectedCompanyId(
        company ? String(company.id) : availableCompanies[0] ? String(availableCompanies[0].id) : ''
      );
      setActiveTab('all');
      setCurrentPage(1);
    } else {
      setPendingAction(null);
      setDrafts({});
    }
  }, [isOpen, company, availableCompanies]);

  const effectiveCompanyId = useMemo(() => {
    const parsed = parseInt(selectedCompanyId, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }, [selectedCompanyId]);

  const {
    workspace,
    rows,
    loading,
    mutating,
    error,
    clearError,
    saveRow,
    finalizeRow,
  } = usePayrollWorkspaceResource(isOpen, effectiveCompanyId, period);

  useEffect(() => {
    if (!workspace) {
      setDrafts({});
      return;
    }
    const nextDrafts: Record<number, RowDraftValues> = {};
    for (const row of workspace.rows) {
      nextDrafts[row.employee_id] = {
        bonus: formatRawDecimal(row.bonus),
        overtime: formatRawDecimal(row.overtime),
        deduction: formatRawDecimal(row.deduction),
        thr: formatRawDecimal(row.thr),
      };
    }
    setDrafts(nextDrafts);
    setCurrentPage(1);
  }, [workspace]);

  const companyOptions = useMemo(
    () =>
      availableCompanies.map((c) => ({
        value: String(c.id),
        label: c.name,
      })),
    [availableCompanies]
  );

  const filteredRows = useMemo(() => {
    if (activeTab === 'all') {
      return rows;
    }
    return rows.filter((row) => row.payroll_group === activeTab);
  }, [rows, activeTab]);

  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedRows = useMemo(() => {
    const start = (safeCurrentPage - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, safeCurrentPage]);

  const getRowAmounts = (row: PayrollWorkspaceRow) => {
    const isFinalized = row.status === 'finalized';
    const draft = drafts[row.employee_id];
    const bonus = isFinalized
      ? row.bonus
      : parseDraftNumber(draft?.bonus ?? formatRawDecimal(row.bonus));
    const overtime = isFinalized
      ? row.overtime
      : parseDraftNumber(draft?.overtime ?? formatRawDecimal(row.overtime));
    const deduction = isFinalized
      ? row.deduction
      : parseDraftNumber(draft?.deduction ?? formatRawDecimal(row.deduction));
    const thr = isFinalized
      ? row.thr
      : parseDraftNumber(draft?.thr ?? formatRawDecimal(row.thr));

    const pph21 = isFinalized
      ? row.pph21
      : computePph21Preview(
          row.base_salary,
          row.bpjs_kesehatan,
          row.bpjs_ketenagakerjaan,
          bonus,
          overtime,
          deduction,
          thr,
          row.employee.tax_status
        );

    const totalNet = isFinalized
      ? row.total_net
      : Math.round(
          (row.base_salary +
            bonus +
            overtime +
            thr -
            (row.bpjs_kesehatan + row.bpjs_ketenagakerjaan + deduction + pph21)) *
            100
        ) / 100;

    return { bonus, overtime, deduction, thr, pph21, totalNet, isFinalized };
  };

  const totalsSummary = useMemo(() => {
    let totalNet = 0;
    let totalPph21 = 0;
    let finalizedCount = 0;

    for (const row of filteredRows) {
      const amounts = getRowAmounts(row);
      totalNet += amounts.totalNet;
      totalPph21 += amounts.pph21;
      if (amounts.isFinalized) {
        finalizedCount += 1;
      }
    }

    return {
      totalNet,
      totalPph21,
      finalizedCount,
      totalEmployees: filteredRows.length,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredRows, drafts]);

  const updateDraftField = (
    employeeId: number,
    field: keyof RowDraftValues,
    value: string
  ) => {
    clearError();
    setDrafts((prev) => ({
      ...prev,
      [employeeId]: {
        bonus: prev[employeeId]?.bonus ?? '',
        overtime: prev[employeeId]?.overtime ?? '',
        deduction: prev[employeeId]?.deduction ?? '',
        thr: prev[employeeId]?.thr ?? '',
        [field]: value,
      },
    }));
  };

  const triggerRowAction = (
    mode: 'save' | 'finalize',
    row: PayrollWorkspaceRow
  ) => {
    if (!effectiveCompanyId || !period) {
      return;
    }
    const amounts = getRowAmounts(row);
    const payload: SaveEmployeePayrollPayload = {
      company_id: effectiveCompanyId,
      employee_id: row.employee_id,
      period,
      payroll_group: row.payroll_group,
      bank_account_number: row.bank_account_number ?? null,
      bonus: amounts.bonus,
      overtime: amounts.overtime,
      deduction: amounts.deduction,
      thr: amounts.thr,
      notes: row.notes ?? null,
    };

    setPendingAction({
      mode,
      row,
      payload,
      previewPph21: amounts.pph21,
      previewTotalNet: amounts.totalNet,
    });
  };

  const handleConfirmPendingAction = async () => {
    if (!pendingAction) {
      return;
    }
    const action = pendingAction;
    setPendingAction(null);

    if (action.mode === 'finalize') {
      await finalizeRow(action.payload);
    } else {
      await saveRow(action.payload);
    }
  };

  const tabsBar = (
    <div
      role="tablist"
      aria-label="Input Payroll Tabs"
      data-testid="input-payroll-tabs"
      className="flex flex-wrap items-end gap-1 border-b border-border pl-1"
    >
      {INPUT_PAYROLL_TABS.map((tab) => {
        const isSelected = tab.key === activeTab;
        return (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={isSelected}
            data-testid={`input-payroll-tab-${tab.key}`}
            onClick={() => {
              clearError();
              setActiveTab(tab.key);
              setCurrentPage(1);
            }}
            className={cn(
              'cursor-pointer rounded-t-lg border px-4 py-1.5 text-xs transition-colors',
              isSelected
                ? 'relative z-10 -mb-px border-border border-b-card bg-card font-bold text-primary shadow-2xs'
                : 'border-transparent bg-slate-200/60 font-medium text-muted-foreground hover:bg-slate-200 hover:text-foreground'
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );

  return (
    <>
      <Modal
        isOpen={isOpen}
        title="Input Payroll"
        subtitle="Kelola input bonus, lembur, potongan, THR, kalkulasi PPh 21, dan finalisasi payroll karyawan per periode"
        testId="input-payroll-modal"
        maxWidthClass="max-w-[95vw]"
        dialogClassName="h-[92vh] max-h-[92vh]"
        bodyClassName="flex-1 min-h-0 overflow-hidden"
        onClose={onClose}
      >
        <div className="shrink-0">{tabsBar}</div>

        {error && (
          <div
            role="alert"
            className="shrink-0 rounded-lg border border-primary/30 bg-primary/5 px-3.5 py-2.5 text-sm text-primary"
          >
            {error}
          </div>
        )}

        <div className="grid shrink-0 grid-cols-1 gap-3 rounded-xl border border-border bg-muted/25 p-4 md:grid-cols-3 md:items-end">
          <SelectInput
            id="input-payroll-company-id"
            label="Pilih Perusahaan"
            labelPlacement="top"
            placeholder="Pilih perusahaan..."
            options={companyOptions}
            value={selectedCompanyId}
            onChange={(e) => {
              clearError();
              setSelectedCompanyId(e.target.value);
              setCurrentPage(1);
            }}
          />

          <TextInput
            id="input-payroll-period"
            label="Periode Bulan"
            labelPlacement="top"
            type="date"
            className="cursor-pointer select-none caret-transparent"
            value={periodDate}
            onKeyDown={(e) => {
              if (e.key !== 'Tab' && e.key !== 'Escape') {
                e.preventDefault();
              }
            }}
            onPaste={(e) => e.preventDefault()}
            onDrop={(e) => e.preventDefault()}
            onClick={(e) => {
              const input = e.currentTarget as HTMLInputElement & {
                showPicker?: () => void;
              };
              if (typeof input.showPicker === 'function') {
                try {
                  input.showPicker();
                } catch {
                  // Ignore if browser restricts programmatic picker opening
                }
              }
            }}
            onChange={(e) => {
              if (!e.target.value) {
                return;
              }
              clearError();
              setPeriodDate(e.target.value);
              setCurrentPage(1);
            }}
          />

          <div
            data-testid="input-payroll-cutoff-info"
            className="flex flex-col gap-1 rounded-lg border border-border bg-card px-3.5 py-2 text-xs"
          >
            <span className="font-semibold text-foreground">
              Cutoff Periode (Tgl {workspace?.cutoff_day ?? 22})
            </span>
            <span className="text-muted-foreground">
              {workspace
                ? `${workspace.cutoff_start_date} s/d ${workspace.cutoff_end_date} • Efektif ${workspace.effective_work_days} hari kerja`
                : 'Memuat rentang absensi...'}
            </span>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col justify-between gap-4 rounded-xl border border-border bg-card p-4">
          <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
            <SummaryBanner
              label={`Total Net Payroll (${totalsSummary.finalizedCount}/${totalsSummary.totalEmployees} Karyawan Final • PPh 21: ${formatCapitalIdr(totalsSummary.totalPph21)})`}
              value={formatCapitalIdr(totalsSummary.totalNet)}
              testId="input-payroll-summary-banner"
            />

            <div className="overflow-x-auto rounded-lg border border-border">
              <table
                className="w-full border-collapse text-left text-xs"
                data-testid="input-payroll-table"
              >
                <thead className="bg-muted/50 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <tr className="border-b border-border">
                    <th className="px-3 py-2.5">No</th>
                    <th className="px-3 py-2.5">Nama / Jabatan</th>
                    <th className="px-3 py-2.5 text-right">Pokok</th>
                    <th className="px-3 py-2.5 text-right">KS</th>
                    <th className="px-3 py-2.5 text-right">KT</th>
                    <th className="min-w-[120px] px-2 py-2.5">Bonus</th>
                    <th className="min-w-[120px] px-2 py-2.5">Lembur</th>
                    <th className="min-w-[120px] px-2 py-2.5">Potongan</th>
                    <th className="min-w-[120px] px-2 py-2.5">THR</th>
                    <th className="px-3 py-2.5 text-right">PPH 21</th>
                    <th className="px-3 py-2.5 text-right">Total</th>
                    <th className="px-3 py-2.5">Status</th>
                    <th className="px-3 py-2.5">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {loading && paginatedRows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={13}
                        className="px-4 py-8 text-center text-muted-foreground"
                      >
                        Memuat data payroll karyawan...
                      </td>
                    </tr>
                  ) : paginatedRows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={13}
                        className="px-4 py-8 text-center text-muted-foreground"
                      >
                        Belum ada data karyawan aktif untuk perusahaan dan
                        periode ini.
                      </td>
                    </tr>
                  ) : (
                    paginatedRows.map((row, index) => {
                      const amounts = getRowAmounts(row);
                      const draft = drafts[row.employee_id] ?? {
                        bonus: formatRawDecimal(row.bonus),
                        overtime: formatRawDecimal(row.overtime),
                        deduction: formatRawDecimal(row.deduction),
                        thr: formatRawDecimal(row.thr),
                      };
                      const rowNumber =
                        (safeCurrentPage - 1) * pageSize + index + 1;

                      return (
                        <tr
                          key={row.employee_id}
                          data-testid={`payroll-row-${row.employee_id}`}
                          className="hover:bg-muted/20"
                        >
                          <td className="px-3 py-2.5 align-middle">
                            <code>{rowNumber}</code>
                          </td>
                          <td className="px-3 py-2.5 align-middle">
                            <div className="font-semibold text-foreground">
                              {row.employee.name}
                            </div>
                            <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                              <span>
                                {row.employee.employee_position?.name ?? '-'}
                              </span>
                              <span>•</span>
                              <span
                                data-testid={`payroll-attendance-${row.employee_id}`}
                              >
                                Hadir {row.attendance_days}/
                                {row.effective_work_days} hr
                              </span>
                              {row.employee.tax_status?.code && (
                                <>
                                  <span>•</span>
                                  <span>{row.employee.tax_status.code}</span>
                                </>
                              )}
                            </div>
                          </td>
                          <td
                            className="whitespace-nowrap px-3 py-2.5 text-right align-middle font-medium"
                            data-testid={`payroll-base-salary-${row.employee_id}`}
                          >
                            {formatCapitalIdr(row.base_salary)}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2.5 text-right align-middle text-muted-foreground">
                            {formatCapitalIdr(row.bpjs_kesehatan)}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2.5 text-right align-middle text-muted-foreground">
                            {formatCapitalIdr(row.bpjs_ketenagakerjaan)}
                          </td>
                          <td className="px-2 py-2 align-middle">
                            {amounts.isFinalized ? (
                              <span className="block text-right font-medium">
                                {formatCapitalIdr(amounts.bonus)}
                              </span>
                            ) : (
                              <DecimalInput
                                id={`payroll-bonus-${row.employee_id}`}
                                aria-label={`Bonus ${row.employee.name}`}
                                className="h-8 text-right text-xs"
                                placeholder="0"
                                value={draft.bonus}
                                onChange={(val) =>
                                  updateDraftField(
                                    row.employee_id,
                                    'bonus',
                                    val
                                  )
                                }
                              />
                            )}
                          </td>
                          <td className="px-2 py-2 align-middle">
                            {amounts.isFinalized ? (
                              <span className="block text-right font-medium">
                                {formatCapitalIdr(amounts.overtime)}
                              </span>
                            ) : (
                              <DecimalInput
                                id={`payroll-overtime-${row.employee_id}`}
                                aria-label={`Lembur ${row.employee.name}`}
                                className="h-8 text-right text-xs"
                                placeholder="0"
                                value={draft.overtime}
                                onChange={(val) =>
                                  updateDraftField(
                                    row.employee_id,
                                    'overtime',
                                    val
                                  )
                                }
                              />
                            )}
                          </td>
                          <td className="px-2 py-2 align-middle">
                            {amounts.isFinalized ? (
                              <span className="block text-right font-medium">
                                {formatCapitalIdr(amounts.deduction)}
                              </span>
                            ) : (
                              <DecimalInput
                                id={`payroll-deduction-${row.employee_id}`}
                                aria-label={`Potongan ${row.employee.name}`}
                                className="h-8 text-right text-xs"
                                placeholder="0"
                                value={draft.deduction}
                                onChange={(val) =>
                                  updateDraftField(
                                    row.employee_id,
                                    'deduction',
                                    val
                                  )
                                }
                              />
                            )}
                          </td>
                          <td className="px-2 py-2 align-middle">
                            {amounts.isFinalized ? (
                              <span className="block text-right font-medium">
                                {formatCapitalIdr(amounts.thr)}
                              </span>
                            ) : (
                              <DecimalInput
                                id={`payroll-thr-${row.employee_id}`}
                                aria-label={`THR ${row.employee.name}`}
                                className="h-8 text-right text-xs"
                                placeholder="0"
                                value={draft.thr}
                                onChange={(val) =>
                                  updateDraftField(row.employee_id, 'thr', val)
                                }
                              />
                            )}
                          </td>
                          <td
                            className="whitespace-nowrap px-3 py-2.5 text-right align-middle font-medium text-amber-700 dark:text-amber-400"
                            data-testid={`payroll-pph21-${row.employee_id}`}
                          >
                            {formatCapitalIdr(amounts.pph21)}
                          </td>
                          <td
                            className="whitespace-nowrap px-3 py-2.5 text-right align-middle font-bold text-foreground"
                            data-testid={`payroll-total-net-${row.employee_id}`}
                          >
                            {formatCapitalIdr(amounts.totalNet)}
                          </td>
                          <td className="px-3 py-2.5 align-middle">
                            <Badge
                              variant={amounts.isFinalized ? 'ok' : 'neutral'}
                              data-testid={`payroll-status-${row.employee_id}`}
                            >
                              {amounts.isFinalized ? 'Final' : 'Draf'}
                            </Badge>
                          </td>
                          <td className="px-3 py-2.5 align-middle">
                            {amounts.isFinalized ? (
                              <span
                                data-testid={`finalized-badge-row-${row.employee_id}`}
                                className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400"
                              >
                                Sudah Final
                              </span>
                            ) : (
                              <div className="flex flex-nowrap items-center gap-1.5 whitespace-nowrap">
                                <Button
                                  type="button"
                                  variant="secondary"
                                  className="h-7 px-2.5 py-1 text-xs"
                                  disabled={mutating || amounts.totalNet < 0}
                                  data-testid={`save-payroll-row-${row.employee_id}`}
                                  onClick={() => triggerRowAction('save', row)}
                                >
                                  Simpan
                                </Button>
                                <Button
                                  type="button"
                                  variant="primary"
                                  className="h-7 px-2.5 py-1 text-xs"
                                  disabled={mutating || amounts.totalNet < 0}
                                  data-testid={`finalize-payroll-row-${row.employee_id}`}
                                  onClick={() =>
                                    triggerRowAction('finalize', row)
                                  }
                                >
                                  Finalisasi
                                </Button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="shrink-0 border-t border-border pt-3">
            <Pagination
              currentPage={safeCurrentPage}
              totalPages={totalPages}
              totalItems={filteredRows.length}
              testId="input-payroll-modal-pagination"
              onPageChange={setCurrentPage}
            />
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={isOpen && pendingAction !== null}
        title={
          pendingAction?.mode === 'finalize'
            ? 'Konfirmasi Finalisasi Payroll'
            : 'Konfirmasi Simpan Draf Payroll'
        }
        message={
          pendingAction ? (
            <div className="space-y-1.5">
              <p>
                {pendingAction.mode === 'finalize'
                  ? `Finalisasi payroll untuk ${pendingAction.row.employee.name} pada periode ${period}? Setelah difinalisasi, baris ini akan terkunci.`
                  : `Simpan draf payroll untuk ${pendingAction.row.employee.name} pada periode ${period}?`}
              </p>
              <p className="text-xs font-medium text-foreground">
                PPh 21: {formatCapitalIdr(pendingAction.previewPph21)} • Total
                Net: {formatCapitalIdr(pendingAction.previewTotalNet)}
              </p>
            </div>
          ) : (
            ''
          )
        }
        confirmLabel={
          pendingAction?.mode === 'finalize' ? 'Ya, Finalisasi' : 'Ya, Simpan'
        }
        loading={mutating}
        testId="input-payroll-confirm-dialog"
        onConfirm={handleConfirmPendingAction}
        onCancel={() => setPendingAction(null)}
      />
    </>
  );
};
