import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  getLimitationCategory,
  getLimitationPatternCategory,
  isKnownLimitation,
  type IViolation,
} from '@/simulation/core/knownLimitations';

import type { ICombatFeatureSupportEntry } from '../CombatFeatureSupport';

import {
  BATTLEMECH_COMBAT_VALIDATION_INVARIANT,
  BATTLEMECH_VALIDATION_SCOPE_SUPPORT,
  KNOWN_LIMITATION_VALIDATION_TRAPS,
} from '../CombatValidationScopeSupport';

function sortedKeys(record: Record<string, unknown>): readonly string[] {
  return Object.keys(record).sort();
}

function supportGaps(
  support: Record<string, ICombatFeatureSupportEntry>,
): readonly string[] {
  return Object.values(support)
    .filter(
      (entry) =>
        entry.evidence.length === 0 ||
        (entry.level !== 'integrated' &&
          (entry.gap === undefined || entry.gap.length === 0)),
    )
    .map((entry) => entry.id)
    .sort();
}

function supportIdsByLevel(
  support: Record<string, ICombatFeatureSupportEntry>,
  level: ICombatFeatureSupportEntry['level'],
): readonly string[] {
  return Object.values(support)
    .filter((entry) => entry.level === level)
    .map((entry) => entry.id)
    .sort();
}

function validationViolation(message: string): IViolation {
  return {
    invariant: BATTLEMECH_COMBAT_VALIDATION_INVARIANT,
    severity: 'warning',
    message,
    context: {},
  };
}

function runnerCombatCatalogContractSources(): readonly {
  readonly file: string;
  readonly source: string;
}[] {
  const testDirectory = join(
    process.cwd(),
    'src',
    'simulation',
    'runner',
    '__tests__',
  );
  return readdirSync(testDirectory)
    .filter((file) =>
      /^(battlemechCombatCatalog|combat.*)\.contract\.test\.ts$/.test(file),
    )
    .sort()
    .map((file) => ({
      file,
      source: readFileSync(join(testDirectory, file), 'utf8'),
    }));
}

describe('BattleMech validation scope support catalog', () => {
  it('catalogs known-limitation bypasses and non-BattleMech scope splits', () => {
    expect(sortedKeys(BATTLEMECH_VALIDATION_SCOPE_SUPPORT)).toEqual(
      [
        'battlemech-official-catalog-scope',
        'catalog-filter-gate-ban',
        'known-limitation-bypass',
        'known-limitation-pattern-audit',
        'non-battlemech-ammo-scope',
        'non-battlemech-combat-system-split',
      ].sort(),
    );
    expect(supportGaps(BATTLEMECH_VALIDATION_SCOPE_SUPPORT)).toEqual([]);
  });

  it('keeps BattleMech validation traps visible despite broad limitation text matches', () => {
    const violations = KNOWN_LIMITATION_VALIDATION_TRAPS.map((trap) =>
      validationViolation(trap.message),
    );

    expect(violations.every(isKnownLimitation)).toBe(false);
    expect(violations.map(getLimitationCategory)).toEqual(
      violations.map(() => null),
    );
    expect(violations.map(getLimitationPatternCategory)).toEqual(
      KNOWN_LIMITATION_VALIDATION_TRAPS.map((trap) => trap.category),
    );
  });

  it('keeps non-BattleMech systems explicitly scoped out of this catalog lane', () => {
    expect(
      supportIdsByLevel(BATTLEMECH_VALIDATION_SCOPE_SUPPORT, 'integrated'),
    ).toEqual(
      [
        'battlemech-official-catalog-scope',
        'catalog-filter-gate-ban',
        'known-limitation-bypass',
        'known-limitation-pattern-audit',
      ].sort(),
    );
    expect(
      supportIdsByLevel(BATTLEMECH_VALIDATION_SCOPE_SUPPORT, 'helper-only'),
    ).toEqual(
      [
        'non-battlemech-ammo-scope',
        'non-battlemech-combat-system-split',
      ].sort(),
    );
  });

  it('prevents known-limitation filters from becoming catalog gatekeepers', () => {
    const forbiddenGateSymbols = [
      'filter' + 'KnownLimitations',
      'partition' + 'Violations',
    ];

    const offenders = runnerCombatCatalogContractSources().flatMap(
      ({ file, source }) =>
        forbiddenGateSymbols
          .filter((symbol) => source.includes(symbol))
          .map((symbol) => `${file}:${symbol}`),
    );

    expect(offenders).toEqual([]);
  });
});
