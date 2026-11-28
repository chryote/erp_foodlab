import { useMemo, useState, type UIEvent } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import type { Employee } from '@/api/client';
import { useInfiniteEmployeesQuery } from '@/lib/choResources';
import { useDebouncedValue } from '@/lib/useDebouncedValue';
import { cn } from '@/lib/utils';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/shadcn/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/shadcn/popover';

interface EmployeeComboboxProps {
  id: string;
  companyId: number | null;
  value: string;
  selectedLabel?: string;
  disabled?: boolean;
  placeholder?: string;
  onChange: (value: string) => void;
}

function getEmployeeLabel(employee: Employee): string {
  return employee.employee_attendance_code
    ? `${employee.name} (${employee.employee_attendance_code})`
    : employee.name;
}

export function EmployeeCombobox({
  id,
  companyId,
  value,
  selectedLabel,
  disabled = false,
  placeholder = 'Pilih karyawan...',
  onChange,
}: EmployeeComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300);
  const employeesQuery = useInfiniteEmployeesQuery(
    companyId,
    debouncedSearch,
    'name,-id',
    open
  );
  const employees = useMemo(
    () => employeesQuery.data?.pages.flatMap((page) => page.data) ?? [],
    [employeesQuery.data]
  );
  const selectedEmployee = employees.find(
    (employee) => String(employee.id) === value
  );
  const label = selectedEmployee
    ? getEmployeeLabel(selectedEmployee)
    : selectedLabel || '';

  const loadMoreOnScroll = (event: UIEvent<HTMLDivElement>) => {
    const element = event.currentTarget;
    if (
      element.scrollHeight - element.scrollTop - element.clientHeight < 24 &&
      employeesQuery.hasNextPage &&
      !employeesQuery.isFetchingNextPage
    ) {
      void employeesQuery.fetchNextPage();
    }
  };

  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) setSearch('');
      }}
    >
      <PopoverTrigger asChild>
        <button
          id={id}
          type="button"
          role="combobox"
          aria-expanded={open}
          aria-label="Karyawan"
          disabled={disabled || companyId === null}
          className="flex h-9 w-full items-center justify-between rounded-lg border border-input bg-background px-3 py-1.5 text-left text-sm text-foreground shadow-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span className={cn('truncate', !label && 'text-muted-foreground')}>
            {label || placeholder}
          </span>
          <ChevronsUpDown
            className="ml-2 h-4 w-4 shrink-0 text-muted-foreground"
            aria-hidden="true"
          />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[var(--radix-popover-trigger-width)] border border-input p-0 shadow-md"
      >
        <Command
          shouldFilter={false}
          className="rounded-lg [&_[data-slot=command-input-wrapper]]:border-b [&_[data-slot=command-input-wrapper]]:border-input"
        >
          <CommandInput
            placeholder="Cari karyawan..."
            value={search}
            onValueChange={setSearch}
            className="h-9"
          />
          <CommandList
            className="max-h-[200px] overflow-y-auto"
            onScroll={loadMoreOnScroll}
          >
            <CommandEmpty>
              {employeesQuery.error instanceof Error
                ? employeesQuery.error.message
                : employeesQuery.isLoading
                  ? 'Memuat karyawan...'
                  : 'Karyawan tidak ditemukan.'}
            </CommandEmpty>
            <CommandGroup>
              {employees.map((employee) => (
                <CommandItem
                  key={employee.id}
                  value={String(employee.id)}
                  onSelect={() => {
                    onChange(String(employee.id));
                    setOpen(false);
                    setSearch('');
                  }}
                  className="border-b border-input last:border-b-0"
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      value === String(employee.id) ? 'opacity-100' : 'opacity-0'
                    )}
                    aria-hidden="true"
                  />
                  {getEmployeeLabel(employee)}
                </CommandItem>
              ))}
              {employeesQuery.isFetchingNextPage && (
                <p className="px-3 py-2 text-center text-xs text-muted-foreground">
                  Memuat karyawan...
                </p>
              )}
              {employeesQuery.isFetchNextPageError && (
                <p className="px-3 py-2 text-center text-xs text-destructive" role="alert">
                  Gagal memuat karyawan berikutnya.
                </p>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
