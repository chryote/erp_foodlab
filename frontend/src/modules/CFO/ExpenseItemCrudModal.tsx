import React, { useMemo } from 'react';
import type { Company, ExpenseItem } from '@/api/client';
import { type CrudFieldConfig, CrudModal } from '@/components/ui';
import { useMasterOperasionalCrudResource } from '@/lib/cfoResources';
import { formatCapitalIdr } from './CapitalCompanyCrudModal';

function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export interface ExpenseItemCrudModalProps {
  isOpen: boolean;
  company: Company | null;
  companies?: Company[];
  onClose: () => void;
}

export const ExpenseItemCrudModal: React.FC<ExpenseItemCrudModalProps> = ({
  isOpen,
  company,
  companies,
  onClose,
}) => {
  const {
    allCategories,
    allTypes,
    allItems,
    loading,
    error,
    createItem,
    updateItem,
    removeItem,
  } = useMasterOperasionalCrudResource(isOpen, company);

  const availableCompanies = useMemo<Company[]>(() => {
    if (companies && companies.length > 0) {
      return companies;
    }
    return company ? [company] : [];
  }, [companies, company]);

  const defaultCompanyId = company ? String(company.id) : '';
  const todayDate = useMemo(() => getTodayDateString(), []);

  const companyOptions = useMemo(
    () =>
      availableCompanies.map((c) => ({
        value: String(c.id),
        label: c.name,
      })),
    [availableCompanies]
  );

  const fields = useMemo<CrudFieldConfig<ExpenseItem>[]>(
    () => [
      {
        key: 'company_id',
        label: 'Pilih Perusahaan',
        type: 'select',
        placeholder: 'Pilih perusahaan...',
        defaultValue: defaultCompanyId,
        hideInTable: true,
        options: companyOptions,
        resetFieldsOnChange: ['expense_category_id', 'expense_type_id'],
        renderValue: (row) =>
          availableCompanies.find((c) => c.id === Number(row.company_id))
            ?.name ??
          row.company?.name ??
          String(row.company_id ?? ''),
      },
      {
        key: 'expense_category_id',
        label: 'Pilih Kategori',
        type: 'select',
        placeholder: 'Pilih kategori...',
        disabled: (values) => !values.company_id,
        options: (values) => {
          const companyId = parseInt(values.company_id ?? '', 10);
          if (!Number.isFinite(companyId)) {
            return [];
          }
          return allCategories
            .filter((cat) => Number(cat.company_id) === companyId)
            .map((cat) => ({
              value: String(cat.id),
              label: cat.name,
            }));
        },
        resetFieldsOnChange: ['expense_type_id'],
        renderValue: (row) => {
          const matchedType = allTypes.find(
            (t) => t.id === Number(row.expense_type_id)
          );
          const catId = Number(
            row.expense_category_id || matchedType?.expense_category_id
          );
          return (
            allCategories.find((c) => c.id === catId)?.name ??
            row.expense_category?.name ??
            String(catId || '')
          );
        },
      },
      {
        key: 'expense_type_id',
        label: 'Pilih Tipe',
        type: 'select',
        placeholder: 'Pilih tipe...',
        disabled: (values) => !values.expense_category_id,
        options: (values) => {
          const categoryId = parseInt(values.expense_category_id ?? '', 10);
          if (!Number.isFinite(categoryId)) {
            return [];
          }
          const companyId = parseInt(values.company_id ?? '', 10);
          return allTypes
            .filter(
              (t) =>
                Number(t.expense_category_id) === categoryId &&
                (!Number.isFinite(companyId) ||
                  Number(t.company_id) === companyId)
            )
            .map((t) => ({
              value: String(t.id),
              label: t.name,
            }));
        },
        renderValue: (row) =>
          allTypes.find((t) => t.id === Number(row.expense_type_id))?.name ??
          row.expense_type?.name ??
          String(row.expense_type_id),
      },
      {
        key: 'purchased_on',
        label: 'Tanggal Transaksi',
        type: 'date',
        pickerOnly: true,
        defaultValue: todayDate,
        renderValue: (row) => row.purchased_on ?? '-',
      },
      {
        key: 'name',
        label: 'Nama Item',
        placeholder: 'Contoh: Susu Segar',
      },
      {
        key: 'amount',
        label: 'Nominal',
        type: 'decimal',
        placeholder: 'Contoh: 1.500.000',
        renderValue: (row) => formatCapitalIdr(Number(row.amount)),
      },
      {
        key: 'detail',
        label: 'Keterangan',
        type: 'textarea',
        rows: 2,
        placeholder: 'Contoh: Pembelian bahan baku mingguan',
        optional: true,
        renderValue: (row) => (row.detail ? row.detail : '-'),
      },
    ],
    [
      allCategories,
      allTypes,
      availableCompanies,
      companyOptions,
      defaultCompanyId,
      todayDate,
    ]
  );

  return (
    <CrudModal
      resetKey={`expense-item-${company?.id ?? 0}`}
      isOpen={isOpen}
      title="Item Operasional"
      subtitle="Kelola item pengeluaran operasional perusahaan"
      testId="expense-item-crud-modal"
      layout="split"
      labelPlacement="left"
      modalSize="expanded"
      fields={fields}
      emptyMessage="Belum ada data item operasional."
      pageSize={10}
      items={allItems}
      loading={loading}
      error={error}
      onClose={onClose}
      onCreate={async (values) => {
        const companyId = parseInt(values.company_id ?? '', 10);
        const categoryId = parseInt(values.expense_category_id ?? '', 10);
        const typeId = parseInt(values.expense_type_id ?? '', 10);
        const purchasedOn = (values.purchased_on ?? '').trim();
        const name = (values.name ?? '').trim();
        const amount = parseFloat(values.amount ?? '');
        const detail = (values.detail ?? '').trim();
        if (
          Number.isFinite(companyId) &&
          Number.isFinite(categoryId) &&
          Number.isFinite(typeId) &&
          purchasedOn &&
          name &&
          Number.isFinite(amount)
        ) {
          await createItem({
            companyId,
            expenseCategoryId: categoryId,
            expenseTypeId: typeId,
            purchasedOn,
            name,
            amount,
            detail: detail || null,
          });
        }
      }}
      onUpdate={async (id, values) => {
        const companyId = parseInt(values.company_id ?? '', 10);
        const categoryId = parseInt(values.expense_category_id ?? '', 10);
        const typeId = parseInt(values.expense_type_id ?? '', 10);
        const purchasedOn = (values.purchased_on ?? '').trim();
        const name = (values.name ?? '').trim();
        const amount = parseFloat(values.amount ?? '');
        const detail = (values.detail ?? '').trim();
        if (
          Number.isFinite(companyId) &&
          Number.isFinite(categoryId) &&
          Number.isFinite(typeId) &&
          purchasedOn &&
          name &&
          Number.isFinite(amount)
        ) {
          await updateItem(id, {
            companyId,
            expenseCategoryId: categoryId,
            expenseTypeId: typeId,
            purchasedOn,
            name,
            amount,
            detail: detail || null,
          });
        }
      }}
      onDelete={async (id) => {
        await removeItem(id);
      }}
    />
  );
};
