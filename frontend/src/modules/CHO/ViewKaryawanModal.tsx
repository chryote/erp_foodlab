import React, { useEffect, useMemo, useState } from 'react';
import type { Company, Employee } from '@/api/client';
import { resolveDocumentUrl } from '@/lib/utils';
import {
  Badge,
  type CrudComputedColumnConfig,
  type CrudFieldConfig,
  CrudModal,
  Modal,
  SummaryBanner,
} from '@/components/ui';
import { useActiveCompanyEmployeesResource } from '@/lib/choResources';

export interface ViewKaryawanModalProps {
  isOpen: boolean;
  company: Company | null;
  onClose: () => void;
}

export const ViewKaryawanModal: React.FC<ViewKaryawanModalProps> = ({
  isOpen,
  company,
  onClose,
}) => {
  const { employees, enums, loading, error } =
    useActiveCompanyEmployeesResource(isOpen, company);

  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(
    null
  );

  useEffect(() => {
    if (!isOpen) {
      setSelectedEmployee(null);
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedEmployee(null);
  }, [company?.id]);

  const genderLabelByValue = useMemo(
    () => new Map(enums.jenis_kelamin.map((item) => [item.value, item.nama])),
    [enums.jenis_kelamin]
  );
  const religionLabelByValue = useMemo(
    () => new Map(enums.agama.map((item) => [item.value, item.nama])),
    [enums.agama]
  );
  const bloodTypeLabelByValue = useMemo(
    () => new Map(enums.golongan_darah.map((item) => [item.value, item.nama])),
    [enums.golongan_darah]
  );
  const documentLabelByValue = useMemo(
    () => new Map(enums.jenis_dokumen.map((item) => [item.value, item.nama])),
    [enums.jenis_dokumen]
  );

  const fields = useMemo<CrudFieldConfig<Employee>[]>(
    () => [
      {
        key: 'name',
        label: 'Nama Karyawan',
        renderValue: (row) => (
          <div>
            <span className="block font-medium text-foreground">
              {row.name}
            </span>
            {row.nik_ktp && (
              <span className="block text-xs text-muted-foreground">
                NIK: {row.nik_ktp}
              </span>
            )}
          </div>
        ),
      },
      {
        key: 'employee_position_id',
        label: 'Jabatan',
        renderValue: (row) => row.employee_position?.name ?? '-',
      },
      {
        key: 'employment_status_id',
        label: 'Status',
        renderValue: (row) => row.employment_status?.name ?? '-',
      },
      {
        key: 'payroll_grade_id',
        label: 'Grade',
        renderValue: (row) =>
          row.payroll_grade
            ? `Grade ${row.payroll_grade.grade}${row.payroll_grade.sub_grade}`
            : '-',
      },
      {
        key: 'tax_status_id',
        label: 'Status Pajak',
        renderValue: (row) => row.tax_status?.code ?? '-',
      },
      {
        key: 'religion',
        label: 'Agama',
        renderValue: (row) =>
          row.religion
            ? (religionLabelByValue.get(row.religion) ?? row.religion)
            : '-',
      },
      {
        key: 'blood_type',
        label: 'Gol. Darah',
        renderValue: (row) =>
          row.blood_type
            ? (bloodTypeLabelByValue.get(row.blood_type) ?? row.blood_type)
            : '-',
      },
      {
        key: 'phone',
        label: 'Telepon',
        renderValue: (row) => row.phone ?? '-',
      },
    ],
    [bloodTypeLabelByValue, religionLabelByValue]
  );

  const computedColumns = useMemo<CrudComputedColumnConfig<Employee>[]>(
    () => [
      {
        key: 'documents_count',
        label: 'Dokumen',
        render: (row) => (
          <Badge variant={(row.documents?.length ?? 0) > 0 ? 'ok' : 'neutral'}>
            {row.documents?.length ?? 0} berkas
          </Badge>
        ),
      },
    ],
    []
  );

  return (
    <>
      <CrudModal
        isOpen={isOpen}
        title="View Karyawan"
        subtitle={
          company
            ? `Daftar karyawan aktif pada ${company.name}`
            : 'Daftar karyawan perusahaan aktif pada modul CHO (SDM)'
        }
        testId="view-karyawan-modal"
        fields={fields}
        computedColumns={computedColumns}
        rowActions={[
          {
            key: 'detail',
            label: 'Detail',
            variant: 'secondary',
            testId: (row) => `detail-karyawan-row-${row.id}`,
            onClick: (row) => setSelectedEmployee(row),
          },
        ]}
        summary={
          <SummaryBanner
            label={`Total Karyawan ${company?.name ?? 'Perusahaan Aktif'}`}
            value={`${employees.length} Personel`}
            testId="view-karyawan-total-banner"
          />
        }
        emptyMessage="Belum ada data karyawan pada perusahaan ini."
        pageSize={5}
        items={employees}
        loading={loading}
        error={error}
        readOnly={true}
        onClose={onClose}
      />

      <Modal
        isOpen={isOpen && selectedEmployee !== null}
        title={selectedEmployee?.name ?? 'Detail Karyawan'}
        subtitle={
          selectedEmployee
            ? `${selectedEmployee.employee_position?.name ?? 'Karyawan'} • ${company?.name ?? selectedEmployee.company?.name ?? ''}`
            : undefined
        }
        testId="view-karyawan-detail-modal"
        maxWidthClass="max-w-3xl"
        onClose={() => setSelectedEmployee(null)}
      >
        {selectedEmployee && (
          <div className="flex flex-col gap-4 text-sm">
            {selectedEmployee.photo_url && (
              <div className="flex items-center gap-4 rounded-xl border border-border bg-muted/30 p-3">
                <img
                  src={resolveDocumentUrl(selectedEmployee.photo_url)}
                  alt={selectedEmployee.name}
                  className="size-16 rounded-lg border border-border object-cover"
                />
                <div className="min-w-0">
                  <p className="font-semibold text-foreground">
                    {selectedEmployee.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {selectedEmployee.email ?? '-'}
                  </p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <span className="block text-xs text-muted-foreground">
                  NIK KTP
                </span>
                <span className="font-medium">
                  {selectedEmployee.nik_ktp ?? '-'}
                </span>
              </div>
              <div>
                <span className="block text-xs text-muted-foreground">
                  Nama Panggilan
                </span>
                <span className="font-medium">
                  {selectedEmployee.nickname ?? '-'}
                </span>
              </div>
              <div>
                <span className="block text-xs text-muted-foreground">
                  Tempat, Tanggal Lahir
                </span>
                <span className="font-medium">
                  {[
                    selectedEmployee.birth_place,
                    selectedEmployee.birth_date,
                  ]
                    .filter(Boolean)
                    .join(', ') || '-'}
                </span>
              </div>
              <div>
                <span className="block text-xs text-muted-foreground">
                  Jenis Kelamin
                </span>
                <span className="font-medium">
                  {selectedEmployee.gender
                    ? (genderLabelByValue.get(selectedEmployee.gender) ??
                      selectedEmployee.gender)
                    : '-'}
                </span>
              </div>
              <div>
                <span className="block text-xs text-muted-foreground">
                  Agama
                </span>
                <span className="font-medium">
                  {selectedEmployee.religion
                    ? (religionLabelByValue.get(selectedEmployee.religion) ??
                      selectedEmployee.religion)
                    : '-'}
                </span>
              </div>
              <div>
                <span className="block text-xs text-muted-foreground">
                  Golongan Darah
                </span>
                <span className="font-medium">
                  {selectedEmployee.blood_type
                    ? (bloodTypeLabelByValue.get(selectedEmployee.blood_type) ??
                      selectedEmployee.blood_type)
                    : '-'}
                </span>
              </div>
              <div>
                <span className="block text-xs text-muted-foreground">
                  BPJS Ketenagakerjaan / Kesehatan
                </span>
                <span className="font-medium">
                  {selectedEmployee.bpjs_ketenagakerjaan ?? '-'} /{' '}
                  {selectedEmployee.bpjs_kesehatan ?? '-'}
                </span>
              </div>
              <div>
                <span className="block text-xs text-muted-foreground">
                  NPWP
                </span>
                <span className="font-medium">
                  {selectedEmployee.npwp_number ?? '-'}
                </span>
              </div>
              <div>
                <span className="block text-xs text-muted-foreground">
                  Alamat KTP
                </span>
                <span className="font-medium">
                  {selectedEmployee.ktp_address ?? '-'}
                </span>
              </div>
              <div>
                <span className="block text-xs text-muted-foreground">
                  Alamat Domisili
                </span>
                <span className="font-medium">
                  {selectedEmployee.domicile_address ?? '-'}
                </span>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-muted/30 p-3">
              <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Dokumen Karyawan
              </h3>
              {(selectedEmployee.documents ?? []).length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Belum ada dokumen terlampir.
                </p>
              ) : (
                <ul className="flex flex-wrap gap-2">
                  {(selectedEmployee.documents ?? []).map((doc) => (
                    <li
                      key={doc.id}
                      className="flex items-center gap-2 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs"
                    >
                      <Badge variant="ok">
                        {documentLabelByValue.get(doc.document_type) ??
                          doc.document_type}
                      </Badge>
                      <a
                        href={resolveDocumentUrl(doc.file_url)}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary hover:underline"
                      >
                        Lihat Berkas
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </Modal>
    </>
  );
};
