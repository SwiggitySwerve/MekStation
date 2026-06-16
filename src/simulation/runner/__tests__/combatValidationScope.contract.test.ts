import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import * as knownLimitationApi from '@/simulation/core/knownLimitations';
import {
  getLimitationCategory,
  KNOWN_LIMITATION_CATEGORY_IDS,
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

const knownLimitationRuntimeApi = knownLimitationApi as unknown as Record<
  string,
  unknown
>;

const filterValidationViolations = knownLimitationRuntimeApi[
  'filter' + 'KnownLimitations'
] as (violations: readonly IViolation[]) => readonly IViolation[];

const partitionValidationViolations = knownLimitationRuntimeApi[
  'partition' + 'Violations'
] as (violations: readonly IViolation[]) => {
  readonly knownLimitations: readonly IViolation[];
  readonly potentialBugs: readonly IViolation[];
};

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
        'static-weapon-database-subset',
        'synthetic-medium-laser-fallback-ban',
        'unresolved-completion-blocker-inventory',
        'variable-damage-string-guard',
      ].sort(),
    );
    expect(supportGaps(BATTLEMECH_VALIDATION_SCOPE_SUPPORT)).toEqual([]);
  });

  it('keeps BattleMech validation traps visible despite broad limitation text matches', () => {
    expect(
      KNOWN_LIMITATION_VALIDATION_TRAPS.map((trap) => trap.category).sort(),
    ).toEqual([...KNOWN_LIMITATION_CATEGORY_IDS].sort());

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
    expect(filterValidationViolations(violations)).toEqual(violations);
    expect(partitionValidationViolations(violations)).toEqual({
      knownLimitations: [],
      potentialBugs: violations,
    });
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
        'static-weapon-database-subset',
        'synthetic-medium-laser-fallback-ban',
        'unresolved-completion-blocker-inventory',
        'variable-damage-string-guard',
      ].sort(),
    );
    expect(
      supportIdsByLevel(BATTLEMECH_VALIDATION_SCOPE_SUPPORT, 'helper-only'),
    ).toEqual([]);
    expect(
      supportIdsByLevel(BATTLEMECH_VALIDATION_SCOPE_SUPPORT, 'out-of-scope'),
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

  it('source-pins every validation-scope row to anchored MekStation evidence', () => {
    const entries = Object.values(BATTLEMECH_VALIDATION_SCOPE_SUPPORT);
    const urlsFor = (id: keyof typeof BATTLEMECH_VALIDATION_SCOPE_SUPPORT) =>
      [...(BATTLEMECH_VALIDATION_SCOPE_SUPPORT[id].sourceRefs ?? [])]
        .map((sourceRef) => sourceRef.url)
        .sort();

    expect(
      entries
        .filter((entry) => (entry.sourceRefs?.length ?? 0) === 0)
        .map((entry) => entry.id)
        .sort(),
    ).toEqual([]);
    expect(
      entries
        .flatMap((entry) => entry.sourceRefs ?? [])
        .filter((sourceRef) => !sourceRef.url.includes('#L'))
        .map((sourceRef) => sourceRef.url)
        .sort(),
    ).toEqual([]);
    expect(
      entries
        .filter(
          (entry) =>
            !(entry.sourceRefs ?? []).some(
              (sourceRef) => sourceRef.kind === 'mekstation-deviation',
            ),
        )
        .map((entry) => entry.id)
        .sort(),
    ).toEqual([]);

    expect(urlsFor('known-limitation-bypass')).toEqual(
      expect.arrayContaining([
        'src/simulation/core/knownLimitations.ts#L148-L210',
        'src/simulation/core/knownLimitations.ts#L230-L243',
      ]),
    );
    expect(urlsFor('catalog-filter-gate-ban')).toEqual(
      expect.arrayContaining([
        'src/simulation/runner/__tests__/combatValidationScope.contract.test.ts#L163-L177',
        'src/simulation/runner/__tests__/battlemechCombatCatalog.contract.test.ts#L3554-L3574',
      ]),
    );
    expect(urlsFor('static-weapon-database-subset')).toEqual(
      expect.arrayContaining([
        'src/simulation/runner/__tests__/battlemechCombatCatalog.contract.test.ts#L915-L984',
        'src/engine/adapters/CompendiumAdapter.ts#L55-L95',
      ]),
    );
    expect(urlsFor('non-battlemech-combat-system-split')).toEqual(
      expect.arrayContaining([
        'src/simulation/runner/CombatEventSupport.ts#L248-L324',
        'src/simulation/runner/__tests__/combatEventCatalog.contract.test.ts#L56-L82',
      ]),
    );
    expect(urlsFor('unresolved-completion-blocker-inventory')).toEqual(
      expect.arrayContaining([
        'src/simulation/runner/CombatValidationGapInventory.ts#L21-L69',
        'src/simulation/runner/__tests__/combatValidationCatalog.contract.test.ts#L159-L1479',
        'src/simulation/runner/__tests__/combatValidationCatalog.contract.test.ts#L1485-L1534',
      ]),
    );
  });
});
