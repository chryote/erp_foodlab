import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import type { Employee } from '@/api/client';
import {
  Badge,
  Button,
  CardHeader,
  ConfirmDialog,
  DataTable,
  DataTableSearch,
  type DataTableColumn,
} from '@/components/ui';
import { InputKaryawanCrudModal } from '@/modules/CHO/InputKaryawanCrudModal';
import { useCompanyCrudResource } from '@/lib/cfoResources';
import {
  useEmployeeCrudResource,
  useInfiniteEmployeesQuery,
} from '@/lib/choResources';
import { getActiveCompanyId } from '@/lib/activeCompanyStorage';
import { useDebouncedSearch } from '@/lib/useDebouncedValue';

type SortDirection = 'asc' | 'desc';
type EmployeeSortKey =
  | 'name'
  | 'nik_ktp'
  | 'employee_attendance_code'
  | 'birth_date';

export default function ChoInputKaryawanPage() {
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
  const employeeResource = useEmployeeCrudResource(true, company, false);
  const [search, setSearch] = useState('');
  const [debouncedSearch, submitSearch] = useDebouncedSearch(search);
  const [sort, setSort] = useState<{
    key: EmployeeSortKey;
    direction: SortDirection;
  } | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Employee | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
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
    employeeResource.error ??
    (employeesQuery.error instanceof Error
      ? employeesQuery.error.message
      : employeesQuery.error
        ? 'Gagal memuat data karyawan.'
        : null);

  const columns = useMemo<DataTableColumn<Employee>[]>(
    () => [
      {
        key: 'name',
        header: 'Nama Karyawan',
        sortable: true,
        render: (row) => (
          <div className="min-w-40">
            <span className="block font-medium text-foreground">{row.name}</span>
            <span className="block text-xs text-muted-foreground">
              {row.company?.name ?? company?.name ?? '-'}
            </span>
          </div>
        ),
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
        key: 'position_status',
        header: 'Jabatan / Status',
        render: (row) => (
          <div className="text-xs">
            <span className="block font-medium text-foreground">
              {row.employee_position?.name ?? '-'}
            </span>
            <span className="block text-muted-foreground">
              {row.employment_status?.name ?? '-'}
            </span>
          </div>
        ),
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
        key: 'actions',
        header: 'Aksi',
        sticky: true,
        render: (row) => (
          <div className="flex items-center gap-1">
            <Button
              variant="secondary"
              className="h-8 px-3 text-xs"
              data-testid={`input-karyawan-edit-${row.id}`}
              onClick={() => {
                setEditingEmployee(row);
                setFormOpen(
                  window.matchMedia('(max-width: 1023px)').matches
                );
              }}
            >
              Ubah
            </Button>
            <Button
              variant="ghost"
              className="h-8 px-3 text-xs"
              data-testid={`input-karyawan-delete-${row.id}`}
              onClick={() => setPendingDelete(row)}
            >
              Hapus
            </Button>
          </div>
        ),
      },
    ],
    [company?.name]
  );

  const confirmDelete = async () => {
    if (!pendingDelete || deleteLoading) return;
    setDeleteLoading(true);
    try {
      if (await employeeResource.removeEmployee(pendingDelete.id)) {
        setPendingDelete(null);
      }
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="mx-auto flex max-w-340 flex-col">
      <CardHeader
        eyebrow={`CHO / Input SDM${company ? ` / ${company.name}` : ''}`}
      />

      {companyResource.loading && (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Memuat data perusahaan...
        </p>
      )}
      {!companyResource.loading && !selectedCompanyId && (
        <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          Pilih perusahaan aktif untuk mengelola data karyawan.
        </p>
      )}
      {selectedCompanyId !== null && selectedCompanyId > 0 && (
        <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          <section
            className="hidden min-w-0 flex-col border-b border-border pb-4 lg:flex lg:h-[calc(100dvh-12rem)] lg:min-h-0 lg:overflow-y-auto lg:overscroll-contain lg:border-b-0 lg:px-1"
            data-testid="input-karyawan-form-section"
          >
            <InputKaryawanCrudModal
              isOpen={true}
              company={company}
              companies={companyResource.companies}
              formOnly
              inlineForm
              initialEmployee={editingEmployee}
              onClose={() => undefined}
            />
          </section>

          <section
            className="flex min-w-0 flex-col lg:h-[calc(100dvh-12rem)] lg:min-h-0"
            data-testid="input-karyawan-list-section"
          >
            <CardHeader
              title="Daftar Karyawan"
              subtitle="Data dimuat bertahap dari server saat Anda menggulir."
            />

            {error && (
              <div
                role="alert"
                className="mb-3 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-sm text-primary"
              >
                {error}
              </div>
            )}

            <div className="mb-2 flex items-center justify-between gap-3">
              <DataTableSearch
                searchValue={search}
                onSearchChange={setSearch}
                searchLabel="Cari karyawan"
                searchPlaceholder="Cari nama, NIK, kode absensi, tanggal lahir, jabatan, atau status..."
                searchTestId="input-karyawan-search"
                onSearchSubmit={submitSearch}
              />
              <Button
                className="shrink-0 lg:hidden"
                variant="primary"
                data-testid="input-karyawan-open-form-mobile"
                onClick={() => {
                  setEditingEmployee(null);
                  setFormOpen(true);
                }}
              >
                Tambah
              </Button>
            </div>

            {employeesQuery.isLoading ? (
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
                scrollTestId="input-karyawan-table-scroll"
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
                emptyTestId="input-karyawan-empty"
              />
            )}
          </section>
        </div>
      )}

      <InputKaryawanCrudModal
        isOpen={formOpen}
        company={company}
        companies={companyResource.companies}
        formOnly
        initialEmployee={editingEmployee}
        onClose={() => {
          setFormOpen(false);
          setEditingEmployee(null);
        }}
      />

      <ConfirmDialog
        isOpen={pendingDelete !== null}
        title="Konfirmasi Hapus Karyawan"
        message={
          pendingDelete
            ? `Apakah Anda yakin ingin menghapus data ${pendingDelete.name}?`
            : ''
        }
        loading={deleteLoading}
        onConfirm={() => void confirmDelete()}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
