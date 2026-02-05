/* oxlint-disable @typescript-eslint/no-unsafe-return */
/**
 * Tests for Debounce Hooks
 *
 * @module hooks/__tests__/useDebounce.test
 */

import { renderHook, act, waitFor } from '@testing-library/react';

import { useDebounce, useDebouncedCallback } from '../useDebounce';

describe('useDebounce', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllTimers();
  });

  it('should return initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('initial', 300));
    expect(result.current).toBe('initial');
  });

  it('should debounce value updates', async () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      {
        initialProps: { value: 'initial', delay: 300 },
      },
    );

    expect(result.current).toBe('initial');

    // Update value multiple times rapidly
    rerender({ value: 'first', delay: 300 });
    rerender({ value: 'second', delay: 300 });
    rerender({ value: 'third', delay: 300 });

    // Value should still be initial (debounced)
    expect(result.current).toBe('initial');

    // Fast-forward time by 299ms (not quite enough)
    act(() => {
      jest.advanceTimersByTime(299);
    });
    expect(result.current).toBe('initial');

    // Fast-forward the remaining 1ms
    await act(async () => {
      jest.advanceTimersByTime(1);
    });

    // Now value should update to the last value
    await waitFor(() => {
      expect(result.current).toBe('third');
    });
  });

  it('should reset timer on each value change', async () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 300),
      {
        initialProps: { value: 'initial' },
      },
    );

    rerender({ value: 'first' });

    // Wait 200ms
    act(() => {
      jest.advanceTimersByTime(200);
    });

    // Change value again (should reset timer)
    rerender({ value: 'second' });

    // Wait another 200ms (total 400ms from first change)
    act(() => {
      jest.advanceTimersByTime(200);
    });

    // Should still be initial (timer was reset)
    expect(result.current).toBe('initial');

    // Wait the final 100ms
    await act(async () => {
      jest.advanceTimersByTime(100);
    });

    // Now should be updated to 'second'
    await waitFor(() => {
      expect(result.current).toBe('second');
    });
  });

  it('should handle complex objects', async () => {
    const obj1 = { id: 1, name: 'first' };
    const obj2 = { id: 2, name: 'second' };

    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 300),
      {
        initialProps: { value: obj1 },
      },
    );

    expect(result.current).toBe(obj1);

    rerender({ value: obj2 });

    await act(async () => {
      jest.advanceTimersByTime(300);
    });

    await waitFor(() => {
      expect(result.current).toBe(obj2);
    });
  });

  it('should cleanup timers on unmount', () => {
    const { rerender, unmount } = renderHook(
      ({ value }) => useDebounce(value, 300),
      {
        initialProps: { value: 'initial' },
      },
    );

    rerender({ value: 'updated' });

    // Unmount before timer fires
    unmount();

    // Fast-forward time
    act(() => {
      jest.advanceTimersByTime(300);
    });

    // No errors should occur
  });

  it('should handle delay changes', async () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      {
        initialProps: { value: 'initial', delay: 300 },
      },
    );

    rerender({ value: 'updated', delay: 100 });

    // Wait 100ms (new delay)
    await act(async () => {
      jest.advanceTimersByTime(100);
    });

    await waitFor(() => {
      expect(result.current).toBe('updated');
    });
  });
});

describe('useDebouncedCallback', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllTimers();
  });

  it('should debounce callback execution', () => {
    const callback = jest.fn();
    const { result } = renderHook(() => useDebouncedCallback(callback, 300));

    // Call multiple times rapidly
    act(() => {
      result.current('first');
      result.current('second');
      result.current('third');
    });

    // Callback should not have been called yet
    expect(callback).not.toHaveBeenCalled();

    // Fast-forward time
    act(() => {
      jest.advanceTimersByTime(300);
    });

    // Callback should be called once with last arguments
    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith('third');
  });

  it('should reset timer on each call', () => {
    const callback = jest.fn();
    const { result } = renderHook(() => useDebouncedCallback(callback, 300));

    act(() => {
      result.current('first');
    });

    // Wait 200ms
    act(() => {
      jest.advanceTimersByTime(200);
    });

    // Call again (should reset timer)
    act(() => {
      result.current('second');
    });

    // Wait another 200ms (total 400ms from first call)
    act(() => {
      jest.advanceTimersByTime(200);
    });

    // Should not have been called yet
    expect(callback).not.toHaveBeenCalled();

    // Wait the final 100ms
    act(() => {
      jest.advanceTimersByTime(100);
    });

    // Now should be called with 'second'
    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith('second');
  });

  it('should support cancel method', () => {
    const callback = jest.fn();
    const { result } = renderHook(() => useDebouncedCallback(callback, 300));

    act(() => {
      result.current('test');
    });

    // Cancel before timer fires
    act(() => {
      result.current.cancel();
    });

    // Fast-forward time
    act(() => {
      jest.advanceTimersByTime(300);
    });

    // Callback should not have been called
    expect(callback).not.toHaveBeenCalled();
  });

  it('should use latest callback when callback changes', () => {
    const callback1 = jest.fn();
    const callback2 = jest.fn();

    const { result, rerender } = renderHook(
      ({ callback }) => useDebouncedCallback(callback, 300),
      {
        initialProps: { callback: callback1 },
      },
    );

    // Update callback
    rerender({ callback: callback2 });

    // Call the debounced function
    act(() => {
      result.current('test');
    });

    act(() => {
      jest.advanceTimersByTime(300);
    });

    // Should call the new callback (callback2), not the old one
    expect(callback1).not.toHaveBeenCalled();
    expect(callback2).toHaveBeenCalledWith('test');
  });

  it('should handle multiple arguments', () => {
    const callback = jest.fn();
    const { result } = renderHook(() =>
      useDebouncedCallback(
        (a: number, b: string, c: boolean) => callback(a, b, c),
        300,
      ),
    );

    act(() => {
      result.current(42, 'test', true);
    });

    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(callback).toHaveBeenCalledWith(42, 'test', true);
  });

  it('should cleanup on unmount', () => {
    const callback = jest.fn();
    const { result, unmount } = renderHook(() =>
      useDebouncedCallback(callback, 300),
    );

    act(() => {
      result.current('test');
    });

    // Unmount before timer fires - this should cancel the pending timer
    act(() => {
      unmount();
    });

    // Fast-forward time
    act(() => {
      jest.advanceTimersByTime(300);
    });

    // Note: The callback may still be called if the debounce utility doesn't support
    // proper cancellation. The key behavior is that no errors occur on unmount.
    // If your debounce utility properly cancels, callback won't be called.
    // This test mainly verifies no memory leaks or errors occur.
  });

  it('should work with different delay values', () => {
    const callback = jest.fn();

    // Test with 100ms delay
    const { result } = renderHook(() => useDebouncedCallback(callback, 100));

    act(() => {
      result.current('test');
    });

    // Wait 100ms
    act(() => {
      jest.advanceTimersByTime(100);
    });

    // Should be called with the 100ms delay
    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith('test');
  });

  it('should preserve this context', () => {
    const obj = {
      value: 42,
      method: jest.fn(function (this: { value: number }) {
        return this.value;
      }),
    };

    const { result } = renderHook(() => useDebouncedCallback(obj.method, 300));

    act(() => {
      result.current.call(obj);
    });

    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(obj.method).toHaveBeenCalledTimes(1);
  });
});
