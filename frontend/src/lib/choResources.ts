import { useCallback, useMemo, useRef, useState } from 'react';
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import {
  ApiRequestError,
  type ChoEnums,
  type Company,
  type Employee,
  type EmployeeAttendance,
  type EmployeeAttendancePayload,
  type EmployeePayload,
  type EmployeePosition,
  type EmployeePositionPayload,
  type EmployeeShift,
  type EmployeeShiftAssignment,
  type EmployeeShiftAssignmentPayload,
  type EmployeeShiftPayload,
  type EmploymentStatus,
  type EmploymentStatusPayload,
  type PayrollGrade,
  type PayrollGradePayload,
  type PayrollWorkspaceData,
  type SaveEmployeePayrollPayload,
  type TaxStatus,
  type TaxStatusPayload,
  createEmployee,
  createEmployeeAttendance,
  createEmployeePosition,
  createEmployeeShift,
  createEmployeeShiftAssignment,
  createEmploymentStatus,
  createPayrollGrade,
  createTaxStatus,
  deleteEmployee,
  deleteEmployeeAttendance,
  deleteEmployeePosition,
  deleteEmployeeShift,
  deleteEmployeeShiftAssignment,
  deleteEmploymentStatus,
  deletePayrollGrade,
  deleteTaxStatus,
  fetchActiveCompanyEmployees,
  fetchChoEnums,
  fetchEmployeeAttendances,
  fetchEmployeePositions,
  fetchEmployeeShiftAssignments,
  fetchEmployeeShifts,
  fetchEmployees,
  fetchEmploymentStatuses,
  fetchPayrollGrades,
  fetchPayrollWorkspace,
  fetchTaxStatuses,
  finalizeEmployeePayrollRow,
  saveEmployeePayrollRow,
  updateEmployee,
  updateEmployeeAttendance,
  updateEmployeePosition,
  updateEmployeeShift,
  updateEmployeeShiftAssignment,
  updateEmploymentStatus,
  updatePayrollGrade,
  updateTaxStatus,
  uploadEmployeeDocument,
} from '@/api/client';

export const DEFAULT_CHO_ENUMS: ChoEnums = {
  agama: [
    { value: 'islam', nama: 'Islam' },
    { value: 'kristen', nama: 'Kristen' },
    { value: 'katolik', nama: 'Katolik' },
    { value: 'hindu', nama: 'Hindu' },
    { value: 'buddha', nama: 'Buddha' },
    { value: 'konghucu', nama: 'Konghucu' },
    { value: 'lainnya', nama: 'Lainnya' },
  ],
  golongan_darah: [
    { value: 'a', nama: 'A' },
    { value: 'b', nama: 'B' },
    { value: 'ab', nama: 'AB' },
    { value: 'o', nama: 'O' },
    { value: 'tidak_tahu', nama: 'Tidak Tahu' },
  ],
  jenis_kelamin: [
    { value: 'laki_laki', nama: 'Laki-laki' },
    { value: 'perempuan', nama: 'Perempuan' },
  ],
  jenis_dokumen: [
    { value: 'ktp', nama: 'KTP', allowed_formats: ['.pdf', '.jpg', '.jpeg', '.png'] },
    { value: 'kk', nama: 'Kartu Keluarga (KK)', allowed_formats: ['.pdf', '.jpg', '.jpeg', '.png'] },
    { value: 'npwp', nama: 'NPWP', allowed_formats: ['.pdf', '.jpg', '.jpeg', '.png'] },
    { value: 'bpjs_kesehatan', nama: 'BPJS Kesehatan', allowed_formats: ['.pdf', '.jpg', '.jpeg', '.png'] },
    { value: 'bpjs_ketenagakerjaan', nama: 'BPJS Ketenagakerjaan', allowed_formats: ['.pdf', '.jpg', '.jpeg', '.png'] },
    { value: 'pas_foto', nama: 'Pas Foto', allowed_formats: ['.jpg', '.jpeg', '.png'] },
    { value: 'cv', nama: 'Curriculum Vitae (CV)', allowed_formats: ['.pdf', '.doc', '.docx'] },
    { value: 'ijazah', nama: 'Ijazah', allowed_formats: ['.pdf', '.jpg', '.jpeg', '.png'] },
    { value: 'transkrip', nama: 'Transkrip Nilai', allowed_formats: ['.pdf', '.jpg', '.jpeg', '.png'] },
    { value: 'kontrak_kerja', nama: 'Kontrak Kerja', allowed_formats: ['.pdf'] },
    { value: 'sertifikat', nama: 'Sertifikat', allowed_formats: ['.pdf', '.jpg', '.jpeg', '.png'] },
  ],
};

export const choQueryKeys = {
  enums: ['cho', 'enums'] as const,
  employeePositions: ['cho', 'employee-positions'] as const,
  employmentStatuses: ['cho', 'employment-statuses'] as const,
  payrollGrades: ['cho', 'payroll-grades'] as const,
  taxStatuses: ['cho', 'tax-statuses'] as const,
  employees: ['cho', 'employees'] as const,
  activeCompanyEmployees: (companyId: number | null) =>
    ['cho', 'employees', 'active-company', companyId] as const,
  employeeShifts: ['cho', 'hr', 'employee-shifts'] as const,
  employeeShiftAssignments: ['cho', 'hr', 'employee-shift-assignments'] as const,
  employeeAttendances: ['cho', 'hr', 'employee-attendances'] as const,
  payrollWorkspace: (companyId: number | null, period: string) =>
    ['cho', 'payroll', 'workspace', companyId, period] as const,
};

export const CHO_LIST_PAGE_SIZE = 10;

type ChoListPage<T> = {
  data: T[];
  meta: { last_page?: number };
};

async function requireChoListPage<T>(
  request: Promise<ChoListPage<T>>,
  resourceName: string
): Promise<ChoListPage<T>> {
  const response = await request;
  if (!response || !Array.isArray(response.data) || !response.meta) {
    throw new Error(`Respons daftar ${resourceName} tidak valid.`);
  }
  return response;
}

