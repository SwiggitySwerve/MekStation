import type {
  ICombatFeatureSourceReference,
  ICombatFeatureSupportEntry,
} from './CombatFeatureSupport';

import {
  BATTLEMECH_COMBAT_VALIDATION_CATALOG,
  type CombatValidationCatalogSection,
} from './CombatValidationCatalog';

type UnresolvedCombatSupportLevel = Exclude<
  ICombatFeatureSupportEntry['level'],
  'integrated' | 'out-of-scope'
>;

type OutOfScopeCombatSupportLevel = Extract<
  ICombatFeatureSupportEntry['level'],
  'out-of-scope'
>;

export interface ICombatValidationUnresolvedRow {
  readonly ref: string;
  readonly sectionId: string;
  readonly mapId: string;
  readonly entryId: string;
  readonly level: UnresolvedCombatSupportLevel;
  readonly evidence: string;
  readonly gap: string;
  readonly sourceRefs: readonly ICombatFeatureSourceReference[];
}

export interface ICombatValidationOutOfScopeRow {
  readonly ref: string;
  readonly sectionId: string;
  readonly mapId: string;
  readonly entryId: string;
  readonly level: OutOfScopeCombatSupportLevel;
  readonly evidence: string;
  readonly gap: string;
  readonly sourceRefs: readonly ICombatFeatureSourceReference[];
}

export function getCombatValidationUnresolvedRows(
  catalog: Readonly<
    Record<string, CombatValidationCatalogSection>
  > = BATTLEMECH_COMBAT_VALIDATION_CATALOG,
): readonly ICombatValidationUnresolvedRow[] {
  const rows: ICombatValidationUnresolvedRow[] = [];

  for (const [sectionId, section] of Object.entries(catalog)) {
    for (const [mapId, support] of Object.entries(section)) {
      for (const [entryId, entry] of Object.entries(support)) {
        if (entry.level === 'integrated' || entry.level === 'out-of-scope') {
          continue;
        }

        rows.push({
          ref: `${sectionId}.${mapId}.${entryId}`,
          sectionId,
          mapId,
          entryId,
          level: entry.level,
          evidence: entry.evidence,
          gap: entry.gap ?? '',
          sourceRefs: entry.sourceRefs ?? [],
        });
      }
    }
  }

  return rows.sort((left, right) => left.ref.localeCompare(right.ref));
}

export function getCombatValidationOutOfScopeRows(
  catalog: Readonly<
    Record<string, CombatValidationCatalogSection>
  > = BATTLEMECH_COMBAT_VALIDATION_CATALOG,
): readonly ICombatValidationOutOfScopeRow[] {
  const rows: ICombatValidationOutOfScopeRow[] = [];

  for (const [sectionId, section] of Object.entries(catalog)) {
    for (const [mapId, support] of Object.entries(section)) {
      for (const [entryId, entry] of Object.entries(support)) {
        if (entry.level !== 'out-of-scope') continue;

        rows.push({
          ref: `${sectionId}.${mapId}.${entryId}`,
          sectionId,
          mapId,
          entryId,
          level: entry.level,
          evidence: entry.evidence,
          gap: entry.gap ?? '',
          sourceRefs: entry.sourceRefs ?? [],
        });
      }
    }
  }

  return rows.sort((left, right) => left.ref.localeCompare(right.ref));
}

export function getCombatValidationUnresolvedRefs(
  catalog?: Readonly<Record<string, CombatValidationCatalogSection>>,
): readonly string[] {
  return getCombatValidationUnresolvedRows(catalog).map((row) => row.ref);
}

export function getCombatValidationOutOfScopeRefs(
  catalog?: Readonly<Record<string, CombatValidationCatalogSection>>,
): readonly string[] {
  return getCombatValidationOutOfScopeRows(catalog).map((row) => row.ref);
}
