import { useCallback, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ApiRequestError,
  type ChoEnums,
  type Company,
  type Employee,
  type EmployeePayload,
  type EmployeePosition,
  type EmployeePositionPayload,
  type EmploymentStatus,
  type EmploymentStatusPayload,
  type PayrollGrade,
  type PayrollGradePayload,
  type TaxStatus,
  type TaxStatusPayload,
  createEmployee,
  createEmployeePosition,
  createEmploymentStatus,
  createPayrollGrade,
  createTaxStatus,
  deleteEmployee,
  deleteEmployeePosition,
  deleteEmploymentStatus,
  deletePayrollGrade,
  deleteTaxStatus,
  fetchActiveCompanyEmployees,
  fetchChoEnums,
  fetchEmployeePositions,
  fetchEmployees,
  fetchEmploymentStatuses,
  fetchPayrollGrades,
  fetchTaxStatuses,
  updateEmployee,
  updateEmployeePosition,
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
};

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

export function useMasterKaryawanCrudResource(
  enabled: boolean,
  company: Company | null
) {
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

  const positions = useMemo(
    () =>
      company
        ? allPositions.filter((p) => Number(p.company_id) === company.id)
        : allPositions,
    [allPositions, company]
  );

  const statuses = useMemo(
    () =>
      company
        ? allStatuses.filter((s) => Number(s.company_id) === company.id)
        : allStatuses,
    [allStatuses, company]
  );

  const grades = useMemo(
    () =>
      company
        ? allGrades.filter((g) => Number(g.company_id) === company.id)
        : allGrades,
    [allGrades, company]
  );

  const taxStatuses = useMemo(
    () =>
      company
        ? allTaxStatuses.filter((t) => Number(t.company_id) === company.id)
        : allTaxStatuses,
    [allTaxStatuses, company]
  );

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
  company: Company | null
) {
  const queryClient = useQueryClient();
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [errorInfo, setErrorInfo] = useState<ApiErrorInfo | null>(null);
  const errorSeqRef = useRef(0);
  const [uploadingDocument, setUploadingDocument] = useState(false);

  const master = useMasterKaryawanCrudResource(enabled, company);
  const enumsResource = useChoEnumsResource(enabled);

  const employeesQuery = useQuery<Employee[]>({
    queryKey: choQueryKeys.employees,
    queryFn: async () => {
      const res = await fetchEmployees();
      return res?.data ?? [];
    },
    enabled,
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
