import { useCallback, useEffect, useState } from 'react';

export function useDebouncedValue<T>(value: T, delayMs = 500): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timeoutId = window.setTimeout(
      () => setDebouncedValue(value),
      delayMs
    );

    return () => window.clearTimeout(timeoutId);
  }, [delayMs, value]);

  return debouncedValue;
}

export function useDebouncedSearch<T>(
  value: T,
  delayMs = 500
): [T, () => void] {
  const debouncedValue = useDebouncedValue(value, delayMs);
  const [submittedValue, setSubmittedValue] = useState<{ value: T } | null>(
    null
  );

  useEffect(() => {
    setSubmittedValue(null);
  }, [debouncedValue]);

  const submit = useCallback(() => {
    setSubmittedValue({ value });
  }, [value]);

  return [submittedValue ? submittedValue.value : debouncedValue, submit];
}
