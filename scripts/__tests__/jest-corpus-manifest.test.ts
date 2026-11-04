import * as fs from 'node:fs';
import * as path from 'node:path';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const manifest = require('../../config/jest/corpus-suites') as {
  corpusSuites: string[];
  roadmapSuites: string[];
  toIgnorePattern: (file: string) => string;
  toTestMatch: (file: string) => string;
};

const repoRoot = path.resolve(__dirname, '../..');

describe('jest corpus/roadmap split manifest', () => {
  const all = [...manifest.corpusSuites, ...manifest.roadmapSuites];

  it('lists only test files that exist, so a rename cannot silently un-split a suite', () => {
    const missing = all.filter(
      (file) => !fs.existsSync(path.join(repoRoot, file)),
    );
    expect(missing).toEqual([]);
  });

  it('lists each suite once and keeps corpus and roadmap disjoint', () => {
    expect(new Set(all).size).toBe(all.length);
  });

  it('ignore patterns match their own file with / or \\ separators and nothing nearby', () => {
    const target = 'src/types/contracts/__tests__/unit.contract.test.ts';
    const pattern = new RegExp(manifest.toIgnorePattern(target));
    expect(pattern.test(`/repo/${target}`)).toBe(true);
    expect(pattern.test(`C:\\repo\\${target.replace(/\//g, '\\')}`)).toBe(true);
    expect(
      pattern.test('/repo/src/types/contracts/__tests__/unit.contractXtest.ts'),
    ).toBe(false);
    expect(
      pattern.test(
        '/repo/src/types/contracts/__tests__/unit.tonnage.contract.test.ts',
      ),
    ).toBe(false);
  });
});
