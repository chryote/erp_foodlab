import type { PayrollWorkspaceRow, TaxStatus } from '@/api/client';

export const PTKP_BY_CODE: Record<string, number> = {
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

const INDONESIAN_MONTHS = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function resolvePtkpInfo(taxStatus?: TaxStatus | null): {
  code: string;
  annualAmount: number;
} {
  if (!taxStatus) {
    return { code: 'TK/0', annualAmount: 54_000_000 };
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
      return { code: candidate, annualAmount: PTKP_BY_CODE[candidate] };
    }
    const match = candidate.match(/(K\/I\/[0-3]|K\/[0-3]|TK\/[0-3])/);
    if (match && PTKP_BY_CODE[match[1]]) {
      return { code: match[1], annualAmount: PTKP_BY_CODE[match[1]] };
    }
    const compact = candidate.match(/^(TK|K)([0-3])$/);
    if (compact) {
      const code = `${compact[1]}/${compact[2]}`;
      if (PTKP_BY_CODE[code]) {
        return { code, annualAmount: PTKP_BY_CODE[code] };
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
        return { code: key, annualAmount: PTKP_BY_CODE[key] };
      }
    }
  }
  return {
    code: taxStatus.code?.trim() || 'TK/0',
    annualAmount: 54_000_000,
  };
}

export interface Pph21Breakdown {
  monthlyTaxableIncome: number;
  annualGross: number;
  biayaJabatanAnnual: number;
  biayaJabatanMonthly: number;
  annualNet: number;
  monthlyNet: number;
  ptkpCode: string;
  ptkpAnnual: number;
  pkpAnnual: number;
  annualTax: number;
  monthlyPph21: number;
}

export function computePph21Breakdown(
  baseSalary: number,
  bpjsKesehatan: number,
  bpjsKetenagakerjaan: number,
  bonus: number,
  overtime: number,
  deduction: number,
  thr: number,
  taxStatus?: TaxStatus | null
): Pph21Breakdown {
  const ptkp = resolvePtkpInfo(taxStatus);
  const monthlyTaxableIncome = Math.max(
    0,
    round2(
      baseSalary +
        bonus +
        overtime +
        thr -
        (bpjsKesehatan + bpjsKetenagakerjaan + deduction)
    )
  );

  if (monthlyTaxableIncome <= 0) {
    return {
      monthlyTaxableIncome: 0,
      annualGross: 0,
      biayaJabatanAnnual: 0,
      biayaJabatanMonthly: 0,
      annualNet: 0,
      monthlyNet: 0,
      ptkpCode: ptkp.code,
      ptkpAnnual: ptkp.annualAmount,
      pkpAnnual: 0,
      annualTax: 0,
      monthlyPph21: 0,
    };
  }

  const annualGross = round2(monthlyTaxableIncome * 12);
  const biayaJabatanAnnual = round2(Math.min(6_000_000, annualGross * 0.05));
  const biayaJabatanMonthly = round2(biayaJabatanAnnual / 12);
  const annualNet = Math.max(0, round2(annualGross - biayaJabatanAnnual));
  const monthlyNet = Math.max(
    0,
    round2(monthlyTaxableIncome - biayaJabatanMonthly)
  );
  const pkpAnnual = Math.max(
    0,
    Math.floor((annualNet - ptkp.annualAmount) / 1000) * 1000
  );

  if (pkpAnnual <= 0) {
    return {
      monthlyTaxableIncome,
      annualGross,
      biayaJabatanAnnual,
      biayaJabatanMonthly,
      annualNet,
      monthlyNet,
      ptkpCode: ptkp.code,
      ptkpAnnual: ptkp.annualAmount,
      pkpAnnual: 0,
      annualTax: 0,
      monthlyPph21: 0,
    };
  }

  let annualTax = 0;
  let previousLimit = 0;
  for (const bracket of PASAL_17_BRACKETS) {
    if (bracket.limit === null) {
      annualTax += Math.max(0, pkpAnnual - previousLimit) * bracket.rate;
      break;
    }
    if (pkpAnnual <= previousLimit) {
      break;
    }
    const slice = Math.min(pkpAnnual, bracket.limit) - previousLimit;
    if (slice > 0) {
      annualTax += slice * bracket.rate;
    }
    previousLimit = bracket.limit;
  }

  return {
    monthlyTaxableIncome,
    annualGross,
    biayaJabatanAnnual,
    biayaJabatanMonthly,
    annualNet,
    monthlyNet,
    ptkpCode: ptkp.code,
    ptkpAnnual: ptkp.annualAmount,
    pkpAnnual,
    annualTax: round2(annualTax),
    monthlyPph21: Math.round(annualTax / 12),
  };
}

export function computePph21Preview(
  baseSalary: number,
  bpjsKesehatan: number,
  bpjsKetenagakerjaan: number,
  bonus: number,
  overtime: number,
  deduction: number,
  thr: number,
  taxStatus?: TaxStatus | null
): number {
  return computePph21Breakdown(
    baseSalary,
    bpjsKesehatan,
    bpjsKetenagakerjaan,
    bonus,
    overtime,
    deduction,
    thr,
    taxStatus
  ).monthlyPph21;
}

