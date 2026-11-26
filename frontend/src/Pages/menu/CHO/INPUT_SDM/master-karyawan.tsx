import { useMemo, useState } from 'react';
import type {
  EmployeePosition,
  EmployeePositionPayload,
  EmploymentStatus,
  EmploymentStatusPayload,
  PayrollGrade,
  PayrollGradePayload,
  TaxStatus,
  TaxStatusPayload,
} from '@/api/client';
import {
  Button,
  CardHeader,
  ConfirmDialog,
  DataTable,
  DataTableSearch,
  Modal,
  TextInput,
  type DataTableColumn,
} from '@/components/ui';
import {
  useInfiniteEmployeePositionsQuery,
  useInfiniteEmploymentStatusesQuery,
  useInfinitePayrollGradesQuery,
  useInfiniteTaxStatusesQuery,
  useMasterKaryawanCrudResource,
} from '@/lib/choResources';
import { formatCapitalIdr } from '@/modules/CFO/CapitalCompanyCrudModal';
import { useDebouncedSearch } from '@/lib/useDebouncedValue';

type ActiveTab = 'jabatan' | 'status' | 'grade' | 'pajak';
type SortDirection = 'asc' | 'desc';
type MasterRow = EmployeePosition | EmploymentStatus | PayrollGrade | TaxStatus;

type PendingAction =
  | { kind: 'save-position'; id?: number; payload: EmployeePositionPayload }
  | { kind: 'save-status'; id?: number; payload: EmploymentStatusPayload }
  | { kind: 'save-grade'; id?: number; payload: PayrollGradePayload }
  | { kind: 'save-tax'; id?: number; payload: TaxStatusPayload }
  | { kind: 'delete-position'; id: number; name: string }
  | { kind: 'delete-status'; id: number; name: string }
  | { kind: 'delete-grade'; id: number; name: string }
  | { kind: 'delete-tax'; id: number; name: string };
type DeleteAction = Extract<
  PendingAction,
  { kind: 'delete-position' | 'delete-status' | 'delete-grade' | 'delete-tax' }
>;

type InfiniteListState = {
  hasNextPage?: boolean;
  isFetchNextPageError: boolean;
  isLoading: boolean;
  isFetchingNextPage: boolean;
  error: unknown;
  fetchNextPage: () => Promise<unknown>;
  refetch: () => Promise<unknown>;
};

function renderLazyTable<T extends { id: number }>(
  columns: DataTableColumn<T>[],
  data: T[],
  query: InfiniteListState,
  testId: string,
  emptyMessage: string,
  sortKey: string | null,
  sortDirection: SortDirection | undefined,
  onSort: (key: string) => void
) {
  if (query.isLoading) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Memuat data...
      </p>
    );
  }
  return (
    <DataTable
      columns={columns}
      data={data}
      rowKey={(row) => row.id}
      stickyHeader
      showSearch={false}
      scrollTestId={`${testId}-table-scroll`}
      hasMore={Boolean(query.hasNextPage) && !query.isFetchNextPageError}
      onLoadMore={() => {
        if (query.hasNextPage && !query.isFetchingNextPage) {
          void query.fetchNextPage();
        }
      }}
      isLoadingMore={query.isFetchingNextPage}
      loadMoreError={
        query.isFetchNextPageError
          ? query.error instanceof Error
            ? query.error.message
            : 'Gagal memuat data berikutnya.'
          : null
      }
      onRetryLoadMore={() => {
        void (query.isFetchNextPageError
          ? query.fetchNextPage()
          : query.refetch());
      }}
      sortKey={sortKey}
      sortDirection={sortDirection}
      onSort={onSort}
      emptyMessage={emptyMessage}
      emptyTestId={`${testId}-empty`}
    />
  );
}

