import React, { useMemo, useRef } from 'react';
import type { Company, PayrollWorkspaceRow } from '@/api/client';
import { Badge, Button, Modal } from '@/components/ui';
import { formatCapitalIdr } from '@/modules/CFO/CapitalCompanyCrudModal';
import {
  computePayrollDetailBreakdown,
  formatBirthDateId,
  formatPeriodMonthYear,
} from './payrollCalculations';

export interface PayrollDetailModalProps {
  isOpen: boolean;
  row: PayrollWorkspaceRow | null;
  company: Company | null;
  period: string;
  cutoffStartDate?: string;
  cutoffEndDate?: string;
  onClose: () => void;
}

function formatDeductionParen(amount: number): string {
  if (!amount) {
    return formatCapitalIdr(0);
  }
  return `(${formatCapitalIdr(amount)})`;
}

function formatFinalizedAt(isoString?: string | null): string | null {
  if (!isoString) {
    return null;
  }
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) {
    return isoString;
  }
  return date.toLocaleString('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export const PayrollDetailModal: React.FC<PayrollDetailModalProps> = ({
  isOpen,
  row,
  company,
  period,
  cutoffStartDate,
  cutoffEndDate,
  onClose,
}) => {
  const printAreaRef = useRef<HTMLDivElement | null>(null);

  const breakdown = useMemo(
    () => (row ? computePayrollDetailBreakdown(row) : null),
    [row]
  );

  if (!row || !breakdown) {
    return null;
  }

  const employee = row.employee;
  const companyName = company?.name ?? employee.company?.name ?? '-';
  const periodLabel = formatPeriodMonthYear(period);
  const birthInfo =
    [employee.birth_place, formatBirthDateId(employee.birth_date)]
      .filter(Boolean)
      .join(', ') || '-';
  const grade = employee.payroll_grade;
  const gradeLabel = grade
    ? `Grade ${grade.grade}${grade.sub_grade}${grade.level_label ? ` (${grade.level_label})` : ''}`
    : '-';
  const finalizedAtLabel = formatFinalizedAt(row.finalized_at);

  const handlePrint = () => {
    const contentEl = printAreaRef.current;
    if (!contentEl) {
      window.print();
      return;
    }

    const printWindow = window.open('', '_blank', 'width=960,height=800');
    if (!printWindow) {
      window.print();
      return;
    }

    const titleText = `Slip Gaji - ${employee.name} (${periodLabel})`;
    printWindow.document.open();
    printWindow.document.write(`<!doctype html>
<html lang="id">
<head>
  <meta charset="utf-8" />
  <title>Slip Gaji</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #111827;
      margin: 24px;
      font-size: 12px;
      line-height: 1.45;
    }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #d1d5db; padding: 5px 8px; vertical-align: top; }
    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .font-bold { font-weight: 700; }
    .font-semibold { font-weight: 600; }
    .muted { color: #4b5563; }
    .grid-3 { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; margin-bottom: 16px; }
    .grid-2 { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; margin-top: 16px; }
    .section { margin-bottom: 18px; }
    .slip-page { page-break-before: always; border: 1px solid #9ca3af; padding: 16px; border-radius: 6px; }
    .meta-row { display: flex; justify-content: space-between; gap: 8px; font-size: 11px; margin-bottom: 3px; }
    @media print {
      body { margin: 12px; }
    }
  </style>
</head>
<body>
  ${contentEl.innerHTML}
</body>
</html>`);
    printWindow.document.close();
    printWindow.document.title = titleText;
    printWindow.focus();
    printWindow.print();
  };

  return (
    <Modal
      isOpen={isOpen}
      title={`Detail & Slip Gaji • ${employee.name}`}
      subtitle={`${companyName} • Periode ${periodLabel}`}
      testId="payroll-detail-modal"
      maxWidthClass="max-w-5xl"
      dialogClassName="h-[90vh] max-h-[90vh]"
      bodyClassName="flex-1 min-h-0 overflow-y-auto"
      onClose={onClose}
      footer={
        <>
          <Button
            type="button"
            variant="secondary"
            data-testid="payroll-detail-print-btn"
            onClick={handlePrint}
          >
            Cetak / Simpan PDF
          </Button>
          <Button
            type="button"
            variant="primary"
            data-testid="payroll-detail-close-btn"
            onClick={onClose}
          >
            Tutup
          </Button>
        </>
      }
    >
      <div
        ref={printAreaRef}
        className="flex flex-col gap-6 text-xs text-foreground"
        data-testid="payroll-detail-content"
      >
        {/* Document Header & Status */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-2xs">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-3">
            <div>
              <h3 className="text-base font-bold tracking-tight text-foreground">
                {companyName}
              </h3>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                Rincian Perhitungan Payroll Karyawan
                {cutoffStartDate && cutoffEndDate
                  ? ` • Cutoff ${cutoffStartDate} s/d ${cutoffEndDate}`
                  : ''}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1 text-right">
              <div className="flex items-center gap-2">
                <Badge variant="ok">Sudah Final</Badge>
                <span className="font-semibold text-foreground">
                  Periode : {periodLabel}
                </span>
              </div>
              {finalizedAtLabel && (
                <span className="text-[11px] text-muted-foreground">
                  Difinalisasi: {finalizedAtLabel}
                </span>
              )}
            </div>
          </div>

          {/* 3-Column Employee Info (adapted to current Employee + PayrollItem schema) */}
          <div className="grid-3 mt-4 grid grid-cols-1 gap-x-6 gap-y-2 md:grid-cols-3">
            <div className="space-y-1.5">
              <div className="meta-row flex justify-between gap-2">
                <span className="text-muted-foreground">Nama Lengkap</span>
                <span className="text-right font-semibold">{employee.name}</span>
              </div>
              <div className="meta-row flex justify-between gap-2">
                <span className="text-muted-foreground">Jabatan</span>
                <span className="text-right font-medium">
                  {employee.employee_position?.name ?? '-'}
                </span>
              </div>
              <div className="meta-row flex justify-between gap-2">
                <span className="text-muted-foreground">Kode Absensi</span>
                <span className="text-right font-mono font-medium">
                  {employee.employee_attendance_code ?? '-'}
                </span>
              </div>
              <div className="meta-row flex justify-between gap-2">
                <span className="text-muted-foreground">Status Pegawai</span>
                <span className="text-right font-medium">
                  {employee.employment_status?.name ?? '-'}
                </span>
              </div>
              <div className="meta-row flex justify-between gap-2">
                <span className="text-muted-foreground">Kehadiran</span>
                <span className="text-right font-medium">
                  {row.attendance_days}/{row.effective_work_days} hari (
                  {row.payroll_group === 'outlet' ? 'Outlet' : 'Office'})
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="meta-row flex justify-between gap-2">
                <span className="text-muted-foreground">NIK KTP</span>
                <span className="text-right font-mono font-medium">
                  {employee.nik_ktp ?? '-'}
                </span>
              </div>
              <div className="meta-row flex justify-between gap-2">
                <span className="text-muted-foreground">No. HP</span>
                <span className="text-right font-medium">
                  {employee.phone ?? employee.whatsapp_number ?? '-'}
                </span>
              </div>
              <div className="meta-row flex justify-between gap-2">
                <span className="text-muted-foreground">Email</span>
                <span className="text-right font-medium break-all">
                  {employee.email ?? '-'}
                </span>
              </div>
              <div className="meta-row flex justify-between gap-2">
                <span className="text-muted-foreground">Tempat, Tgl Lahir</span>
                <span className="text-right font-medium">{birthInfo}</span>
              </div>
              <div className="meta-row flex justify-between gap-2">
                <span className="text-muted-foreground">Golongan</span>
                <span className="text-right font-medium">{gradeLabel}</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="meta-row flex justify-between gap-2">
                <span className="text-muted-foreground">No. Rek</span>
                <span className="text-right font-mono font-medium">
                  {row.bank_account_number ?? '-'}
                </span>
              </div>
              <div className="meta-row flex justify-between gap-2">
                <span className="text-muted-foreground">No. NPWP</span>
                <span className="text-right font-mono font-medium">
                  {employee.npwp_number ?? '-'}
                </span>
              </div>
              <div className="meta-row flex justify-between gap-2">
                <span className="text-muted-foreground">No. BPJS KS</span>
                <span className="text-right font-mono font-medium">
                  {employee.bpjs_kesehatan ?? '-'}
                </span>
              </div>
              <div className="meta-row flex justify-between gap-2">
                <span className="text-muted-foreground">No. BPJS KT</span>
                <span className="text-right font-mono font-medium">
                  {employee.bpjs_ketenagakerjaan ?? '-'}
                </span>
              </div>
              <div className="meta-row flex justify-between gap-2">
                <span className="text-muted-foreground">PTKP</span>
                <span className="text-right font-semibold">
                  {breakdown.pph21Breakdown.ptkpCode}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Page 1 & Page 2 Top: Rincian Perhitungan Gaji, BPJS, & PPh 21 */}
        <div className="section overflow-x-auto rounded-xl border border-border bg-card">
          <table
            className="w-full border-collapse text-xs"
            data-testid="payroll-detail-breakdown-table"
          >
            <tbody className="divide-y divide-border">
              {/* Gaji Pokok */}
              <tr>
                <td
                  rowSpan={2}
                  className="w-48 bg-muted/30 px-3 py-2 align-top font-semibold"
                >
                  Gaji Pokok
                  <div className="mt-0.5 text-[10px] font-normal text-muted-foreground">
                    Prorata {row.attendance_days}/{row.effective_work_days} hr
                  </div>
                </td>
                <td className="px-3 py-2 text-muted-foreground">Gaji Pokok</td>
                <td className="w-40 px-3 py-2 text-right font-medium">
                  {formatCapitalIdr(breakdown.gajiPokok)}
                </td>
                <td
                  rowSpan={2}
                  className="w-44 bg-muted/15 px-3 py-2 text-right align-middle font-bold"
                >
                  {formatCapitalIdr(breakdown.gajiTotal)}
                </td>
              </tr>
              <tr>
                <td className="px-3 py-2 text-muted-foreground">
                  Tunjangan Jabatan
                </td>
                <td className="px-3 py-2 text-right font-medium">
                  {formatCapitalIdr(breakdown.tunjanganJabatan)}
                </td>
              </tr>

              {/* BPJS Ditanggung Kantor */}
              <tr>
                <td
                  rowSpan={2}
                  className="bg-muted/30 px-3 py-2 align-top font-semibold"
                >
                  BPJS ditanggung kantor
                </td>
                <td className="px-3 py-2 text-muted-foreground">
                  BPJS Kesehatan (4.00%)
                </td>
                <td className="px-3 py-2 text-right font-medium">
                  {formatCapitalIdr(breakdown.bpjsKsCompany)}
                </td>
                <td
                  rowSpan={2}
                  className="bg-muted/15 px-3 py-2 text-right align-middle font-bold"
                >
                  {formatCapitalIdr(breakdown.bpjsCompanyTotal)}
                </td>
              </tr>
              <tr>
                <td className="px-3 py-2 text-muted-foreground">
                  BPJS Ketenagakerjaan (3.94%)
                </td>
                <td className="px-3 py-2 text-right font-medium">
                  {formatCapitalIdr(breakdown.bpjsKtCompany)}
                </td>
              </tr>

              {/* BPJS Ditanggung Pribadi */}
              <tr>
                <td
                  rowSpan={2}
                  className="bg-muted/30 px-3 py-2 align-top font-semibold"
                >
                  BPJS ditanggung pribadi
                </td>
                <td className="px-3 py-2 text-muted-foreground">
                  BPJS Kesehatan (1.00%)
                </td>
                <td className="px-3 py-2 text-right font-medium">
                  {formatCapitalIdr(breakdown.bpjsKsEmployee)}
                </td>
                <td
                  rowSpan={2}
                  className="bg-muted/15 px-3 py-2 text-right align-middle font-bold"
                >
                  {formatCapitalIdr(breakdown.bpjsEmployeeTotal)}
                </td>
              </tr>
              <tr>
                <td className="px-3 py-2 text-muted-foreground">
                  BPJS Ketenagakerjaan (2.00%)
                </td>
                <td className="px-3 py-2 text-right font-medium">
                  {formatCapitalIdr(breakdown.bpjsKtEmployee)}
                </td>
              </tr>

              {/* Penghasilan & Input Komponen */}
              <tr>
                <td colSpan={3} className="px-3 py-2 font-semibold">
                  Penghasilan (Gaji - BPJS Pribadi)
                </td>
                <td className="px-3 py-2 text-right font-semibold">
                  {formatCapitalIdr(breakdown.penghasilanSetelahBpjs)}
                </td>
              </tr>
              <tr>
                <td colSpan={3} className="px-3 py-2">
                  Bonus
                </td>
                <td className="px-3 py-2 text-right font-medium">
                  {formatCapitalIdr(breakdown.bonus)}
                </td>
              </tr>
              <tr>
                <td colSpan={3} className="px-3 py-2">
                  Lembur
                </td>
                <td className="px-3 py-2 text-right font-medium">
                  {formatCapitalIdr(breakdown.overtime)}
                </td>
              </tr>
              <tr>
                <td colSpan={3} className="px-3 py-2">
                  Potongan Gaji
                </td>
                <td className="px-3 py-2 text-right font-medium">
                  {formatCapitalIdr(breakdown.deduction)}
                </td>
              </tr>
              <tr>
                <td colSpan={3} className="px-3 py-2">
                  THR
                </td>
                <td className="px-3 py-2 text-right font-medium">
                  {formatCapitalIdr(breakdown.thr)}
                </td>
              </tr>
              <tr className="bg-muted/25">
                <td colSpan={3} className="px-3 py-2 font-bold">
                  Penghasilan Bruto / Dasar Pajak (Bulanan)
                </td>
                <td className="px-3 py-2 text-right font-bold">
                  {formatCapitalIdr(
                    breakdown.pph21Breakdown.monthlyTaxableIncome
                  )}
                </td>
              </tr>
              <tr>
                <td colSpan={3} className="px-3 py-2 text-muted-foreground">
                  Pengurangan Biaya Jabatan (5%/thn, maks Rp 6.000.000)
                </td>
                <td className="px-3 py-2 text-right font-medium">
                  {formatCapitalIdr(
                    breakdown.pph21Breakdown.biayaJabatanMonthly
                  )}
                </td>
              </tr>
              <tr className="bg-muted/25">
                <td colSpan={3} className="px-3 py-2 font-bold">
                  Penghasilan Netto (Bulanan)
                </td>
                <td className="px-3 py-2 text-right font-bold">
                  {formatCapitalIdr(breakdown.pph21Breakdown.monthlyNet)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* PPh 21 Summary (Pasal 17 Annualized - current Backend calculation) */}
        <div className="section overflow-x-auto rounded-xl border border-border bg-card">
          <table
            className="w-full border-collapse text-xs"
            data-testid="payroll-detail-pph21-table"
          >
            <tbody className="divide-y divide-border">
              <tr>
                <td className="w-64 bg-muted/30 px-3 py-2 font-medium">
                  Metode Kalkulasi PPh 21
                </td>
                <td className="px-3 py-2 text-right font-semibold">
                  Pasal 17 Progresif (Disetahunkan)
                </td>
              </tr>
              <tr>
                <td className="bg-muted/30 px-3 py-2 font-medium">
                  PTKP ({breakdown.pph21Breakdown.ptkpCode}) / Tahun
                </td>
                <td className="px-3 py-2 text-right font-medium">
                  {formatCapitalIdr(breakdown.pph21Breakdown.ptkpAnnual)}
                </td>
              </tr>
              <tr>
                <td className="bg-muted/30 px-3 py-2 font-medium">
                  Penghasilan Kena Pajak (PKP) Setahun
                </td>
                <td className="px-3 py-2 text-right font-medium">
                  {formatCapitalIdr(breakdown.pph21Breakdown.pkpAnnual)}
                </td>
              </tr>
              <tr className="bg-amber-50/70 dark:bg-amber-950/25">
                <td className="px-3 py-2 font-bold">
                  Pajak PPh 21 Terutang (Bulanan)
                </td>
                <td className="px-3 py-2 text-right font-bold text-amber-700 dark:text-amber-400">
                  {formatCapitalIdr(breakdown.pph21)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Page 2 Bottom: Side-by-Side Kantor Mengeluarkan vs Gaji yang Diterima */}
        <div className="grid-2 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <table
              className="w-full border-collapse text-xs"
              data-testid="payroll-detail-company-cost-table"
            >
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th colSpan={2} className="px-3 py-2 text-center font-bold">
                    Kantor mengeluarkan
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <tr>
                  <td className="px-3 py-1.5">Gaji Pokok</td>
                  <td className="px-3 py-1.5 text-right font-medium">
                    {formatCapitalIdr(breakdown.gajiPokok)}
                  </td>
                </tr>
                <tr>
                  <td className="px-3 py-1.5">Tunjangan Jabatan</td>
                  <td className="px-3 py-1.5 text-right font-medium">
                    {formatCapitalIdr(breakdown.tunjanganJabatan)}
                  </td>
                </tr>
                <tr>
                  <td className="px-3 py-1.5">BPJS KS</td>
                  <td className="px-3 py-1.5 text-right font-medium">
                    {formatCapitalIdr(breakdown.bpjsKsCompany)}
                  </td>
                </tr>
                <tr>
                  <td className="px-3 py-1.5">BPJS KT</td>
                  <td className="px-3 py-1.5 text-right font-medium">
                    {formatCapitalIdr(breakdown.bpjsKtCompany)}
                  </td>
                </tr>
                <tr>
                  <td className="px-3 py-1.5">Bonus</td>
                  <td className="px-3 py-1.5 text-right font-medium">
                    {formatCapitalIdr(breakdown.bonus)}
                  </td>
                </tr>
                <tr>
                  <td className="px-3 py-1.5">Lembur</td>
                  <td className="px-3 py-1.5 text-right font-medium">
                    {formatCapitalIdr(breakdown.overtime)}
                  </td>
                </tr>
                <tr>
                  <td className="px-3 py-1.5">THR</td>
                  <td className="px-3 py-1.5 text-right font-medium">
                    {formatCapitalIdr(breakdown.thr)}
                  </td>
                </tr>
                <tr className="bg-muted/35 font-bold">
                  <td className="px-3 py-2">Total</td>
                  <td className="px-3 py-2 text-right">
                    {formatCapitalIdr(breakdown.kantorMengeluarkanTotal)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <table
              className="w-full border-collapse text-xs"
              data-testid="payroll-detail-employee-net-table"
            >
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th colSpan={2} className="px-3 py-2 text-center font-bold">
                    Gaji yang diterima
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <tr>
                  <td className="px-3 py-1.5">Gaji Pokok</td>
                  <td className="px-3 py-1.5 text-right font-medium">
                    {formatCapitalIdr(breakdown.gajiPokok)}
                  </td>
                </tr>
                <tr>
                  <td className="px-3 py-1.5">Tunjangan Jabatan</td>
                  <td className="px-3 py-1.5 text-right font-medium">
                    {formatCapitalIdr(breakdown.tunjanganJabatan)}
                  </td>
                </tr>
                <tr>
                  <td className="px-3 py-1.5">Bonus</td>
                  <td className="px-3 py-1.5 text-right font-medium">
                    {formatCapitalIdr(breakdown.bonus)}
                  </td>
                </tr>
                <tr>
                  <td className="px-3 py-1.5">Lembur</td>
                  <td className="px-3 py-1.5 text-right font-medium">
                    {formatCapitalIdr(breakdown.overtime)}
                  </td>
                </tr>
                <tr>
                  <td className="px-3 py-1.5">THR</td>
                  <td className="px-3 py-1.5 text-right font-medium">
                    {formatCapitalIdr(breakdown.thr)}
                  </td>
                </tr>
                <tr>
                  <td className="px-3 py-1.5">BPJS KS</td>
                  <td className="px-3 py-1.5 text-right font-medium text-muted-foreground">
                    {formatDeductionParen(breakdown.bpjsKsEmployee)}
                  </td>
                </tr>
                <tr>
                  <td className="px-3 py-1.5">BPJS KT</td>
                  <td className="px-3 py-1.5 text-right font-medium text-muted-foreground">
                    {formatDeductionParen(breakdown.bpjsKtEmployee)}
                  </td>
                </tr>
                <tr>
                  <td className="px-3 py-1.5">PPh 21</td>
                  <td className="px-3 py-1.5 text-right font-medium text-muted-foreground">
                    {formatDeductionParen(breakdown.pph21)}
                  </td>
                </tr>
                <tr>
                  <td className="px-3 py-1.5">Potongan Gaji</td>
                  <td className="px-3 py-1.5 text-right font-medium text-muted-foreground">
                    {formatDeductionParen(breakdown.deduction)}
                  </td>
                </tr>
                <tr className="bg-muted/35 font-bold">
                  <td className="px-3 py-2">Total</td>
                  <td className="px-3 py-2 text-right">
                    {formatCapitalIdr(breakdown.gajiDiterimaTotal)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Page 3: Slip Gaji */}
        <div
          className="slip-page rounded-xl border-2 border-border bg-card p-5"
          data-testid="payroll-detail-slip-gaji"
        >
          <div className="flex flex-wrap items-start justify-between gap-4 border-b-2 border-foreground/80 pb-3">
            <div>
              <h4 className="text-base font-extrabold uppercase tracking-widest">
                SLIP GAJI
              </h4>
              <p className="mt-0.5 text-sm font-bold uppercase tracking-wide text-foreground">
                {periodLabel.toUpperCase()}
              </p>
            </div>
            <div className="text-right">
              <p className="font-bold text-foreground">{companyName}</p>
              {cutoffStartDate && cutoffEndDate && (
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  Periode Absensi: {cutoffStartDate} s/d {cutoffEndDate}
                </p>
              )}
              <p className="text-[11px] text-muted-foreground">
                Hadir {row.attendance_days}/{row.effective_work_days} hari kerja
              </p>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-x-6 gap-y-1.5 border-b border-border pb-3 sm:grid-cols-3">
            <div className="flex justify-between gap-2 sm:justify-start sm:gap-3">
              <span className="text-muted-foreground">NIK :</span>
              <span className="font-mono font-medium">
                {employee.nik_ktp ?? '-'}
              </span>
            </div>
            <div className="flex justify-between gap-2 sm:justify-start sm:gap-3">
              <span className="text-muted-foreground">Jabatan :</span>
              <span className="font-medium">
                {employee.employee_position?.name ?? '-'}
              </span>
            </div>
            <div className="flex justify-between gap-2 sm:justify-start sm:gap-3">
              <span className="text-muted-foreground">Status :</span>
              <span className="font-medium">
                {employee.employment_status?.name ?? '-'}
              </span>
            </div>
            <div className="flex justify-between gap-2 sm:justify-start sm:gap-3">
              <span className="text-muted-foreground">Nama :</span>
              <span className="font-semibold">{employee.name}</span>
            </div>
            <div className="flex justify-between gap-2 sm:justify-start sm:gap-3">
              <span className="text-muted-foreground">PTKP :</span>
              <span className="font-medium">
                {breakdown.pph21Breakdown.ptkpCode}
              </span>
            </div>
            <div className="flex justify-between gap-2 sm:justify-start sm:gap-3">
              <span className="text-muted-foreground">No. Rek :</span>
              <span className="font-mono font-medium">
                {row.bank_account_number ?? '-'}
              </span>
            </div>
          </div>

          <div className="grid-2 mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="overflow-hidden rounded-lg border border-border">
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th
                      colSpan={2}
                      className="px-3 py-2 text-left text-[11px] font-bold uppercase tracking-[0.2em]"
                    >
                      PENDAPATAN
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  <tr>
                    <td className="px-3 py-1.5">Gaji Pokok</td>
                    <td className="px-3 py-1.5 text-right font-medium">
                      {formatCapitalIdr(breakdown.gajiPokok)}
                    </td>
                  </tr>
                  <tr>
                    <td className="px-3 py-1.5">Tunjangan Jabatan</td>
                    <td className="px-3 py-1.5 text-right font-medium">
                      {formatCapitalIdr(breakdown.tunjanganJabatan)}
                    </td>
                  </tr>
                  <tr>
                    <td className="px-3 py-1.5">Lembur</td>
                    <td className="px-3 py-1.5 text-right font-medium">
                      {formatCapitalIdr(breakdown.overtime)}
                    </td>
                  </tr>
                  <tr>
                    <td className="px-3 py-1.5">BPJS KS</td>
                    <td className="px-3 py-1.5 text-right font-medium">
                      {formatCapitalIdr(breakdown.bpjsKsCompany)}
                    </td>
                  </tr>
                  <tr>
                    <td className="px-3 py-1.5">BPJS KT</td>
                    <td className="px-3 py-1.5 text-right font-medium">
                      {formatCapitalIdr(breakdown.bpjsKtCompany)}
                    </td>
                  </tr>
                  <tr>
                    <td className="px-3 py-1.5">Bonus</td>
                    <td className="px-3 py-1.5 text-right font-medium">
                      {formatCapitalIdr(breakdown.bonus)}
                    </td>
                  </tr>
                  <tr>
                    <td className="px-3 py-1.5">THR</td>
                    <td className="px-3 py-1.5 text-right font-medium">
                      {formatCapitalIdr(breakdown.thr)}
                    </td>
                  </tr>
                  <tr className="bg-muted/35 font-bold">
                    <td className="px-3 py-2">Total</td>
                    <td className="px-3 py-2 text-right">
                      {formatCapitalIdr(breakdown.slipPendapatanTotal)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="flex flex-col justify-between overflow-hidden rounded-lg border border-border">
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th
                      colSpan={2}
                      className="px-3 py-2 text-left text-[11px] font-bold uppercase tracking-[0.2em]"
                    >
                      PEMOTONGAN
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  <tr>
                    <td className="px-3 py-1.5">BPJS Kesehatan</td>
                    <td className="px-3 py-1.5 text-right font-medium">
                      {formatCapitalIdr(breakdown.slipBpjsKesehatanDeduction)}
                    </td>
                  </tr>
                  <tr>
                    <td className="px-3 py-1.5">BPJS Ketenagakerjaan</td>
                    <td className="px-3 py-1.5 text-right font-medium">
                      {formatCapitalIdr(
                        breakdown.slipBpjsKetenagakerjaanDeduction
                      )}
                    </td>
                  </tr>
                  <tr>
                    <td className="px-3 py-1.5">PPh 21</td>
                    <td className="px-3 py-1.5 text-right font-medium">
                      {formatCapitalIdr(breakdown.pph21)}
                    </td>
                  </tr>
                  <tr>
                    <td className="px-3 py-1.5">Potongan Gaji</td>
                    <td className="px-3 py-1.5 text-right font-medium">
                      {formatCapitalIdr(breakdown.deduction)}
                    </td>
                  </tr>
                  <tr className="bg-muted/35 font-bold">
                    <td className="px-3 py-2">Total Pemotongan</td>
                    <td className="px-3 py-2 text-right">
                      {formatCapitalIdr(breakdown.slipPemotonganTotal)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3">
            <span className="text-xs font-extrabold uppercase tracking-wider text-foreground">
              GAJI BERSIH DITERIMA
            </span>
            <span
              className="text-base font-extrabold text-primary"
              data-testid="payroll-detail-net-received"
            >
              {formatCapitalIdr(breakdown.slipGajiBersih)}
            </span>
          </div>

          {row.notes && (
            <p className="mt-3 text-[11px] text-muted-foreground">
              Catatan: {row.notes}
            </p>
          )}
        </div>
      </div>
    </Modal>
  );
};