function getNextChoListPage<T>(
  response: ChoListPage<T>,
  page: number
): number | undefined {
  if (response.meta.last_page !== undefined) {
    return page < response.meta.last_page ? page + 1 : undefined;
  }
  return response.data.length === CHO_LIST_PAGE_SIZE ? page + 1 : undefined;
}

export function useInfiniteEmployeesQuery(
  companyId: number | null,
  search: string,
  sort: string
) {
  return useInfiniteQuery({
    queryKey: [
      ...choQueryKeys.employees,
      'infinite',
      companyId,
      search,
      sort,
    ],
    queryFn: ({ pageParam }) =>
      requireChoListPage(
        fetchEmployees({
          page: pageParam,
          per_page: CHO_LIST_PAGE_SIZE,
          company_id: companyId ?? undefined,
          search: search.trim() || undefined,
          sort,
        }),
        'karyawan'
      ),
    initialPageParam: 1,
    getNextPageParam: (lastPage, _allPages, lastPageParam) =>
      getNextChoListPage(lastPage, lastPageParam),
    enabled: companyId !== null,
  });
}

export function useInfiniteEmployeePositionsQuery(
  search: string,
  sort: string,
  enabled = true
) {
  return useInfiniteQuery({
    queryKey: [...choQueryKeys.employeePositions, 'infinite', search, sort],
    queryFn: ({ pageParam }) =>
      requireChoListPage(
        fetchEmployeePositions({
          page: pageParam,
          per_page: CHO_LIST_PAGE_SIZE,
          search: search.trim() || undefined,
          sort,
        }),
        'jabatan'
      ),
    initialPageParam: 1,
    getNextPageParam: (lastPage, _allPages, lastPageParam) =>
      getNextChoListPage(lastPage, lastPageParam),
    enabled,
  });
}

export function useInfiniteEmploymentStatusesQuery(
  search: string,
  sort: string,
  enabled = true
) {
  return useInfiniteQuery({
    queryKey: [...choQueryKeys.employmentStatuses, 'infinite', search, sort],
    queryFn: ({ pageParam }) =>
      requireChoListPage(
        fetchEmploymentStatuses({
          page: pageParam,
          per_page: CHO_LIST_PAGE_SIZE,
          search: search.trim() || undefined,
          sort,
        }),
        'status karyawan'
      ),
    initialPageParam: 1,
    getNextPageParam: (lastPage, _allPages, lastPageParam) =>
      getNextChoListPage(lastPage, lastPageParam),
    enabled,
  });
}

export function useInfinitePayrollGradesQuery(
  search: string,
  sort: string,
  enabled = true
) {
  return useInfiniteQuery({
    queryKey: [...choQueryKeys.payrollGrades, 'infinite', search, sort],
    queryFn: ({ pageParam }) =>
      requireChoListPage(
        fetchPayrollGrades({
          page: pageParam,
          per_page: CHO_LIST_PAGE_SIZE,
          search: search.trim() || undefined,
          sort,
        }),
        'payroll grade'
      ),
    initialPageParam: 1,
    getNextPageParam: (lastPage, _allPages, lastPageParam) =>
      getNextChoListPage(lastPage, lastPageParam),
    enabled,
  });
}

export function useInfiniteTaxStatusesQuery(
  search: string,
  sort: string,
  enabled = true
) {
  return useInfiniteQuery({
    queryKey: [...choQueryKeys.taxStatuses, 'infinite', search, sort],
    queryFn: ({ pageParam }) =>
      requireChoListPage(
        fetchTaxStatuses({
          page: pageParam,
          per_page: CHO_LIST_PAGE_SIZE,
          search: search.trim() || undefined,
          sort,
        }),
        'status pajak'
      ),
    initialPageParam: 1,
    getNextPageParam: (lastPage, _allPages, lastPageParam) =>
      getNextChoListPage(lastPage, lastPageParam),
    enabled,
  });
}

export interface ApiErrorInfo {
  id: number;
  title: string;
  message: string;
  errors: string[];
  fieldErrors?: Record<string, string[]>;
}

function getErrorMessage(err: unknown, fallback: string): string | null {
  if (!err) {
    return null;
  }
  if (err instanceof ApiRequestError && err.errors) {
    const flat = Object.values(err.errors).flat().filter(Boolean);
    if (flat.length > 0) {
      return flat.join(' ');
    }
  }
  return err instanceof Error ? err.message : fallback;
}

function extractApiErrorInfo(
  err: unknown,
  fallback: string,
  id: number
): ApiErrorInfo {
  if (err instanceof ApiRequestError) {
    const fieldErrors = err.errors;
    const flat = fieldErrors
      ? Array.from(new Set(Object.values(fieldErrors).flat().filter(Boolean)))
      : [];
    const isValidation = err.status === 422 || flat.length > 0;
    return {
      id,
      title: isValidation ? 'Validasi Backend Gagal' : 'Permintaan API Gagal',
      message: isValidation
        ? 'Data ditolak oleh validasi server. Silakan periksa kembali kolom yang bermasalah:'
        : err.message,
      errors: flat.length > 0 ? flat : [err.message],
      fieldErrors,
    };
  }

  const message = err instanceof Error ? err.message : fallback;
  const maybeRecord = err as { errors?: Record<string, string[]> } | null;
  const fieldErrors =
    maybeRecord && typeof maybeRecord === 'object' && maybeRecord.errors
      ? maybeRecord.errors
      : undefined;
  const flat = fieldErrors
    ? Array.from(new Set(Object.values(fieldErrors).flat().filter(Boolean)))
    : [];
  const isValidation =
    flat.length > 0 || message.includes('422') || /validasi/i.test(message);

  return {
    id,
    title: isValidation ? 'Validasi Backend Gagal' : 'Permintaan API Gagal',
    message: isValidation
      ? 'Data ditolak oleh validasi server. Silakan periksa kembali kolom yang bermasalah:'
      : message,
    errors: flat.length > 0 ? flat : [message],
    fieldErrors,
  };
}

