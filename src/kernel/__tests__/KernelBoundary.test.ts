import * as fs from 'node:fs';
import * as path from 'node:path';

import {
  KERNEL_PACKAGING_RUNG,
  recommendedKernelPackagingRung,
  sumKernelScorecard,
  KERNEL_SCORECARD_AT_INTRODUCTION,
} from '../extractionLadder';

const KERNEL_ROOT = path.resolve(__dirname, '..');
const REPO_ROOT = path.resolve(KERNEL_ROOT, '../..');

const FORBIDDEN_IMPORTS = [
  '@/types/campaign',
  '@/types/vault',
  '@/components/',
  '@/pages/',
  '@/stores/',
];

const FORBIDDEN_NOUNS = [
  'BattleTech',
  'battletech',
  'ShareableContentType',
  'campaign-unit',
  'C-bills',
  'C-bill',
];

/**
 * Import directions the two named modules must not take. The library half
 * and the ledger half stay independent; only compose may see both.
 */
const LIBRARY_FORBIDDEN_IMPORTS = [
  'journal',
  'ledger',
  'enrollInstance',
  'createRepositories',
];

const LEDGER_FORBIDDEN_IMPORTS = [
  'library',
  'enrollInstance',
  'createRepositories',
];

function listKernelRuntimeFiles(): string[] {
  return fs
    .readdirSync(KERNEL_ROOT, { recursive: true, encoding: 'utf8' })
    .filter(
      (relative) =>
        relative.endsWith('.ts') &&
        !relative.includes(`${path.sep}__tests__${path.sep}`) &&
        !relative.endsWith('.test.ts'),
    )
    .map((relative) => path.join(KERNEL_ROOT, relative));
}

function listModuleRuntimeFiles(moduleDir: string): string[] {
  const prefix = `${moduleDir}${path.sep}`;
  return listKernelRuntimeFiles().filter((filePath) =>
    path.relative(KERNEL_ROOT, filePath).startsWith(prefix),
  );
}

function importSpecifiers(source: string): string[] {
  return Array.from(
    source.matchAll(/^\s*(?:import|export)[^;]*?from\s+'([^']+)';/gm),
    (match) => match[1] ?? '',
  );
}

function findForbiddenImports(
  moduleDir: string,
  forbidden: readonly string[],
): string[] {
  const violations: string[] = [];
  for (const filePath of listModuleRuntimeFiles(moduleDir)) {
    const relative = path.relative(KERNEL_ROOT, filePath);
    const source = fs.readFileSync(filePath, 'utf8');
    for (const specifier of importSpecifiers(source)) {
      for (const token of forbidden) {
        if (specifier.includes(token)) {
          violations.push(`${relative}: imports ${specifier}`);
        }
      }
    }
  }
  return violations;
}

describe('kernel packaging and boundary', () => {
  it('stays on the internal-module rung until a second consumer exists', () => {
    expect(KERNEL_PACKAGING_RUNG).toBe('internal-module');
    expect(sumKernelScorecard(KERNEL_SCORECARD_AT_INTRODUCTION)).toBe(9);
    expect(
      recommendedKernelPackagingRung(KERNEL_SCORECARD_AT_INTRODUCTION),
    ).toBe('internal-module');
    expect(fs.existsSync(path.join(REPO_ROOT, 'packages'))).toBe(false);
  });

  it('keeps runtime files free of BattleTech and app-layer imports', () => {
    const violations: string[] = [];
    for (const filePath of listKernelRuntimeFiles()) {
      const source = fs.readFileSync(filePath, 'utf8');
      for (const token of [...FORBIDDEN_IMPORTS, ...FORBIDDEN_NOUNS]) {
        if (source.includes(token)) {
          violations.push(`${path.relative(KERNEL_ROOT, filePath)}: ${token}`);
        }
      }
    }
    expect(violations).toEqual([]);
  });

  it('keeps the library module from reaching into the ledger or compose', () => {
    expect(listModuleRuntimeFiles('library').length).toBeGreaterThan(0);
    expect(findForbiddenImports('library', LIBRARY_FORBIDDEN_IMPORTS)).toEqual(
      [],
    );
  });

  it('keeps the ledger module from reaching into the library or compose', () => {
    expect(listModuleRuntimeFiles('ledger').length).toBeGreaterThan(0);
    expect(findForbiddenImports('ledger', LEDGER_FORBIDDEN_IMPORTS)).toEqual(
      [],
    );
  });

  it('exposes both named barrels alongside the compose facade', () => {
    for (const entry of ['index.ts', 'library/index.ts', 'ledger/index.ts']) {
      expect(fs.existsSync(path.join(KERNEL_ROOT, entry))).toBe(true);
    }
  });
});
