/**
 * Tests for `createZodPersistMerge` — the Zod-validated `persist` merge helper.
 *
 * Boundary: `localStorage` store hydration. Failure mode under test —
 * a malformed persisted payload is discarded and the store falls back to
 * its default (current) state without throwing (`validation-patterns` —
 * "Corrupt persisted store state falls back to default").
 *
 * @spec openspec/specs/validation-patterns/spec.md
 */

import { z } from 'zod';

import { createZodPersistMerge } from '../zodPersistMerge';

// A minimal flat persisted shape mirroring the settings stores.
const Schema = z.object({
  theme: z.enum(['light', 'dark']),
  count: z.number(),
});

// The "full store state" — persisted fields plus an action function.
interface TestState {
  theme: 'light' | 'dark';
  count: number;
  setTheme: () => void;
}

const DEFAULT_STATE: TestState = {
  theme: 'light',
  count: 0,
  setTheme: () => undefined,
};

describe('createZodPersistMerge', () => {
  it('merges a valid persisted payload over the default state', () => {
    const merge = createZodPersistMerge<TestState>(Schema, 'test-store');
    const result = merge({ theme: 'dark', count: 7 }, DEFAULT_STATE);

    expect(result.theme).toBe('dark');
    expect(result.count).toBe(7);
    // Actions from the default (current) state are preserved.
    expect(result.setTheme).toBe(DEFAULT_STATE.setTheme);
  });

  it('discards a payload with a wrong-typed field and falls back to default', () => {
    const merge = createZodPersistMerge<TestState>(Schema, 'test-store');
    // `count` is a string — schema violation.
    const result = merge(
      { theme: 'dark', count: 'not-a-number' },
      DEFAULT_STATE,
    );

    expect(result.theme).toBe(DEFAULT_STATE.theme);
    expect(result.count).toBe(DEFAULT_STATE.count);
  });

  it('discards a payload with an out-of-enum value and falls back to default', () => {
    const merge = createZodPersistMerge<TestState>(Schema, 'test-store');
    const result = merge({ theme: 'neon', count: 3 }, DEFAULT_STATE);

    expect(result.theme).toBe(DEFAULT_STATE.theme);
    expect(result.count).toBe(DEFAULT_STATE.count);
  });

  it('discards a non-object payload and falls back to default', () => {
    const merge = createZodPersistMerge<TestState>(Schema, 'test-store');
    const result = merge('a bare string', DEFAULT_STATE);

    expect(result).toEqual(DEFAULT_STATE);
  });

  it('never throws on an invalid payload', () => {
    const merge = createZodPersistMerge<TestState>(Schema, 'test-store');
    expect(() => merge({ garbage: true }, DEFAULT_STATE)).not.toThrow();
    expect(() => merge(undefined, DEFAULT_STATE)).not.toThrow();
    expect(() => merge(null, DEFAULT_STATE)).not.toThrow();
  });

  it('returns the default state unchanged when there is no payload', () => {
    const merge = createZodPersistMerge<TestState>(Schema, 'test-store');
    // `persist` calls `merge` with `undefined` on a fresh install.
    expect(merge(undefined, DEFAULT_STATE)).toBe(DEFAULT_STATE);
    expect(merge(null, DEFAULT_STATE)).toBe(DEFAULT_STATE);
  });
});