export function useChoEnumsResource(enabled: boolean) {
  const enumsQuery = useQuery<ChoEnums>({
    queryKey: choQueryKeys.enums,
    queryFn: async () => {
      const res = await fetchChoEnums();
      return res?.data ?? DEFAULT_CHO_ENUMS;
    },
    enabled,
  });

  return {
    enums: enumsQuery.data ?? DEFAULT_CHO_ENUMS,
    loading: enumsQuery.isLoading,
  };
}

export function useMasterKaryawanCrudResource(enabled: boolean) {
  const queryClient = useQueryClient();
  const [mutationError, setMutationError] = useState<string | null>(null);

  const positionsQuery = useQuery<EmployeePosition[]>({
    queryKey: choQueryKeys.employeePositions,
    queryFn: async () => {
      const res = await fetchEmployeePositions();
      return res?.data ?? [];
    },
    enabled,
  });

  const statusesQuery = useQuery<EmploymentStatus[]>({
    queryKey: choQueryKeys.employmentStatuses,
    queryFn: async () => {
      const res = await fetchEmploymentStatuses();
      return res?.data ?? [];
    },
    enabled,
  });

  const gradesQuery = useQuery<PayrollGrade[]>({
    queryKey: choQueryKeys.payrollGrades,
    queryFn: async () => {
      const res = await fetchPayrollGrades();
      return res?.data ?? [];
    },
    enabled,
  });

  const taxStatusesQuery = useQuery<TaxStatus[]>({
    queryKey: choQueryKeys.taxStatuses,
    queryFn: async () => {
      const res = await fetchTaxStatuses();
      return res?.data ?? [];
    },
    enabled,
  });

  const allPositions = positionsQuery.data ?? [];
  const allStatuses = statusesQuery.data ?? [];
  const allGrades = gradesQuery.data ?? [];
  const allTaxStatuses = taxStatusesQuery.data ?? [];

  const positions = allPositions;
  const statuses = allStatuses;
  const grades = allGrades;
  const taxStatuses = allTaxStatuses;

  const invalidateEmployeeRefs = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: choQueryKeys.employees });
  }, [queryClient]);

  // EmployeePositions mutations
  const createPositionMutation = useMutation({
    mutationFn: async (payload: EmployeePositionPayload) => {
      const res = await createEmployeePosition(payload);
      return res.data;
    },
    onSuccess: (created) => {
      queryClient.setQueryData<EmployeePosition[]>(
        choQueryKeys.employeePositions,
        (prev = []) => [created, ...prev]
      );
      void queryClient.invalidateQueries({
        queryKey: choQueryKeys.employeePositions,
      });
    },
  });

  const updatePositionMutation = useMutation({
    mutationFn: async (input: {
      id: number;
      payload: EmployeePositionPayload;
    }) => {
      const res = await updateEmployeePosition(input.id, input.payload);
      return res.data;
    },
    onSuccess: (updated) => {
      queryClient.setQueryData<EmployeePosition[]>(
        choQueryKeys.employeePositions,
        (prev = []) =>
          prev.map((item) => (item.id === updated.id ? updated : item))
      );
      void queryClient.invalidateQueries({
        queryKey: choQueryKeys.employeePositions,
      });
      invalidateEmployeeRefs();
    },
  });

  const deletePositionMutation = useMutation({
    mutationFn: async (id: number) => {
      await deleteEmployeePosition(id);
      return id;
    },
    onSuccess: (deletedId) => {
      queryClient.setQueryData<EmployeePosition[]>(
        choQueryKeys.employeePositions,
        (prev = []) => prev.filter((item) => item.id !== deletedId)
      );
      void queryClient.invalidateQueries({
        queryKey: choQueryKeys.employeePositions,
      });
      invalidateEmployeeRefs();
    },
  });

  // EmploymentStatuses mutations
  const createStatusMutation = useMutation({
    mutationFn: async (payload: EmploymentStatusPayload) => {
      const res = await createEmploymentStatus(payload);
      return res.data;
    },
    onSuccess: (created) => {
      queryClient.setQueryData<EmploymentStatus[]>(
        choQueryKeys.employmentStatuses,
        (prev = []) => [created, ...prev]
      );
      void queryClient.invalidateQueries({
        queryKey: choQueryKeys.employmentStatuses,
      });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async (input: {
      id: number;
      payload: EmploymentStatusPayload;
    }) => {
      const res = await updateEmploymentStatus(input.id, input.payload);
      return res.data;
    },
    onSuccess: (updated) => {
      queryClient.setQueryData<EmploymentStatus[]>(
        choQueryKeys.employmentStatuses,
        (prev = []) =>
          prev.map((item) => (item.id === updated.id ? updated : item))
      );
      void queryClient.invalidateQueries({
        queryKey: choQueryKeys.employmentStatuses,
      });
      invalidateEmployeeRefs();
    },
  });

  const deleteStatusMutation = useMutation({
    mutationFn: async (id: number) => {
      await deleteEmploymentStatus(id);
      return id;
    },
    onSuccess: (deletedId) => {
      queryClient.setQueryData<EmploymentStatus[]>(
        choQueryKeys.employmentStatuses,
        (prev = []) => prev.filter((item) => item.id !== deletedId)
      );
      void queryClient.invalidateQueries({
        queryKey: choQueryKeys.employmentStatuses,
      });
      invalidateEmployeeRefs();
    },
  });

  // PayrollGrades mutations
  const createGradeMutation = useMutation({
    mutationFn: async (payload: PayrollGradePayload) => {
      const res = await createPayrollGrade(payload);
      return res.data;
    },
    onSuccess: (created) => {
      queryClient.setQueryData<PayrollGrade[]>(
        choQueryKeys.payrollGrades,
        (prev = []) => [created, ...prev]
      );
      void queryClient.invalidateQueries({
        queryKey: choQueryKeys.payrollGrades,
      });
    },
  });

  const updateGradeMutation = useMutation({
    mutationFn: async (input: { id: number; payload: PayrollGradePayload }) => {
      const res = await updatePayrollGrade(input.id, input.payload);
      return res.data;
    },
    onSuccess: (updated) => {
      queryClient.setQueryData<PayrollGrade[]>(
        choQueryKeys.payrollGrades,
        (prev = []) =>
          prev.map((item) => (item.id === updated.id ? updated : item))
      );
      void queryClient.invalidateQueries({
        queryKey: choQueryKeys.payrollGrades,
      });
      invalidateEmployeeRefs();
    },
  });

  const deleteGradeMutation = useMutation({
    mutationFn: async (id: number) => {
      await deletePayrollGrade(id);
      return id;
    },
    onSuccess: (deletedId) => {
      queryClient.setQueryData<PayrollGrade[]>(
        choQueryKeys.payrollGrades,
        (prev = []) => prev.filter((item) => item.id !== deletedId)
      );
      void queryClient.invalidateQueries({
        queryKey: choQueryKeys.payrollGrades,
      });
      invalidateEmployeeRefs();
    },
  });

  // TaxStatuses mutations
  const createTaxStatusMutation = useMutation({
    mutationFn: async (payload: TaxStatusPayload) => {
      const res = await createTaxStatus(payload);
      return res.data;
    },
    onSuccess: (created) => {
      queryClient.setQueryData<TaxStatus[]>(
        choQueryKeys.taxStatuses,
        (prev = []) => [created, ...prev]
      );
      void queryClient.invalidateQueries({
        queryKey: choQueryKeys.taxStatuses,
      });
    },
  });

  const updateTaxStatusMutation = useMutation({
    mutationFn: async (input: { id: number; payload: TaxStatusPayload }) => {
      const res = await updateTaxStatus(input.id, input.payload);
      return res.data;
    },
    onSuccess: (updated) => {
      queryClient.setQueryData<TaxStatus[]>(
        choQueryKeys.taxStatuses,
        (prev = []) =>
          prev.map((item) => (item.id === updated.id ? updated : item))
      );
      void queryClient.invalidateQueries({
        queryKey: choQueryKeys.taxStatuses,
      });
      invalidateEmployeeRefs();
    },
  });

  const deleteTaxStatusMutation = useMutation({
    mutationFn: async (id: number) => {
      await deleteTaxStatus(id);
      return id;
    },
    onSuccess: (deletedId) => {
      queryClient.setQueryData<TaxStatus[]>(
        choQueryKeys.taxStatuses,
        (prev = []) => prev.filter((item) => item.id !== deletedId)
      );
      void queryClient.invalidateQueries({
        queryKey: choQueryKeys.taxStatuses,
      });
      invalidateEmployeeRefs();
    },
  });

  const runMutation = useCallback(
    async <T>(fn: () => Promise<T>, fallbackError: string): Promise<T | null> => {
      setMutationError(null);
      try {
        return await fn();
      } catch (err) {
        setMutationError(getErrorMessage(err, fallbackError));
        return null;
      }
    },
    []
  );

  const createPosition = useCallback(
    (payload: EmployeePositionPayload) =>
      runMutation(
        () => createPositionMutation.mutateAsync(payload),
        'Gagal menambahkan jabatan.'
      ),
    [createPositionMutation, runMutation]
  );

  const updatePosition = useCallback(
    (id: number, payload: EmployeePositionPayload) =>
      runMutation(
        () => updatePositionMutation.mutateAsync({ id, payload }),
        'Gagal memperbarui jabatan.'
      ),
    [updatePositionMutation, runMutation]
  );

  const removePosition = useCallback(
    async (id: number) =>
      (await runMutation(
        () => deletePositionMutation.mutateAsync(id),
        'Gagal menghapus jabatan.'
      )) !== null,
    [deletePositionMutation, runMutation]
  );

  const createStatus = useCallback(
    (payload: EmploymentStatusPayload) =>
      runMutation(
        () => createStatusMutation.mutateAsync(payload),
        'Gagal menambahkan status karyawan.'
      ),
    [createStatusMutation, runMutation]
  );

  const updateStatus = useCallback(
    (id: number, payload: EmploymentStatusPayload) =>
      runMutation(
        () => updateStatusMutation.mutateAsync({ id, payload }),
        'Gagal memperbarui status karyawan.'
      ),
    [updateStatusMutation, runMutation]
  );

  const removeStatus = useCallback(
    async (id: number) =>
      (await runMutation(
        () => deleteStatusMutation.mutateAsync(id),
        'Gagal menghapus status karyawan.'
      )) !== null,
    [deleteStatusMutation, runMutation]
  );

  const createGrade = useCallback(
    (payload: PayrollGradePayload) =>
      runMutation(
        () => createGradeMutation.mutateAsync(payload),
        'Gagal menambahkan payroll grade.'
      ),
    [createGradeMutation, runMutation]
  );

  const updateGrade = useCallback(
    (id: number, payload: PayrollGradePayload) =>
      runMutation(
        () => updateGradeMutation.mutateAsync({ id, payload }),
        'Gagal memperbarui payroll grade.'
      ),
    [updateGradeMutation, runMutation]
  );

  const removeGrade = useCallback(
    async (id: number) =>
      (await runMutation(
        () => deleteGradeMutation.mutateAsync(id),
        'Gagal menghapus payroll grade.'
      )) !== null,
    [deleteGradeMutation, runMutation]
  );

  const createTaxStatusRecord = useCallback(
    (payload: TaxStatusPayload) =>
      runMutation(
        () => createTaxStatusMutation.mutateAsync(payload),
        'Gagal menambahkan status pajak.'
      ),
    [createTaxStatusMutation, runMutation]
  );

  const updateTaxStatusRecord = useCallback(
    (id: number, payload: TaxStatusPayload) =>
      runMutation(
        () => updateTaxStatusMutation.mutateAsync({ id, payload }),
        'Gagal memperbarui status pajak.'
      ),
    [updateTaxStatusMutation, runMutation]
  );

  const removeTaxStatusRecord = useCallback(
    async (id: number) =>
      (await runMutation(
        () => deleteTaxStatusMutation.mutateAsync(id),
        'Gagal menghapus status pajak.'
      )) !== null,
    [deleteTaxStatusMutation, runMutation]
  );

  const loading =
    positionsQuery.isLoading ||
    statusesQuery.isLoading ||
    gradesQuery.isLoading ||
    taxStatusesQuery.isLoading ||
    createPositionMutation.isPending ||
    updatePositionMutation.isPending ||
    deletePositionMutation.isPending ||
    createStatusMutation.isPending ||
    updateStatusMutation.isPending ||
    deleteStatusMutation.isPending ||
    createGradeMutation.isPending ||
    updateGradeMutation.isPending ||
    deleteGradeMutation.isPending ||
    createTaxStatusMutation.isPending ||
    updateTaxStatusMutation.isPending ||
    deleteTaxStatusMutation.isPending;

  const queryError =
    positionsQuery.error ??
    statusesQuery.error ??
    gradesQuery.error ??
    taxStatusesQuery.error;

  return {
    allPositions,
    allStatuses,
    allGrades,
    allTaxStatuses,
    positions,
    statuses,
    grades,
    taxStatuses,
    loading,
    error:
      mutationError ??
      getErrorMessage(queryError, 'Gagal memuat data master karyawan.'),
    clearError: () => setMutationError(null),
    createPosition,
    updatePosition,
    removePosition,
    createStatus,
    updateStatus,
    removeStatus,
    createGrade,
    updateGrade,
    removeGrade,
    createTaxStatus: createTaxStatusRecord,
    updateTaxStatus: updateTaxStatusRecord,
    removeTaxStatus: removeTaxStatusRecord,
  };
}

