import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useDebouncedValue } from '@/lib/useDebouncedValue';

describe('useDebouncedValue', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('updates after the delay and discards superseded values', () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(
      ({ value }: { value: string }) => useDebouncedValue(value, 5000),
      { initialProps: { value: '' } }
    );

    rerender({ value: 'first' });
    act(() => vi.advanceTimersByTime(4999));
    expect(result.current).toBe('');

    rerender({ value: 'second' });
    act(() => vi.advanceTimersByTime(4999));
    expect(result.current).toBe('');
    act(() => vi.advanceTimersByTime(1));
    expect(result.current).toBe('second');
  });
});
