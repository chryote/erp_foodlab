import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import type { Employee } from '@/api/client';
import {
  Badge,
  CardHeader,
  DataTable,
  DataTableSearch,
  Modal,
  type DataTableColumn,
} from '@/components/ui';
import { useCompanyCrudResource } from '@/lib/cfoResources';
import {
  useChoEnumsResource,
  useInfiniteEmployeesQuery,
} from '@/lib/choResources';
import { getActiveCompanyId } from '@/lib/activeCompanyStorage';
import { resolveDocumentUrl } from '@/lib/utils';
import { useDebouncedSearch } from '@/lib/useDebouncedValue';

type SortDirection = 'asc' | 'desc';
type EmployeeSortKey =
  | 'name'
  | 'nik_ktp'
  | 'employee_attendance_code'
  | 'birth_date';

export default function ChoViewKaryawanPage() {
  const { companyId: routeCompanyId } = useParams();
  const parsedCompanyId = Number(routeCompanyId);
  const selectedCompanyId =
    Number.isSafeInteger(parsedCompanyId) && parsedCompanyId > 0
      ? parsedCompanyId
      : getActiveCompanyId();
  const companyResource = useCompanyCrudResource(true);
  const company =
    companyResource.companies.find((item) => item.id === selectedCompanyId) ??
    null;
  const enumsResource = useChoEnumsResource(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, submitSearch] = useDebouncedSearch(search);
  const [sort, setSort] = useState<{
    key: EmployeeSortKey;
    direction: SortDirection;
  } | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(
    null
  );
  const sortParam = sort
    ? `${sort.direction === 'desc' ? '-' : ''}${sort.key}`
    : '-id';
  const employeesQuery = useInfiniteEmployeesQuery(
    selectedCompanyId,
    debouncedSearch,
    sortParam
  );
  const employees = useMemo(
    () => employeesQuery.data?.pages.flatMap((page) => page.data) ?? [],
    [employeesQuery.data]
  );
  const error =
    companyResource.error ??
    (employeesQuery.error instanceof Error
      ? employeesQuery.error.message
      : employeesQuery.error
        ? 'Gagal memuat data karyawan.'
        : null);
  const enumValues = enumsResource.enums;

  const columns = useMemo<DataTableColumn<Employee>[]>(
    () => [
      {
        key: 'name',
        header: 'Nama Karyawan',
        sortable: true,
        render: (row) => row.name,
      },
      {
        key: 'nik_ktp',
        header: 'NIK KTP',
        sortable: true,
        render: (row) => row.nik_ktp ?? '-',
      },
      {
        key: 'employee_attendance_code',
        header: 'Kode Absensi',
        sortable: true,
        render: (row) => row.employee_attendance_code ?? '-',
      },
      {
        key: 'birth_date',
        header: 'Tanggal Lahir',
        sortable: true,
        render: (row) => row.birth_date?.slice(0, 10) ?? '-',
      },
      {
        key: 'employee_position_id',
        header: 'Jabatan',
        render: (row) => row.employee_position?.name ?? '-',
      },
      {
        key: 'employment_status_id',
        header: 'Status',
        render: (row) => row.employment_status?.name ?? '-',
      },
      {
        key: 'documents',
        header: 'Dokumen',
        render: (row) => (
          <Badge variant={(row.documents?.length ?? 0) > 0 ? 'ok' : 'neutral'}>
            {row.documents?.length ?? 0} berkas
          </Badge>
        ),
      },
      {
        key: 'detail',
        header: 'Detail',
        sticky: true,
        render: (row) => (
          <button
            type="button"
            className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/5"
            data-testid={`view-karyawan-detail-${row.id}`}
            onClick={() => setSelectedEmployee(row)}
          >
            Lihat
          </button>
        ),
      },
    ],
    []
  );

  return (
    <div className="mx-auto flex max-w-340 flex-col">
      <CardHeader
        eyebrow={`CHO / Input SDM${company ? ` / ${company.name}` : ''}`}
        title={company ? `Karyawan ${company.name}` : 'Daftar Karyawan'}
      />

      {companyResource.loading && (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Memuat data perusahaan...
        </p>
      )}
      {!companyResource.loading && !selectedCompanyId && (
        <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          Pilih perusahaan aktif untuk melihat data karyawan.
        </p>
      )}
      {selectedCompanyId !== null && selectedCompanyId > 0 && (
        <section
          className="flex h-[calc(100dvh-12rem)] min-h-0 min-w-0 flex-col"
          aria-label="Daftar karyawan"
          data-testid="view-karyawan-section"
        >
          {error && (
            <div
              role="alert"
              className="mb-3 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-sm text-primary"
            >
              {error}
            </div>
          )}

          <DataTableSearch
            searchValue={search}
            onSearchChange={setSearch}
            searchLabel="Cari karyawan"
            searchPlaceholder="Cari nama, NIK, kode absensi..."
            searchTestId="view-karyawan-search"
            onSearchSubmit={submitSearch}
          />

          {employeesQuery.isLoading || enumsResource.loading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Memuat data karyawan...
            </p>
          ) : (
            <DataTable
              columns={columns}
              data={employees}
              rowKey={(row) => row.id}
              stickyHeader
              showSearch={false}
              scrollTestId="view-karyawan-table-scroll"
              hasMore={
                Boolean(employeesQuery.hasNextPage) &&
                !employeesQuery.isFetchNextPageError
              }
              onLoadMore={() => {
                if (
                  employeesQuery.hasNextPage &&
                  !employeesQuery.isFetchingNextPage
                ) {
                  void employeesQuery.fetchNextPage();
                }
              }}
              isLoadingMore={employeesQuery.isFetchingNextPage}
              loadMoreError={
                employeesQuery.isFetchNextPageError ? error : null
              }
              onRetryLoadMore={() => {
                void (employeesQuery.isFetchNextPageError
                  ? employeesQuery.fetchNextPage()
                  : employeesQuery.refetch());
              }}
              sortKey={sort?.key ?? null}
              sortDirection={sort?.direction}
              onSort={(key) => {
                if (
                  key !== 'name' &&
                  key !== 'nik_ktp' &&
                  key !== 'employee_attendance_code' &&
                  key !== 'birth_date'
                ) {
                  return;
                }
                setSort((current) =>
                  current?.key === key
                    ? {
                        key,
                        direction:
                          current.direction === 'asc' ? 'desc' : 'asc',
                      }
                    : { key, direction: 'asc' }
                );
              }}
              emptyMessage={
                debouncedSearch.trim()
                  ? 'Tidak ada karyawan yang cocok dengan pencarian.'
                  : 'Belum ada data karyawan pada perusahaan ini.'
              }
              emptyTestId="view-karyawan-empty"
            />
          )}
        </section>
      )}

      <Modal
        isOpen={selectedEmployee !== null}
        title={selectedEmployee?.name ?? 'Detail Karyawan'}
        subtitle={
          selectedEmployee
            ? `${selectedEmployee.employee_position?.name ?? 'Karyawan'} • ${company?.name ?? ''}`
            : undefined
        }
        testId="view-karyawan-detail-modal"
        maxWidthClass="max-w-4xl"
        onClose={() => setSelectedEmployee(null)}
      >
        {selectedEmployee && (
          <div className="flex flex-col gap-4 text-sm">
            {selectedEmployee.photo_url && (
              <img
                src={resolveDocumentUrl(selectedEmployee.photo_url)}
                alt={selectedEmployee.name}
                className="size-20 rounded-lg border border-border object-cover"
              />
            )}
            <div className="grid gap-3 rounded-xl border border-border bg-muted/25 p-4">
              {[
                ['Kode Absensi', selectedEmployee.employee_attendance_code],
                ['NIK KTP', selectedEmployee.nik_ktp],
                ['Nama Panggilan', selectedEmployee.nickname],
                [
                  'Tempat, Tanggal Lahir',
                  [selectedEmployee.birth_place, selectedEmployee.birth_date]
                    .filter(Boolean)
                    .join(', '),
                ],
                [
                  'Jenis Kelamin',
                  enumValues.jenis_kelamin.find(
                    (item) => item.value === selectedEmployee.gender
                  )?.nama ?? selectedEmployee.gender,
                ],
                [
                  'Agama',
                  enumValues.agama.find(
                    (item) => item.value === selectedEmployee.religion
                  )?.nama ?? selectedEmployee.religion,
                ],
                ['Telepon', selectedEmployee.phone],
                ['Email', selectedEmployee.email],
                ['Alamat KTP', selectedEmployee.ktp_address],
                ['Alamat Domisili', selectedEmployee.domicile_address],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="grid gap-1 border-b border-border/60 pb-2 last:border-b-0 last:pb-0 sm:grid-cols-[180px_minmax(0,1fr)]"
                >
                  <span className="text-xs font-medium text-muted-foreground">
                    {label}
                  </span>
                  <span className="font-medium">{value || '-'}</span>
                </div>
              ))}
            </div>
            <section className="rounded-xl border border-border bg-muted/20 p-4">
              <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Dokumen Karyawan
              </h3>
              {(selectedEmployee.documents ?? []).length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Belum ada dokumen terlampir.
                </p>
              ) : (
                <ul className="flex flex-wrap gap-2">
                  {selectedEmployee.documents?.map((document) => (
                    <li
                      key={document.id}
                      className="flex items-center gap-2 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs"
                    >
                      <Badge variant="ok">
                        {enumValues.jenis_dokumen.find(
                          (item) => item.value === document.document_type
                        )?.nama ?? document.document_type}
                      </Badge>
                      <a
                        href={resolveDocumentUrl(document.file_url)}
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
            </section>
          </div>
        )}
      </Modal>
    </div>
  );
}