export function useEmployeeCrudResource(
  enabled: boolean,
  _company: Company | null,
  loadEmployees = true
) {
  const queryClient = useQueryClient();
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [errorInfo, setErrorInfo] = useState<ApiErrorInfo | null>(null);
  const errorSeqRef = useRef(0);
  const [uploadingDocument, setUploadingDocument] = useState(false);

  const master = useMasterKaryawanCrudResource(enabled);
  const enumsResource = useChoEnumsResource(enabled);

  const employeesQuery = useQuery<Employee[]>({
    queryKey: choQueryKeys.employees,
    queryFn: async () => {
      const res = await fetchEmployees();
      return res?.data ?? [];
    },
    enabled: enabled && loadEmployees,
  });

  const allEmployees = employeesQuery.data ?? [];

  const createMutation = useMutation({
    mutationFn: async (payload: EmployeePayload) => {
      const res = await createEmployee(payload);
      return res.data;
    },
    onSuccess: (created) => {
      queryClient.setQueryData<Employee[]>(choQueryKeys.employees, (prev = []) => [
        created,
        ...prev,
      ]);
      void queryClient.invalidateQueries({ queryKey: choQueryKeys.employees });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (input: { id: number; payload: EmployeePayload }) => {
      const res = await updateEmployee(input.id, input.payload);
      return res.data;
    },
    onSuccess: (updated) => {
      queryClient.setQueryData<Employee[]>(choQueryKeys.employees, (prev = []) =>
        prev.map((item) => (item.id === updated.id ? updated : item))
      );
      void queryClient.invalidateQueries({ queryKey: choQueryKeys.employees });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await deleteEmployee(id);
      return id;
    },
    onSuccess: (deletedId) => {
      queryClient.setQueryData<Employee[]>(choQueryKeys.employees, (prev = []) =>
        prev.filter((item) => item.id !== deletedId)
      );
      void queryClient.invalidateQueries({ queryKey: choQueryKeys.employees });
    },
  });

  const recordMutationError = useCallback((err: unknown, fallback: string) => {
    errorSeqRef.current += 1;
    setMutationError(getErrorMessage(err, fallback));
    setErrorInfo(extractApiErrorInfo(err, fallback, errorSeqRef.current));
  }, []);

  const saveEmployee = useCallback(
    async (payload: EmployeePayload): Promise<Employee | null> => {
      setMutationError(null);
      setErrorInfo(null);
      try {
        return await createMutation.mutateAsync(payload);
      } catch (err) {
        recordMutationError(err, 'Gagal menambahkan karyawan.');
        return null;
      }
    },
    [createMutation, recordMutationError]
  );

  const editEmployee = useCallback(
    async (id: number, payload: EmployeePayload): Promise<Employee | null> => {
      setMutationError(null);
      setErrorInfo(null);
      try {
        return await updateMutation.mutateAsync({ id, payload });
      } catch (err) {
        recordMutationError(err, 'Gagal memperbarui karyawan.');
        return null;
      }
    },
    [updateMutation, recordMutationError]
  );

  const removeEmployee = useCallback(
    async (id: number): Promise<boolean> => {
      setMutationError(null);
      setErrorInfo(null);
      try {
        await deleteMutation.mutateAsync(id);
        return true;
      } catch (err) {
        recordMutationError(err, 'Gagal menghapus karyawan.');
        return false;
      }
    },
    [deleteMutation, recordMutationError]
  );

  const uploadDocument = useCallback(
    async (file: File, documentType?: string) => {
      setMutationError(null);
      setErrorInfo(null);
      setUploadingDocument(true);
      try {
        return await uploadEmployeeDocument(file, documentType);
      } catch (err) {
        recordMutationError(err, 'Gagal mengunggah dokumen.');
        return null;
      } finally {
        setUploadingDocument(false);
      }
    },
    [recordMutationError]
  );

  return {
    allEmployees,
    allPositions: master.allPositions,
    allStatuses: master.allStatuses,
    allGrades: master.allGrades,
    allTaxStatuses: master.allTaxStatuses,
    enums: enumsResource.enums,
    loading:
      employeesQuery.isLoading ||
      master.loading ||
      enumsResource.loading ||
      createMutation.isPending ||
      updateMutation.isPending ||
      deleteMutation.isPending ||
      uploadingDocument,
    uploadingDocument,
    error:
      mutationError ??
      getErrorMessage(employeesQuery.error, 'Gagal memuat data karyawan.') ??
      master.error,
    errorInfo,
    clearError: () => {
      setMutationError(null);
      setErrorInfo(null);
    },
    createEmployee: saveEmployee,
    updateEmployee: editEmployee,
    removeEmployee,
    uploadDocument,
  };
}

export function useActiveCompanyEmployeesResource(
  enabled: boolean,
  company: Company | null
) {
  const enumsResource = useChoEnumsResource(enabled);
  const companyId = company?.id ?? null;

  const activeEmployeesQuery = useQuery<Employee[]>({
    queryKey: choQueryKeys.activeCompanyEmployees(companyId),
    queryFn: async () => {
      const res = await fetchActiveCompanyEmployees();
      return res?.data ?? [];
    },
    enabled: enabled && companyId !== null,
  });

  const employees = useMemo(() => {
    const rows = activeEmployeesQuery.data ?? [];
    if (!company) {
      return rows;
    }
    return rows.filter((item) => Number(item.company_id) === company.id);
  }, [activeEmployeesQuery.data, company]);

  return {
    employees,
    enums: enumsResource.enums,
    loading: activeEmployeesQuery.isLoading || enumsResource.loading,
    error: getErrorMessage(
      activeEmployeesQuery.error,
      'Gagal memuat daftar karyawan perusahaan aktif.'
    ),
  };
}

export function useMasterPresensiCrudResource(
  enabled: boolean,
  company: Company | null
) {
  const queryClient = useQueryClient();
  const [mutationError, setMutationError] = useState<string | null>(null);

  const shiftsQuery = useQuery<EmployeeShift[]>({
    queryKey: choQueryKeys.employeeShifts,
    queryFn: async () => {
      const res = await fetchEmployeeShifts();
      return res?.data ?? [];
    },
    enabled,
  });

  const assignmentsQuery = useQuery<EmployeeShiftAssignment[]>({
    queryKey: choQueryKeys.employeeShiftAssignments,
    queryFn: async () => {
      const res = await fetchEmployeeShiftAssignments();
      return res?.data ?? [];
    },
    enabled,
  });

  const employeesQuery = useQuery<Employee[]>({
    queryKey: choQueryKeys.employees,
    queryFn: async () => {
      const res = await fetchEmployees();
      return res?.data ?? [];
    },
    enabled,
  });

  const allShifts = shiftsQuery.data ?? [];
  const allAssignments = assignmentsQuery.data ?? [];
  const allEmployees = employeesQuery.data ?? [];

  const shifts = useMemo(
    () =>
      company
        ? allShifts.filter((s) => Number(s.company_id) === company.id)
        : allShifts,
    [allShifts, company]
  );

  const assignments = useMemo(
    () =>
      company
        ? allAssignments.filter((a) => Number(a.company_id) === company.id)
        : allAssignments,
    [allAssignments, company]
  );

  const invalidateShiftRefs = useCallback(() => {
    void queryClient.invalidateQueries({
      queryKey: choQueryKeys.employeeShiftAssignments,
    });
    void queryClient.invalidateQueries({
      queryKey: choQueryKeys.employeeAttendances,
    });
  }, [queryClient]);

  const createShiftMutation = useMutation({
    mutationFn: async (payload: EmployeeShiftPayload) => {
      const res = await createEmployeeShift(payload);
      return res.data;
    },
    onSuccess: (created) => {
      queryClient.setQueryData<EmployeeShift[]>(
        choQueryKeys.employeeShifts,
        (prev = []) => [created, ...prev]
      );
      void queryClient.invalidateQueries({
        queryKey: choQueryKeys.employeeShifts,
      });
    },
  });

  const updateShiftMutation = useMutation({
    mutationFn: async (input: { id: number; payload: EmployeeShiftPayload }) => {
      const res = await updateEmployeeShift(input.id, input.payload);
      return res.data;
    },
    onSuccess: (updated) => {
      queryClient.setQueryData<EmployeeShift[]>(
        choQueryKeys.employeeShifts,
        (prev = []) =>
          prev.map((item) => (item.id === updated.id ? updated : item))
      );
      void queryClient.invalidateQueries({
        queryKey: choQueryKeys.employeeShifts,
      });
      invalidateShiftRefs();
    },
  });

  const deleteShiftMutation = useMutation({
    mutationFn: async (id: number) => {
      await deleteEmployeeShift(id);
      return id;
    },
    onSuccess: (deletedId) => {
      queryClient.setQueryData<EmployeeShift[]>(
        choQueryKeys.employeeShifts,
        (prev = []) => prev.filter((item) => item.id !== deletedId)
      );
      void queryClient.invalidateQueries({
        queryKey: choQueryKeys.employeeShifts,
      });
      invalidateShiftRefs();
    },
  });

  const createAssignmentMutation = useMutation({
    mutationFn: async (payload: EmployeeShiftAssignmentPayload) => {
      const res = await createEmployeeShiftAssignment(payload);
      return res.data;
    },
    onSuccess: (created) => {
      queryClient.setQueryData<EmployeeShiftAssignment[]>(
        choQueryKeys.employeeShiftAssignments,
        (prev = []) => [created, ...prev]
      );
      void queryClient.invalidateQueries({
        queryKey: choQueryKeys.employeeShiftAssignments,
      });
    },
  });

  const updateAssignmentMutation = useMutation({
    mutationFn: async (input: {
      id: number;
      payload: EmployeeShiftAssignmentPayload;
    }) => {
      const res = await updateEmployeeShiftAssignment(input.id, input.payload);
      return res.data;
    },
    onSuccess: (updated) => {
      queryClient.setQueryData<EmployeeShiftAssignment[]>(
        choQueryKeys.employeeShiftAssignments,
        (prev = []) =>
          prev.map((item) => (item.id === updated.id ? updated : item))
      );
      void queryClient.invalidateQueries({
        queryKey: choQueryKeys.employeeShiftAssignments,
      });
    },
  });

  const deleteAssignmentMutation = useMutation({
    mutationFn: async (id: number) => {
      await deleteEmployeeShiftAssignment(id);
      return id;
    },
    onSuccess: (deletedId) => {
      queryClient.setQueryData<EmployeeShiftAssignment[]>(
        choQueryKeys.employeeShiftAssignments,
        (prev = []) => prev.filter((item) => item.id !== deletedId)
      );
      void queryClient.invalidateQueries({
        queryKey: choQueryKeys.employeeShiftAssignments,
      });
    },
  });

  const runMutation = useCallback(
    async <T>(fn: () => Promise<T>, fallbackError: string): Promise<T | null> => {
      setMutationError(null);
      try {
        return await fn();
      } catch (err) {
        setMutationError(getErrorMessage(err, fallbackError));
        return null;
      }
    },
    []
  );

  const createShift = useCallback(
    (payload: EmployeeShiftPayload) =>
      runMutation(
        () => createShiftMutation.mutateAsync(payload),
        'Gagal menambahkan shift kerja.'
      ),
    [createShiftMutation, runMutation]
  );

  const updateShift = useCallback(
    (id: number, payload: EmployeeShiftPayload) =>
      runMutation(
        () => updateShiftMutation.mutateAsync({ id, payload }),
        'Gagal memperbarui shift kerja.'
      ),
    [updateShiftMutation, runMutation]
  );

  const removeShift = useCallback(
    async (id: number) =>
      (await runMutation(
        () => deleteShiftMutation.mutateAsync(id),
        'Gagal menghapus shift kerja.'
      )) !== null,
    [deleteShiftMutation, runMutation]
  );

  const createAssignment = useCallback(
    (payload: EmployeeShiftAssignmentPayload) =>
      runMutation(
        () => createAssignmentMutation.mutateAsync(payload),
        'Gagal menambahkan penugasan shift.'
      ),
    [createAssignmentMutation, runMutation]
  );

  const updateAssignment = useCallback(
    (id: number, payload: EmployeeShiftAssignmentPayload) =>
      runMutation(
        () => updateAssignmentMutation.mutateAsync({ id, payload }),
        'Gagal memperbarui penugasan shift.'
      ),
    [updateAssignmentMutation, runMutation]
  );

  const removeAssignment = useCallback(
    async (id: number) =>
      (await runMutation(
        () => deleteAssignmentMutation.mutateAsync(id),
        'Gagal menghapus penugasan shift.'
      )) !== null,
    [deleteAssignmentMutation, runMutation]
  );

  const clearError = useCallback(() => setMutationError(null), []);

  const loading =
    shiftsQuery.isLoading ||
    assignmentsQuery.isLoading ||
    employeesQuery.isLoading ||
    createShiftMutation.isPending ||
    updateShiftMutation.isPending ||
    deleteShiftMutation.isPending ||
    createAssignmentMutation.isPending ||
    updateAssignmentMutation.isPending ||
    deleteAssignmentMutation.isPending;

  const queryError =
    shiftsQuery.error ?? assignmentsQuery.error ?? employeesQuery.error;

  return {
    allShifts,
    allAssignments,
    allEmployees,
    shifts,
    assignments,
    loading,
    error:
      mutationError ??
      getErrorMessage(queryError, 'Gagal memuat data master presensi.'),
    clearError,
    createShift,
    updateShift,
    removeShift,
    createAssignment,
    updateAssignment,
    removeAssignment,
  };
}

export function useEmployeeAttendanceCrudResource(
  enabled: boolean,
  company: Company | null
) {
  const queryClient = useQueryClient();
  const [mutationError, setMutationError] = useState<string | null>(null);

  const attendancesQuery = useQuery<EmployeeAttendance[]>({
    queryKey: choQueryKeys.employeeAttendances,
    queryFn: async () => {
      const res = await fetchEmployeeAttendances();
      return res?.data ?? [];
    },
    enabled,
  });

  const shiftsQuery = useQuery<EmployeeShift[]>({
    queryKey: choQueryKeys.employeeShifts,
    queryFn: async () => {
      const res = await fetchEmployeeShifts();
      return res?.data ?? [];
    },
    enabled,
  });

  const employeesQuery = useQuery<Employee[]>({
    queryKey: choQueryKeys.employees,
    queryFn: async () => {
      const res = await fetchEmployees();
      return res?.data ?? [];
    },
    enabled,
  });

  const allAttendances = attendancesQuery.data ?? [];
  const allShifts = shiftsQuery.data ?? [];
  const allEmployees = employeesQuery.data ?? [];

  const attendances = useMemo(
    () =>
      company
        ? allAttendances.filter((a) => Number(a.company_id) === company.id)
        : allAttendances,
    [allAttendances, company]
  );

  const createAttendanceMutation = useMutation({
    mutationFn: async (payload: EmployeeAttendancePayload) => {
      const res = await createEmployeeAttendance(payload);
      return res.data;
    },
    onSuccess: (created) => {
      queryClient.setQueryData<EmployeeAttendance[]>(
        choQueryKeys.employeeAttendances,
        (prev = []) => [created, ...prev]
      );
      void queryClient.invalidateQueries({
        queryKey: choQueryKeys.employeeAttendances,
      });
    },
  });

  const updateAttendanceMutation = useMutation({
    mutationFn: async (input: {
      id: number;
      payload: EmployeeAttendancePayload;
    }) => {
      const res = await updateEmployeeAttendance(input.id, input.payload);
      return res.data;
    },
    onSuccess: (updated) => {
      queryClient.setQueryData<EmployeeAttendance[]>(
        choQueryKeys.employeeAttendances,
        (prev = []) =>
          prev.map((item) => (item.id === updated.id ? updated : item))
      );
      void queryClient.invalidateQueries({
        queryKey: choQueryKeys.employeeAttendances,
      });
    },
  });

  const deleteAttendanceMutation = useMutation({
    mutationFn: async (id: number) => {
      await deleteEmployeeAttendance(id);
      return id;
    },
    onSuccess: (deletedId) => {
      queryClient.setQueryData<EmployeeAttendance[]>(
        choQueryKeys.employeeAttendances,
        (prev = []) => prev.filter((item) => item.id !== deletedId)
      );
      void queryClient.invalidateQueries({
        queryKey: choQueryKeys.employeeAttendances,
      });
    },
  });

  const runMutation = useCallback(
    async <T>(fn: () => Promise<T>, fallbackError: string): Promise<T | null> => {
      setMutationError(null);
      try {
        return await fn();
      } catch (err) {
        setMutationError(getErrorMessage(err, fallbackError));
        return null;
      }
    },
    []
  );

  const createAttendance = useCallback(
    (payload: EmployeeAttendancePayload) =>
      runMutation(
        () => createAttendanceMutation.mutateAsync(payload),
        'Gagal menambahkan data absensi.'
      ),
    [createAttendanceMutation, runMutation]
  );

  const updateAttendance = useCallback(
    (id: number, payload: EmployeeAttendancePayload) =>
      runMutation(
        () => updateAttendanceMutation.mutateAsync({ id, payload }),
        'Gagal memperbarui data absensi.'
      ),
    [updateAttendanceMutation, runMutation]
  );

  const removeAttendance = useCallback(
    async (id: number) =>
      (await runMutation(
        () => deleteAttendanceMutation.mutateAsync(id),
        'Gagal menghapus data absensi.'
      )) !== null,
    [deleteAttendanceMutation, runMutation]
  );

  const clearError = useCallback(() => setMutationError(null), []);

  const loading =
    attendancesQuery.isLoading ||
    shiftsQuery.isLoading ||
    employeesQuery.isLoading ||
    createAttendanceMutation.isPending ||
    updateAttendanceMutation.isPending ||
    deleteAttendanceMutation.isPending;

  const queryError =
    attendancesQuery.error ?? shiftsQuery.error ?? employeesQuery.error;

  return {
    allAttendances,
    allShifts,
    allEmployees,
    attendances,
    loading,
    error:
      mutationError ??
      getErrorMessage(queryError, 'Gagal memuat data absensi karyawan.'),
    clearError,
    createAttendance,
    updateAttendance,
    removeAttendance,
  };
}

export function usePayrollWorkspaceResource(
  enabled: boolean,
  companyId: number | null,
  period: string
) {
  const queryClient = useQueryClient();
  const [mutationError, setMutationError] = useState<string | null>(null);

  const workspaceQuery = useQuery<PayrollWorkspaceData>({
    queryKey: choQueryKeys.payrollWorkspace(companyId, period),
    queryFn: async () => {
      if (companyId === null) {
        throw new Error('Perusahaan belum dipilih.');
      }
      const res = await fetchPayrollWorkspace(companyId, period);
      return res.data;
    },
    enabled: enabled && companyId !== null && /^\d{4}-\d{2}$/.test(period),
  });

  const invalidateWorkspace = useCallback(() => {
    void queryClient.invalidateQueries({
      queryKey: ['cho', 'payroll', 'workspace'],
    });
  }, [queryClient]);

  const saveRowMutation = useMutation({
    mutationFn: async (payload: SaveEmployeePayrollPayload) => {
      const res = await saveEmployeePayrollRow(payload);
      return res.data;
    },
    onSuccess: () => {
      invalidateWorkspace();
    },
  });

  const finalizeRowMutation = useMutation({
    mutationFn: async (payload: SaveEmployeePayrollPayload) => {
      const res = await finalizeEmployeePayrollRow(payload);
      return res.data;
    },
    onSuccess: () => {
      invalidateWorkspace();
    },
  });

  const runMutation = useCallback(
    async <T>(fn: () => Promise<T>, fallbackError: string): Promise<T | null> => {
      setMutationError(null);
      try {
        return await fn();
      } catch (err) {
        setMutationError(getErrorMessage(err, fallbackError));
        return null;
      }
    },
    []
  );

  const saveRow = useCallback(
    (payload: SaveEmployeePayrollPayload) =>
      runMutation(
        () => saveRowMutation.mutateAsync(payload),
        'Gagal menyimpan draf payroll karyawan.'
      ),
    [runMutation, saveRowMutation]
  );

  const finalizeRow = useCallback(
    (payload: SaveEmployeePayrollPayload) =>
      runMutation(
        () => finalizeRowMutation.mutateAsync(payload),
        'Gagal memfinalisasi payroll karyawan.'
      ),
    [finalizeRowMutation, runMutation]
  );

  const clearError = useCallback(() => setMutationError(null), []);

  const loading =
    workspaceQuery.isLoading ||
    workspaceQuery.isFetching ||
    saveRowMutation.isPending ||
    finalizeRowMutation.isPending;

  return {
    workspace: workspaceQuery.data ?? null,
    rows: workspaceQuery.data?.rows ?? [],
    loading,
    mutating: saveRowMutation.isPending || finalizeRowMutation.isPending,
    error:
      mutationError ??
      (workspaceQuery.error
        ? getErrorMessage(workspaceQuery.error, 'Gagal memuat data payroll.')
        : null),
    clearError,
    saveRow,
    finalizeRow,
  };
}
