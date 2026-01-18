/**
 * Tests for Debounce Utility
 *
 * @module utils/__tests__/debounce.test
 */

import { debounce } from '../debounce';

describe('debounce', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllTimers();
  });

  it('should delay function execution', () => {
    const func = jest.fn();
    const debounced = debounce(func, 300);

    debounced();

    // Function should not be called immediately
    expect(func).not.toHaveBeenCalled();

    // Fast-forward time
    jest.advanceTimersByTime(300);

    // Function should now be called
    expect(func).toHaveBeenCalledTimes(1);
  });

  it('should only call function once for multiple rapid calls', () => {
    const func = jest.fn();
    const debounced = debounce(func, 300);

    // Call multiple times
    debounced();
    debounced();
    debounced();
    debounced();

    // Function should not be called yet
    expect(func).not.toHaveBeenCalled();

    // Fast-forward time
    jest.advanceTimersByTime(300);

    // Function should be called only once
    expect(func).toHaveBeenCalledTimes(1);
  });

  it('should reset timer on subsequent calls', () => {
    const func = jest.fn();
    const debounced = debounce(func, 300);

    debounced();

    // Wait 200ms
    jest.advanceTimersByTime(200);

    // Call again (should reset timer)
    debounced();

    // Wait another 200ms (total 400ms)
    jest.advanceTimersByTime(200);

    // Function should not have been called yet (timer was reset)
    expect(func).not.toHaveBeenCalled();

    // Wait the final 100ms
    jest.advanceTimersByTime(100);

    // Now function should be called
    expect(func).toHaveBeenCalledTimes(1);
  });

  it('should pass arguments to the debounced function', () => {
    const func = jest.fn();
    const debounced = debounce(func, 300);

    debounced('arg1', 'arg2', 'arg3');

    jest.advanceTimersByTime(300);

    expect(func).toHaveBeenCalledWith('arg1', 'arg2', 'arg3');
  });

  it('should use the most recent arguments', () => {
    const func = jest.fn();
    const debounced = debounce(func, 300);

    debounced('first');
    debounced('second');
    debounced('third');

    jest.advanceTimersByTime(300);

    // Should be called with the last arguments
    expect(func).toHaveBeenCalledWith('third');
    expect(func).toHaveBeenCalledTimes(1);
  });

  it('should support cancel method', () => {
    const func = jest.fn();
    const debounced = debounce(func, 300);

    debounced();

    // Cancel before timer fires
    debounced.cancel();

    // Fast-forward time
    jest.advanceTimersByTime(300);

    // Function should not have been called
    expect(func).not.toHaveBeenCalled();
  });

  it('should handle multiple cancel calls safely', () => {
    const func = jest.fn();
    const debounced = debounce(func, 300);

    debounced();
    debounced.cancel();
    debounced.cancel(); // Multiple cancels should not error

    jest.advanceTimersByTime(300);

    expect(func).not.toHaveBeenCalled();
  });

  it('should work after cancel', () => {
    const func = jest.fn();
    const debounced = debounce(func, 300);

    // First call and cancel
    debounced('first');
    debounced.cancel();

    // Second call after cancel
    debounced('second');

    jest.advanceTimersByTime(300);

    // Should be called with second arguments
    expect(func).toHaveBeenCalledTimes(1);
    expect(func).toHaveBeenCalledWith('second');
  });

  it('should preserve this context', () => {
    const obj = {
      value: 42,
      method: jest.fn(function (this: { value: number }) {
        return this.value;
      }),
    };

    const debounced = debounce(obj.method, 300);

    debounced.call(obj);

    jest.advanceTimersByTime(300);

    expect(obj.method).toHaveBeenCalledTimes(1);
  });

  it('should handle different delay values', () => {
    const func1 = jest.fn();
    const func2 = jest.fn();

    const debounced1 = debounce(func1, 100);
    const debounced2 = debounce(func2, 500);

    debounced1();
    debounced2();

    // After 100ms, only first should be called
    jest.advanceTimersByTime(100);
    expect(func1).toHaveBeenCalledTimes(1);
    expect(func2).not.toHaveBeenCalled();

    // After 500ms total, second should be called
    jest.advanceTimersByTime(400);
    expect(func2).toHaveBeenCalledTimes(1);
  });

  it('should handle zero delay', () => {
    const func = jest.fn();
    const debounced = debounce(func, 0);

    debounced();

    // Should be called on next tick
    jest.advanceTimersByTime(0);
    expect(func).toHaveBeenCalledTimes(1);
  });

  it('should allow multiple debounced functions independently', () => {
    const func1 = jest.fn();
    const func2 = jest.fn();

    const debounced1 = debounce(func1, 300);
    const debounced2 = debounce(func2, 300);

    debounced1('test1');
    debounced2('test2');

    jest.advanceTimersByTime(300);

    expect(func1).toHaveBeenCalledWith('test1');
    expect(func2).toHaveBeenCalledWith('test2');
  });

  it('should type-check correctly with generics', () => {
    // This test is primarily for TypeScript type checking
    const stringFunc = jest.fn((s: string): string => s.toUpperCase());
    const numberFunc = jest.fn((n: number): number => n * 2);

    const debouncedString = debounce(stringFunc, 300);
    const debouncedNumber = debounce(numberFunc, 300);

    debouncedString('test');
    debouncedNumber(42);

    jest.advanceTimersByTime(300);

    expect(stringFunc).toHaveBeenCalledWith('test');
    expect(numberFunc).toHaveBeenCalledWith(42);
  });
});