export interface PayrollDetailBreakdown {
  gajiPokok: number;
  tunjanganJabatan: number;
  gajiTotal: number;
  bpjsKsCompany: number;
  bpjsKtCompany: number;
  bpjsCompanyTotal: number;
  bpjsKsEmployee: number;
  bpjsKtEmployee: number;
  bpjsEmployeeTotal: number;
  penghasilanSetelahBpjs: number;
  bonus: number;
  overtime: number;
  deduction: number;
  thr: number;
  pph21Breakdown: Pph21Breakdown;
  pph21: number;
  kantorMengeluarkanTotal: number;
  gajiDiterimaTotal: number;
  slipPendapatanTotal: number;
  slipBpjsKesehatanDeduction: number;
  slipBpjsKetenagakerjaanDeduction: number;
  slipPemotonganTotal: number;
  slipGajiBersih: number;
}

/**
 * Compute detailed breakdown from current PayrollWorkspaceRow and Employee PayrollGrade.
 * Matches backend PayrollService & PayrollGradeService formulas.
 */
export function computePayrollDetailBreakdown(
  row: PayrollWorkspaceRow
): PayrollDetailBreakdown {
  const grade = row.employee.payroll_grade ?? null;
  let gajiPokok = round2(row.base_salary);
  let tunjanganJabatan = 0;

  if (grade && grade.total_gross > 0 && row.base_salary > 0) {
    if (
      row.attendance_days === row.effective_work_days &&
      Math.abs(row.base_salary - grade.total_gross) < 0.01
    ) {
      gajiPokok = round2(grade.base_salary);
      tunjanganJabatan = round2(grade.position_allowance);
    } else {
      const ratio = row.base_salary / grade.total_gross;
      gajiPokok = round2(grade.base_salary * ratio);
      tunjanganJabatan = round2(row.base_salary - gajiPokok);
    }
  }

  const gajiTotal = round2(row.base_salary);

  const hasBpjsKs =
    row.bpjs_kesehatan > 0 ||
    (row.base_salary > 0 && Boolean(row.employee.bpjs_kesehatan?.trim()));
  const hasBpjsKt =
    row.bpjs_ketenagakerjaan > 0 ||
    (row.base_salary > 0 && Boolean(row.employee.bpjs_ketenagakerjaan?.trim()));

  const bpjsKsCompany =
    grade && hasBpjsKs ? round2(grade.bpjs_kesehatan_company) : 0;
  const bpjsKtCompany =
    grade && hasBpjsKt ? round2(grade.bpjs_ketenagakerjaan_company) : 0;
  const bpjsCompanyTotal = round2(bpjsKsCompany + bpjsKtCompany);

  const bpjsKsEmployee = round2(row.bpjs_kesehatan);
  const bpjsKtEmployee = round2(row.bpjs_ketenagakerjaan);
  const bpjsEmployeeTotal = round2(bpjsKsEmployee + bpjsKtEmployee);

  const penghasilanSetelahBpjs = round2(gajiTotal - bpjsEmployeeTotal);

  const pph21Breakdown = computePph21Breakdown(
    row.base_salary,
    row.bpjs_kesehatan,
    row.bpjs_ketenagakerjaan,
    row.bonus,
    row.overtime,
    row.deduction,
    row.thr,
    row.employee.tax_status
  );

  const pph21 = round2(row.pph21);

  const kantorMengeluarkanTotal = round2(
    gajiPokok +
      tunjanganJabatan +
      bpjsKsCompany +
      bpjsKtCompany +
      row.bonus +
      row.overtime +
      row.thr
  );

  const slipPendapatanTotal = kantorMengeluarkanTotal;
  const slipBpjsKesehatanDeduction = round2(bpjsKsCompany + bpjsKsEmployee);
  const slipBpjsKetenagakerjaanDeduction = round2(
    bpjsKtCompany + bpjsKtEmployee
  );
  const slipPemotonganTotal = round2(
    slipBpjsKesehatanDeduction +
      slipBpjsKetenagakerjaanDeduction +
      pph21 +
      row.deduction
  );

  return {
    gajiPokok,
    tunjanganJabatan,
    gajiTotal,
    bpjsKsCompany,
    bpjsKtCompany,
    bpjsCompanyTotal,
    bpjsKsEmployee,
    bpjsKtEmployee,
    bpjsEmployeeTotal,
    penghasilanSetelahBpjs,
    bonus: round2(row.bonus),
    overtime: round2(row.overtime),
    deduction: round2(row.deduction),
    thr: round2(row.thr),
    pph21Breakdown,
    pph21,
    kantorMengeluarkanTotal,
    gajiDiterimaTotal: round2(row.total_net),
    slipPendapatanTotal,
    slipBpjsKesehatanDeduction,
    slipBpjsKetenagakerjaanDeduction,
    slipPemotonganTotal,
    slipGajiBersih: round2(row.total_net),
  };
}

export function formatPeriodMonthYear(period: string): string {
  const match = period.match(/^(\d{4})-(\d{2})/);
  if (!match) {
    return period;
  }
  const year = match[1];
  const monthIdx = parseInt(match[2], 10) - 1;
  const monthName = INDONESIAN_MONTHS[monthIdx] ?? match[2];
  return `${monthName} ${year}`;
}

export function formatBirthDateId(birthDate?: string | null): string | null {
  if (!birthDate) {
    return null;
  }
  const match = birthDate.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) {
    return birthDate;
  }
  return `${match[3]}-${match[2]}-${match[1]}`;
}