export default function ChoMasterKaryawanPage() {
  const resource = useMasterKaryawanCrudResource(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>('jabatan');
  const [search, setSearch] = useState('');
  const [debouncedSearch, submitSearch] = useDebouncedSearch(search);
  const [sort, setSort] = useState<{
    key: string;
    direction: SortDirection;
  } | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [grade, setGrade] = useState('');
  const [subGrade, setSubGrade] = useState('');
  const [levelLabel, setLevelLabel] = useState('');
  const [baseSalary, setBaseSalary] = useState('');
  const [positionAllowance, setPositionAllowance] = useState('0');
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(
    null
  );
  const [actionLoading, setActionLoading] = useState(false);

  const sortParam = sort
    ? `${sort.direction === 'desc' ? '-' : ''}${sort.key}`
    : '-id';
  const positionsQuery = useInfiniteEmployeePositionsQuery(
    debouncedSearch,
    sortParam,
    activeTab === 'jabatan'
  );
  const statusesQuery = useInfiniteEmploymentStatusesQuery(
    debouncedSearch,
    sortParam,
    activeTab === 'status'
  );
  const gradesQuery = useInfinitePayrollGradesQuery(
    debouncedSearch,
    sortParam,
    activeTab === 'grade'
  );
  const taxStatusesQuery = useInfiniteTaxStatusesQuery(
    debouncedSearch,
    sortParam,
    activeTab === 'pajak'
  );
  const positions = useMemo(
    () => positionsQuery.data?.pages.flatMap((page) => page.data) ?? [],
    [positionsQuery.data]
  );
  const statuses = useMemo(
    () => statusesQuery.data?.pages.flatMap((page) => page.data) ?? [],
    [statusesQuery.data]
  );
  const grades = useMemo(
    () => gradesQuery.data?.pages.flatMap((page) => page.data) ?? [],
    [gradesQuery.data]
  );
  const taxStatuses = useMemo(
    () => taxStatusesQuery.data?.pages.flatMap((page) => page.data) ?? [],
    [taxStatusesQuery.data]
  );

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setGrade('');
    setSubGrade('');
    setLevelLabel('');
    setBaseSalary('');
    setPositionAllowance('0');
  };
  const chooseTab = (tab: ActiveTab) => {
    setActiveTab(tab);
    setSearch('');
    setSort(null);
    resetForm();
    setFormOpen(false);
  };
  const startEdit = (row: MasterRow) => {
    setEditingId(row.id);
    if (activeTab === 'grade' && 'grade' in row) {
      setGrade(String(row.grade));
      setSubGrade(row.sub_grade);
      setLevelLabel(row.level_label ?? '');
      setBaseSalary(String(row.base_salary));
      setPositionAllowance(String(row.position_allowance ?? 0));
    } else if ('name' in row) {
      setName(row.name);
    }
    setFormOpen(window.matchMedia('(max-width: 1023px)').matches);
  };
  const queueDelete = (row: MasterRow) => {
    const rowName =
      'grade' in row
        ? `Grade ${row.grade}${row.sub_grade}`
        : row.name;
    const id = row.id;
    if (activeTab === 'jabatan') {
      setPendingAction({ kind: 'delete-position', id, name: rowName });
    } else if (activeTab === 'status') {
      setPendingAction({ kind: 'delete-status', id, name: rowName });
    } else if (activeTab === 'grade') {
      setPendingAction({ kind: 'delete-grade', id, name: rowName });
    } else {
      setPendingAction({ kind: 'delete-tax', id, name: rowName });
    }
  };
  const actionColumn = <T extends MasterRow>(): DataTableColumn<T> => ({
    key: 'actions',
    header: 'Aksi',
    sticky: true,
    render: (row) => (
      <div className="flex items-center gap-1">
        <Button
          variant="secondary"
          className="h-8 px-3 text-xs"
          onClick={() => startEdit(row)}
        >
          Ubah
        </Button>
        <Button
          variant="ghost"
          className="h-8 px-3 text-xs"
          onClick={() => queueDelete(row)}
        >
          Hapus
        </Button>
      </div>
    ),
  });

  const positionColumns = useMemo<DataTableColumn<EmployeePosition>[]>(
    () => [
      {
        key: 'code',
        header: 'Kode',
        sortable: true,
        render: (row) => row.code ?? '-',
      },
      {
        key: 'name',
        header: 'Nama Jabatan',
        sortable: true,
        render: (row) => row.name,
      },
      actionColumn<EmployeePosition>(),
    ],
    [activeTab]
  );
  const statusColumns = useMemo<DataTableColumn<EmploymentStatus>[]>(
    () => [
      {
        key: 'code',
        header: 'Kode',
        sortable: true,
        render: (row) => row.code ?? '-',
      },
      {
        key: 'name',
        header: 'Nama Status',
        sortable: true,
        render: (row) => row.name,
      },
      actionColumn<EmploymentStatus>(),
    ],
    [activeTab]
  );
  const gradeColumns = useMemo<DataTableColumn<PayrollGrade>[]>(
    () => [
      {
        key: 'grade',
        header: 'Grade',
        sortable: true,
        render: (row) => `${row.grade}${row.sub_grade}`,
      },
      {
        key: 'level_label',
        header: 'Label Level',
        render: (row) => row.level_label || '-',
      },
      {
        key: 'base_salary',
        header: 'Gaji Pokok',
        sortable: true,
        render: (row) => formatCapitalIdr(Number(row.base_salary)),
      },
      {
        key: 'position_allowance',
        header: 'Tunjangan',
        sortable: true,
        render: (row) =>
          formatCapitalIdr(Number(row.position_allowance ?? 0)),
      },
      {
        key: 'total_gross',
        header: 'Total Gross',
        sortable: true,
        render: (row) => formatCapitalIdr(Number(row.total_gross)),
      },
      {
        key: 'net_employee_received',
        header: 'Gaji Bersih',
        sortable: true,
        render: (row) =>
          formatCapitalIdr(Number(row.net_employee_received)),
      },
      {
        key: 'total_company_cost',
        header: 'Biaya Perusahaan',
        sortable: true,
        render: (row) => formatCapitalIdr(Number(row.total_company_cost)),
      },
      actionColumn<PayrollGrade>(),
    ],
    [activeTab]
  );
  const taxColumns = useMemo<DataTableColumn<TaxStatus>[]>(
    () => [
      {
        key: 'code',
        header: 'Kode',
        sortable: true,
        render: (row) => row.code ?? '-',
      },
      {
        key: 'name',
        header: 'Status Pajak',
        sortable: true,
        render: (row) => row.name,
      },
      actionColumn<TaxStatus>(),
    ],
    [activeTab]
  );

  const submitForm = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (activeTab === 'grade') {
      const parsedGrade = Number(grade);
      const parsedSalary = Number(baseSalary);
      const parsedAllowance = Number(positionAllowance || 0);
      if (
        !Number.isInteger(parsedGrade) ||
        parsedGrade < 1 ||
        !subGrade.trim() ||
        !Number.isFinite(parsedSalary) ||
        parsedSalary < 0 ||
        !Number.isFinite(parsedAllowance) ||
        parsedAllowance < 0
      ) {
        return;
      }
      const payload: PayrollGradePayload = {
        grade: parsedGrade,
        sub_grade: subGrade.trim(),
        level_label: levelLabel.trim() || null,
        base_salary: parsedSalary,
        position_allowance: parsedAllowance,
      };
      setPendingAction({ kind: 'save-grade', id: editingId ?? undefined, payload });
      return;
    }
    const trimmedName = name.trim();
    if (!trimmedName) return;
    if (activeTab === 'jabatan') {
      setPendingAction({
        kind: 'save-position',
        id: editingId ?? undefined,
        payload: { name: trimmedName },
      });
    } else if (activeTab === 'status') {
      setPendingAction({
        kind: 'save-status',
        id: editingId ?? undefined,
        payload: { name: trimmedName },
      });
    } else {
      setPendingAction({
        kind: 'save-tax',
        id: editingId ?? undefined,
        payload: { name: trimmedName },
      });
    }
  };

  const confirmPendingAction = async () => {
    if (!pendingAction || actionLoading) return;
    const action = pendingAction;
    setActionLoading(true);
    try {
      let success = false;
      switch (action.kind) {
        case 'save-position':
          success = Boolean(
            action.id
              ? await resource.updatePosition(action.id, action.payload)
              : await resource.createPosition(action.payload)
          );
          break;
        case 'save-status':
          success = Boolean(
            action.id
              ? await resource.updateStatus(action.id, action.payload)
              : await resource.createStatus(action.payload)
          );
          break;
        case 'save-grade':
          success = Boolean(
            action.id
              ? await resource.updateGrade(action.id, action.payload)
              : await resource.createGrade(action.payload)
          );
          break;
        case 'save-tax':
          success = Boolean(
            action.id
              ? await resource.updateTaxStatus(action.id, action.payload)
              : await resource.createTaxStatus(action.payload)
          );
          break;
        case 'delete-position':
          success = await resource.removePosition(action.id);
          break;
        case 'delete-status':
          success = await resource.removeStatus(action.id);
          break;
        case 'delete-grade':
          success = await resource.removeGrade(action.id);
          break;
        case 'delete-tax':
          success = await resource.removeTaxStatus(action.id);
          break;
      }
      if (success) {
        setPendingAction(null);
        if (action.kind.startsWith('save-')) {
          resetForm();
          setFormOpen(false);
        }
      }
    } finally {
      setActionLoading(false);
    }
  };

  const formContent = (
    <form
      className="flex flex-col gap-3"
      onSubmit={submitForm}
      data-testid="master-karyawan-form"
    >
      <CardHeader
        title={
          editingId
            ? `Ubah ${activeTab === 'grade' ? 'Payroll Grade' : 'Data'}`
            : `Tambah ${activeTab === 'grade' ? 'Payroll Grade' : 'Data'}`
        }
        subtitle="Perubahan memerlukan konfirmasi sebelum disimpan."
      />
      {activeTab === 'grade' ? (
        <>
          <TextInput
            label="Grade"
            type="number"
            min={1}
            step={1}
            value={grade}
            onChange={(event) => setGrade(event.target.value)}
            required
            data-testid="master-karyawan-grade"
          />
          <TextInput
            label="Sub Grade"
            value={subGrade}
            onChange={(event) => setSubGrade(event.target.value)}
            required
            data-testid="master-karyawan-sub-grade"
          />
          <TextInput
            label="Label Level"
            value={levelLabel}
            onChange={(event) => setLevelLabel(event.target.value)}
            data-testid="master-karyawan-level-label"
          />
          <TextInput
            label="Gaji Pokok"
            type="number"
            min={0}
            step="0.01"
            value={baseSalary}
            onChange={(event) => setBaseSalary(event.target.value)}
            required
            data-testid="master-karyawan-base-salary"
          />
          <TextInput
            label="Tunjangan Jabatan"
            type="number"
            min={0}
            step="0.01"
            value={positionAllowance}
            onChange={(event) => setPositionAllowance(event.target.value)}
            data-testid="master-karyawan-position-allowance"
          />
        </>
      ) : (
        <TextInput
          label={
            activeTab === 'jabatan'
              ? 'Nama Jabatan'
              : activeTab === 'status'
                ? 'Nama Status'
                : 'Nama Status Pajak'
          }
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
          data-testid="master-karyawan-name"
        />
      )}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" variant="primary" disabled={resource.loading}>
          {editingId ? 'Perbarui' : 'Tambah'}
        </Button>
        {editingId && (
          <Button type="button" variant="ghost" onClick={resetForm}>
            Batal
          </Button>
        )}
      </div>
    </form>
  );

  const currentQuery =
    activeTab === 'jabatan'
      ? positionsQuery
      : activeTab === 'status'
        ? statusesQuery
        : activeTab === 'grade'
          ? gradesQuery
          : taxStatusesQuery;
  const queryError =
    currentQuery.error instanceof Error
      ? currentQuery.error.message
      : currentQuery.error
        ? 'Gagal memuat daftar master karyawan.'
        : null;
  const pageError = resource.error ?? queryError;

  const listContent =
    activeTab === 'jabatan'
      ? renderLazyTable(
          positionColumns,
          positions,
          positionsQuery,
          'master-karyawan-position',
          'Belum ada data jabatan.',
          sort?.key ?? null,
          sort?.direction,
          handleSort
        )
      : activeTab === 'status'
        ? renderLazyTable(
            statusColumns,
            statuses,
            statusesQuery,
            'master-karyawan-status',
            'Belum ada data status karyawan.',
            sort?.key ?? null,
            sort?.direction,
            handleSort
          )
        : activeTab === 'grade'
          ? renderLazyTable(
              gradeColumns,
              grades,
              gradesQuery,
              'master-karyawan-grade',
              'Belum ada data payroll grade.',
              sort?.key ?? null,
              sort?.direction,
              handleSort
            )
          : renderLazyTable(
              taxColumns,
              taxStatuses,
              taxStatusesQuery,
              'master-karyawan-tax',
              'Belum ada data status pajak.',
              sort?.key ?? null,
              sort?.direction,
              handleSort
            );

  function handleSort(key: string) {
    const allowedSorts: Record<ActiveTab, string[]> = {
      jabatan: ['id', 'code', 'name', 'created_at'],
      status: ['id', 'code', 'name', 'created_at'],
      grade: [
        'id',
        'grade',
        'sub_grade',
        'base_salary',
        'position_allowance',
        'total_gross',
        'net_employee_received',
        'total_company_cost',
        'created_at',
      ],
      pajak: ['id', 'code', 'name', 'created_at'],
    };
    if (!allowedSorts[activeTab].includes(key)) return;
    setSort((current) =>
      current?.key === key
        ? {
            key,
            direction: current.direction === 'asc' ? 'desc' : 'asc',
          }
        : { key, direction: 'asc' }
    );
  }

  const isDeleteAction = (
    action: PendingAction | null
  ): action is DeleteAction =>
    action !== null && action.kind.startsWith('delete-');
  const deleteName = isDeleteAction(pendingAction) ? pendingAction.name : '';
  const confirmationTitle =
    pendingAction?.kind.startsWith('delete-')
      ? 'Konfirmasi Hapus Data Master'
      : pendingAction?.kind.startsWith('save-')
        ? pendingAction.id
          ? 'Konfirmasi Perbarui Data Master'
          : 'Konfirmasi Tambah Data Master'
        : '';

  return (
    <div className="mx-auto flex max-w-340 flex-col gap-5">
      <CardHeader
        eyebrow="CHO / Input SDM"
        title="Master Karyawan"
        subtitle="Kelola jabatan, status karyawan, payroll grade, dan status pajak."
      />

      <div
        role="tablist"
        aria-label="Master Karyawan"
        className="flex flex-wrap gap-1 border-b border-border"
      >
        {(
          [
            ['jabatan', 'Jabatan'],
            ['status', 'Status Karyawan'],
            ['grade', 'Payroll Grade'],
            ['pajak', 'Status Pajak'],
          ] as const
        ).map(([tab, label]) => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={activeTab === tab}
            data-testid={`master-karyawan-tab-${tab}`}
            onClick={() => chooseTab(tab)}
            className={`rounded-t-lg border px-4 py-2 text-sm ${
              activeTab === tab
                ? 'border-border border-b-background bg-background font-semibold text-primary'
                : 'border-transparent bg-muted/50 text-muted-foreground hover:text-foreground'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {pageError && (
        <div
          role="alert"
          className="rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-sm text-primary"
        >
          {pageError}
        </div>
      )}

      <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <section
          className="hidden min-w-0 flex-col border-b border-border pb-4 lg:flex lg:h-[calc(100dvh-16rem)] lg:min-h-0 lg:overflow-y-auto lg:overscroll-contain lg:border-b-0 lg:px-1"
          data-testid="master-karyawan-form-section"
        >
          {formContent}
        </section>

        <section
          className="flex min-w-0 flex-col lg:h-[calc(100dvh-16rem)] lg:min-h-0"
          data-testid="master-karyawan-list-section"
        >
          <CardHeader
            title={
              activeTab === 'jabatan'
                ? 'Daftar Jabatan'
                : activeTab === 'status'
                  ? 'Daftar Status'
                  : activeTab === 'grade'
                    ? 'Daftar Payroll Grade'
                    : 'Daftar Status Pajak'
            }
            subtitle="Daftar dimuat bertahap dari server."
          />
          <div className="mb-2 flex items-center justify-between gap-3">
            <DataTableSearch
              searchValue={search}
              onSearchChange={setSearch}
              searchLabel="Cari data master"
              searchPlaceholder="Cari..."
              searchTestId="master-karyawan-search"
              onSearchSubmit={submitSearch}
            />
            <Button
              className="shrink-0 lg:hidden"
              variant="primary"
              data-testid="master-karyawan-open-form-mobile"
              onClick={() => {
                resetForm();
                setFormOpen(true);
              }}
            >
              Tambah
            </Button>
          </div>
          {listContent}
        </section>
      </div>

      <Modal
        isOpen={formOpen}
        title="Form Master Karyawan"
        subtitle="Isi data, lalu konfirmasikan sebelum menyimpan."
        testId="master-karyawan-form-modal"
        onClose={() => {
          setFormOpen(false);
          resetForm();
        }}
      >
        {formContent}
      </Modal>

      <ConfirmDialog
        isOpen={pendingAction !== null}
        title={confirmationTitle}
        message={
          deleteName
            ? `Apakah Anda yakin ingin menghapus ${deleteName}?`
            : 'Apakah Anda yakin ingin menyimpan perubahan ini?'
        }
        loading={actionLoading}
        onConfirm={() => void confirmPendingAction()}
        onCancel={() => setPendingAction(null)}
      />
    </div>
  );
}
