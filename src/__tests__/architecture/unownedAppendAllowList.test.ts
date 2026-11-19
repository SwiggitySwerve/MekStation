/**
 * The unowned-append test-file allow-list (A6) may only shrink, and every
 * entry names a real test file with a category and a reason.
 */
import { existsSync } from 'node:fs';
import path from 'node:path';

import {
  UNOWNED_APPEND_ALLOWED_TEST_FILES,
  UNOWNED_APPEND_CATEGORY_CEILINGS,
  type UnownedAppendCategory,
} from './unownedAppendAllowList';

/** src/, so the result cache keys this test on src/ only. */
const SRC = path.resolve(__dirname, '../..');
const entries = Object.entries(UNOWNED_APPEND_ALLOWED_TEST_FILES);

describe('unowned-append test-file allow-list', () => {
  it('holds no more files per category than today (it only shrinks)', () => {
    const counts: Record<UnownedAppendCategory, number> = {
      'production-path': 0,
      'fixture-fold-equal': 0,
      'fixture-fold-diverges': 0,
    };
    for (const [, entry] of entries) counts[entry.category] += 1;
    for (const category of Object.keys(counts) as UnownedAppendCategory[]) {
      expect([category, counts[category]]).toEqual([
        category,
        Math.min(counts[category], UNOWNED_APPEND_CATEGORY_CEILINGS[category]),
      ]);
    }
    expect(entries.length).toBeLessThanOrEqual(80);
  });

  it('names existing test files, each with a reason', () => {
    const problems = entries.flatMap(([file, entry]) => [
      ...(file.startsWith('src/') &&
      existsSync(path.join(SRC, file.slice('src/'.length)))
        ? []
        : [`${file}: missing`]),
      ...(/\.test\.tsx?$/.test(file) ? [] : [`${file}: not a test file`]),
      ...(entry.reason.trim() ? [] : [`${file}: no reason`]),
    ]);
    expect(problems).toEqual([]);
  });
});
