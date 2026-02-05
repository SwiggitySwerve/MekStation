/**
 * useAsync Hook Tests
 *
 * TDD tests for the async operation utility hook.
 */

import { renderHook, act, waitFor } from '@testing-library/react';

import { useAsync } from '../useAsync';

describe('useAsync', () => {
  describe('initial state', () => {
    it('should start with idle status', () => {
      const asyncFn = jest.fn().mockResolvedValue('data');
      const { result } = renderHook(() => useAsync(asyncFn));

      expect(result.current.status).toBe('idle');
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isIdle).toBe(true);
      expect(result.current.isSuccess).toBe(false);
      expect(result.current.isError).toBe(false);
      expect(result.current.data).toBeUndefined();
      expect(result.current.error).toBeNull();
    });

    it('should accept initial data', () => {
      const asyncFn = jest.fn().mockResolvedValue('new data');
      const { result } = renderHook(() =>
        useAsync(asyncFn, { initialData: 'initial' }),
      );

      expect(result.current.data).toBe('initial');
    });
  });

  describe('immediate execution', () => {
    it('should execute immediately when immediate is true', async () => {
      const asyncFn = jest.fn().mockResolvedValue('data');
      const { result } = renderHook(() =>
        useAsync(asyncFn, { immediate: true }),
      );

      expect(asyncFn).toHaveBeenCalled();

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });
    });

    it('should not execute immediately by default', () => {
      const asyncFn = jest.fn().mockResolvedValue('data');
      renderHook(() => useAsync(asyncFn));

      expect(asyncFn).not.toHaveBeenCalled();
    });
  });

  describe('execute', () => {
    it('should execute the async function', async () => {
      const asyncFn = jest.fn().mockResolvedValue('data');
      const { result } = renderHook(() => useAsync(asyncFn));

      await act(async () => {
        await result.current.execute();
      });

      expect(asyncFn).toHaveBeenCalled();
      expect(result.current.data).toBe('data');
    });

    it('should pass arguments to the async function', async () => {
      const asyncFn = jest
        .fn()
        .mockImplementation((a: number, b: number) => Promise.resolve(a + b));
      const { result } = renderHook(() => useAsync(asyncFn));

      await act(async () => {
        await result.current.execute(1, 2);
      });

      expect(asyncFn).toHaveBeenCalledWith(1, 2);
      expect(result.current.data).toBe(3);
    });

    it('should return the result from execute', async () => {
      const asyncFn: () => Promise<string> = jest
        .fn()
        .mockResolvedValue('result');
      const { result } = renderHook(() => useAsync(asyncFn));

      let returnValue: string | undefined;
      await act(async () => {
        returnValue = await result.current.execute();
      });

      expect(returnValue).toBe('result');
    });
  });

  describe('loading state', () => {
    it('should set loading during execution', async () => {
      let resolvePromise: (value: string) => void;
      const asyncFn = jest.fn().mockImplementation(
        () =>
          new Promise<string>((resolve) => {
            resolvePromise = resolve;
          }),
      );

      const { result } = renderHook(() => useAsync(asyncFn));

      // Start execution
      let executePromise: Promise<unknown>;
      act(() => {
        executePromise = result.current.execute();
      });

      // Should be loading
      expect(result.current.isLoading).toBe(true);
      expect(result.current.status).toBe('loading');

      // Resolve
      await act(async () => {
        resolvePromise!('data');
        await executePromise;
      });

      // Should not be loading anymore
      expect(result.current.isLoading).toBe(false);
      expect(result.current.status).toBe('success');
    });
  });

  describe('success state', () => {
    it('should set success status on completion', async () => {
      const asyncFn = jest.fn().mockResolvedValue('data');
      const { result } = renderHook(() => useAsync(asyncFn));

      await act(async () => {
        await result.current.execute();
      });

      expect(result.current.status).toBe('success');
      expect(result.current.isSuccess).toBe(true);
      expect(result.current.data).toBe('data');
      expect(result.current.error).toBeNull();
    });

    it('should call onSuccess callback', async () => {
      const onSuccess = jest.fn();
      const asyncFn = jest.fn().mockResolvedValue('data');
      const { result } = renderHook(() => useAsync(asyncFn, { onSuccess }));

      await act(async () => {
        await result.current.execute();
      });

      expect(onSuccess).toHaveBeenCalledWith('data');
    });
  });

  describe('error state', () => {
    it('should set error status on failure', async () => {
      const error = new Error('Failed');
      const asyncFn = jest.fn().mockRejectedValue(error);
      const { result } = renderHook(() => useAsync(asyncFn));

      await act(async () => {
        try {
          await result.current.execute();
        } catch {
          // Expected error
        }
      });

      expect(result.current.status).toBe('error');
      expect(result.current.isError).toBe(true);
      expect(result.current.error).toBe(error);
    });

    it('should wrap non-Error rejections', async () => {
      const asyncFn = jest.fn().mockRejectedValue('string error');
      const { result } = renderHook(() => useAsync(asyncFn));

      await act(async () => {
        try {
          await result.current.execute();
        } catch {
          // Expected error
        }
      });

      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error?.message).toBe('string error');
    });

    it('should call onError callback', async () => {
      const onError = jest.fn();
      const error = new Error('Failed');
      const asyncFn = jest.fn().mockRejectedValue(error);
      const { result } = renderHook(() => useAsync(asyncFn, { onError }));

      await act(async () => {
        try {
          await result.current.execute();
        } catch {
          // Expected error
        }
      });

      expect(onError).toHaveBeenCalledWith(error);
    });

    it('should preserve data from previous success on error', async () => {
      const asyncFn = jest
        .fn()
        .mockResolvedValueOnce('data')
        .mockRejectedValueOnce(new Error('Failed'));

      const { result } = renderHook(() => useAsync(asyncFn));

      // First call succeeds
      await act(async () => {
        await result.current.execute();
      });
      expect(result.current.data).toBe('data');

      // Second call fails
      await act(async () => {
        try {
          await result.current.execute();
        } catch {
          // Expected error
        }
      });

      // Data should be preserved
      expect(result.current.data).toBe('data');
      expect(result.current.isError).toBe(true);
    });
  });

  describe('reset', () => {
    it('should reset to initial state', async () => {
      const asyncFn = jest.fn().mockResolvedValue('data');
      const { result } = renderHook(() => useAsync(asyncFn));

      await act(async () => {
        await result.current.execute();
      });

      expect(result.current.data).toBe('data');

      act(() => {
        result.current.reset();
      });

      expect(result.current.status).toBe('idle');
      expect(result.current.data).toBeUndefined();
      expect(result.current.error).toBeNull();
    });

    it('should reset to initial data if provided', async () => {
      const asyncFn = jest.fn().mockResolvedValue('new data');
      const { result } = renderHook(() =>
        useAsync(asyncFn, { initialData: 'initial' }),
      );

      await act(async () => {
        await result.current.execute();
      });

      expect(result.current.data).toBe('new data');

      act(() => {
        result.current.reset();
      });

      expect(result.current.data).toBe('initial');
    });
  });

  describe('retry', () => {
    it('should retry the last execution', async () => {
      const asyncFn = jest
        .fn()
        .mockRejectedValueOnce(new Error('First fail'))
        .mockResolvedValueOnce('success');

      const { result } = renderHook(() => useAsync(asyncFn));

      // First call fails
      await act(async () => {
        try {
          await result.current.execute('arg1');
        } catch {
          // Expected error
        }
      });

      expect(result.current.isError).toBe(true);

      // Retry succeeds
      await act(async () => {
        await result.current.retry();
      });

      expect(asyncFn).toHaveBeenCalledTimes(2);
      expect(asyncFn).toHaveBeenLastCalledWith('arg1');
      expect(result.current.isSuccess).toBe(true);
      expect(result.current.data).toBe('success');
    });
  });

  describe('setData', () => {
    it('should allow setting data manually', () => {
      const asyncFn = jest.fn().mockResolvedValue('async data');
      const { result } = renderHook(() => useAsync(asyncFn));

      act(() => {
        result.current.setData('manual data');
      });

      expect(result.current.data).toBe('manual data');
    });
  });

  describe('cleanup on unmount', () => {
    it('should not update state after unmount', async () => {
      // Suppress console.error for this test since we're testing cleanup
      const consoleSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      let resolvePromise: (value: string) => void;
      const asyncFn = jest.fn().mockImplementation(
        () =>
          new Promise<string>((resolve) => {
            resolvePromise = resolve;
          }),
      );

      const { result, unmount } = renderHook(() => useAsync(asyncFn));

      // Start execution
      act(() => {
        result.current.execute();
      });

      // Unmount before resolution
      unmount();

      // Resolve after unmount - should not cause errors
      await act(async () => {
        resolvePromise!('data');
        // Give time for any state updates to attempt
        await new Promise((resolve) => setTimeout(resolve, 10));
      });

      consoleSpy.mockRestore();
      // Test passes if no error was thrown
    });
  });
});
