import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import type { CapitalCompany } from '@/api/client';
import {
  Badge,
  CardHeader,
  DataTable,
  type DataTableColumn,
} from '@/components/ui';
import { formatCapitalIdr } from '@/modules/CFO/CapitalCompanyCrudModal';
import {
  useCompanyCrudResource,
  useStakeholderCrudResource,
} from '@/lib/cfoResources';
import { getActiveCompanyId } from '@/lib/activeCompanyStorage';
import { useDebouncedValue } from '@/lib/useDebouncedValue';

const LAZY_LOAD_BATCH_SIZE = 10;

type SortDirection = 'asc' | 'desc';
type StakeholderSortKey = 'stakeholder_name' | 'capital';

export default function CfoViewModalPage() {
  const { companyId: routeCompanyId } = useParams();
  const parsedCompanyId = Number(routeCompanyId);
  const selectedCompanyId =
    Number.isSafeInteger(parsedCompanyId) && parsedCompanyId > 0
      ? parsedCompanyId
      : getActiveCompanyId();
  const companyResource = useCompanyCrudResource(true);
  const selectedCompany =
    companyResource.companies.find(
      (company) => company.id === selectedCompanyId
    ) ?? null;

  const [stakeholderSearch, setStakeholderSearch] = useState('');
  const [stakeholderVisibleCount, setStakeholderVisibleCount] =
    useState(LAZY_LOAD_BATCH_SIZE);
  const debouncedStakeholderSearch = useDebouncedValue(stakeholderSearch);
  const [stakeholderSort, setStakeholderSort] = useState<{
    key: StakeholderSortKey;
    direction: SortDirection;
  } | null>(null);

  const {
    stakeholders,
    loading: stakeholderLoading,
    error: stakeholderError,
  } = useStakeholderCrudResource(Boolean(selectedCompany), selectedCompany);

  useEffect(() => {
    setStakeholderSearch('');
    setStakeholderVisibleCount(LAZY_LOAD_BATCH_SIZE);
  }, [selectedCompany?.id]);

  useEffect(() => {
    setStakeholderVisibleCount(LAZY_LOAD_BATCH_SIZE);
  }, [debouncedStakeholderSearch]);

  const totalCapital = useMemo(
    () =>
      stakeholders.reduce(
        (sum, item) => sum + (Number(item.capital) || 0),
        0
      ),
    [stakeholders]
  );

  const filteredStakeholders = useMemo(() => {
    const query = debouncedStakeholderSearch.trim().toLowerCase();
    const matchingStakeholders = query
      ? stakeholders.filter((stakeholder) => {
          const capital = Number(stakeholder.capital);
          return (
            stakeholder.stakeholder_name.toLowerCase().includes(query) ||
            String(stakeholder.capital).includes(query) ||
            formatCapitalIdr(capital).toLowerCase().includes(query)
          );
        })
      : stakeholders;
    if (!stakeholderSort) return matchingStakeholders;

    return [...matchingStakeholders].sort((a, b) => {
      const comparison =
        stakeholderSort.key === 'stakeholder_name'
          ? a.stakeholder_name.localeCompare(b.stakeholder_name, undefined, {
              sensitivity: 'base',
            })
          : (Number(a.capital) || 0) - (Number(b.capital) || 0);
      return stakeholderSort.direction === 'asc' ? comparison : -comparison;
    });
  }, [debouncedStakeholderSearch, stakeholderSort, stakeholders]);

  const visibleStakeholders = useMemo(
    () => filteredStakeholders.slice(0, stakeholderVisibleCount),
    [filteredStakeholders, stakeholderVisibleCount]
  );

  const stakeholderColumns = useMemo<DataTableColumn<CapitalCompany>[]>(
    () => [
      {
        key: 'stakeholder_name',
        header: 'Nama Pemegang Saham',
        sortable: true,
        render: (row) => row.stakeholder_name,
      },
      {
        key: 'capital',
        header: 'Kapital',
        sortable: true,
        render: (row) => formatCapitalIdr(Number(row.capital)),
      },
      {
        key: 'capital_share_percentage',
        header: 'Porsi Kapital (%)',
        render: (row) => {
          const share =
            totalCapital > 0
              ? ((Number(row.capital) || 0) / totalCapital) * 100
              : 0;
          return (
            <Badge className="whitespace-nowrap">
              {share.toLocaleString('id-ID', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
              %
            </Badge>
          );
        },
      },
    ],
    [totalCapital]
  );

  return (
    <div className="mx-auto max-w-340">
      <div data-testid="view-modal-card">
        <section
          className="flex h-[calc(100dvh-12rem)] min-h-0 min-w-0 flex-col"
          data-testid="pemegang-saham"
          aria-label={
            selectedCompany
              ? `Pemegang saham ${selectedCompany.name}`
              : 'Pemegang saham'
          }
        >
          <CardHeader
            eyebrow="CFO / Input Modal"
            title={
              selectedCompany
                ? `Pemegang Saham ${selectedCompany.name}`
                : 'Pemegang Saham'
            }
          />

          {companyResource.loading && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Memuat data perusahaan...
            </p>
          )}
          {!companyResource.loading && !selectedCompany && (
            <div className="flex min-h-64 items-center justify-center rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              Perusahaan tidak ditemukan.
            </div>
          )}
          {selectedCompany && (
            <>
              <div className="mb-4 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
                <span className="text-sm text-muted-foreground">
                  Total Kapital {selectedCompany.name}
                </span>
                <p className="text-lg font-bold">
                  {formatCapitalIdr(totalCapital)}
                </p>
              </div>

              {stakeholderError && (
                <p className="mb-4 text-sm text-red-600" role="alert">
                  {stakeholderError}
                </p>
              )}

              {stakeholderLoading ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Memuat data pemegang saham...
                </p>
              ) : (
                <DataTable
                  columns={stakeholderColumns}
                  data={visibleStakeholders}
                  rowKey={(row) => row.id}
                  stickyHeader
                  searchValue={stakeholderSearch}
                  searchLabel="Cari pemegang saham"
                  searchPlaceholder="Cari pemegang saham..."
                  searchTestId="pemegang-saham-table-search"
                  scrollTestId="pemegang-saham-table-scroll"
                  onSearchChange={(value) => {
                    setStakeholderSearch(value);
                    setStakeholderVisibleCount(LAZY_LOAD_BATCH_SIZE);
                  }}
                  hasMore={
                    visibleStakeholders.length < filteredStakeholders.length
                  }
                  onLoadMore={() =>
                    setStakeholderVisibleCount(
                      (count) => count + LAZY_LOAD_BATCH_SIZE
                    )
                  }
                  sortKey={stakeholderSort?.key ?? null}
                  sortDirection={stakeholderSort?.direction}
                  onSort={(key) => {
                    if (key !== 'stakeholder_name' && key !== 'capital') {
                      return;
                    }
                    setStakeholderVisibleCount(LAZY_LOAD_BATCH_SIZE);
                    setStakeholderSort((current) =>
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
                    debouncedStakeholderSearch.trim()
                      ? 'Tidak ada pemegang saham yang cocok dengan pencarian.'
                      : 'Belum ada data pemegang saham untuk perusahaan ini.'
                  }
                  emptyTestId="pemegang-saham-empty"
                />
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
