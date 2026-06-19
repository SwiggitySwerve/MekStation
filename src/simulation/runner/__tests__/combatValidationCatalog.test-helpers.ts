import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import type {
  CombatValidationCatalogSection,
  CombatValidationSupportMap,
} from '../CombatValidationCatalog';
import type {
  ICombatCatalogTriadEvidence,
  ICombatCatalogTriadTestReference,
} from '../CombatValidationCatalogTriad';

import { CANONICAL_SPA_COMBAT_SCOPE_SUPPORT } from '../CombatCanonicalSpaSupport';
import {
  EQUIPMENT_BOMB_BAY_CRITICAL_EFFECT_GAP,
  EQUIPMENT_CRITICAL_EFFECT_EVIDENCE,
  OUT_OF_SCOPE_EQUIPMENT_CRITICAL_EFFECT_SUPPORT_IDS,
  REPRESENTED_EQUIPMENT_CRITICAL_EFFECT_SUPPORT_IDS,
  UNRESOLVED_EQUIPMENT_CRITICAL_EFFECT_SUPPORT_IDS,
} from '../CombatCriticalSlotEffectSupport';
import { EQUIPMENT_CRITICAL_COMPONENT_EVIDENCE } from '../CombatDamageSupport';
import {
  DISPLACEMENT_DOMINO_SECONDARY_FALLOUT_OUT_OF_SCOPE_IDS,
  DISPLACEMENT_DOMINO_SECONDARY_FALLOUT_UNSUPPORTED_IDS,
} from '../CombatPhysicalLegalityGateSupport';
import {
  MINEFIELD_VARIANT_SIDE_PATH_UNSUPPORTED_IDS,
  TERRAIN_LOS_SIDE_PATH_UNSUPPORTED_IDS,
} from '../CombatRuleSupport';
import {
  SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT,
  UNRESOLVED_ARTEMIS_LINK_NETWORK_LIFECYCLE_SUPPORT_IDS,
} from '../CombatSpecialWeaponSupport';
import { BATTLEMECH_COMBAT_VALIDATION_CATALOG } from '../CombatValidationCatalog';
import { COMBAT_CATALOG_TRIAD_EVIDENCE } from '../CombatValidationCatalogTriad';
import {
  filterCombatValidationGapRowsByScope,
  getCombatValidationOutOfScopeRefs,
  getCombatValidationOutOfScopeRows,
  getCombatValidationUnresolvedRefs,
  getCombatValidationUnresolvedRows,
  isCombatValidationAggregateGapRow,
} from '../CombatValidationGapInventory';
import { BATTLEMECH_VALIDATION_SCOPE_SUPPORT } from '../CombatValidationScopeSupport';

function sortedKeys(record: Record<string, unknown>): readonly string[] {
  return Object.keys(record).sort();
}

const VALID_SOURCE_KINDS = new Set([
  'rulebook',
  'megamek-source',
  'mekhq-behavior',
  'mekstation-deviation',
]);

const CLOSED_EJECTION_COVERAGE_REFS = [
  'actions.tacticalCommands.utility.eject',
  'actions.gameIntents.eject',
  'actions.wireIntents.Eject',
  'actions.p2pIntents.eject',
  'invalidation.invalidTargetStates.ejected-target',
  'eventStream.battleMechCombatEvents.unit_ejected',
  'lifecycleAndPsr.actionEligibility.ejected',
  'lifecycleAndPsr.actionEligibility.ejected-targetability',
  'lifecycleAndPsr.actionEligibility.ejection-damage-preservation',
  'parityAndIntegration.representativeScenarios.ejection-damage-preservation',
  'parityAndIntegration.representativeScenarios.ejection-command-intent-outcome',
  'validationScope.objectiveRequirements.ejection-lifecycle',
] as const;

const UNRESOLVED_EQUIPMENT_CRITICAL_COMPONENT_REFS =
  UNRESOLVED_EQUIPMENT_CRITICAL_EFFECT_SUPPORT_IDS.map(
    (supportId) => `damageAndDeath.criticalComponents.${supportId}`,
  );

const UNRESOLVED_EQUIPMENT_CRITICAL_SLOT_EFFECT_REFS =
  UNRESOLVED_EQUIPMENT_CRITICAL_EFFECT_SUPPORT_IDS.map(
    (supportId) => `damageAndDeath.criticalSlotEffects.${supportId}`,
  );

const UNRESOLVED_DISPLACEMENT_DOMINO_SECONDARY_FALLOUT_REFS =
  DISPLACEMENT_DOMINO_SECONDARY_FALLOUT_UNSUPPORTED_IDS.map(
    (supportId) => `ruleSupport.physicalLegalityGates.${supportId}`,
  );

const OUT_OF_SCOPE_DISPLACEMENT_DOMINO_SECONDARY_FALLOUT_REFS =
  DISPLACEMENT_DOMINO_SECONDARY_FALLOUT_OUT_OF_SCOPE_IDS.map(
    (supportId) => `ruleSupport.physicalLegalityGates.${supportId}`,
  );

const UNRESOLVED_ARTEMIS_LINK_NETWORK_LIFECYCLE_REFS =
  UNRESOLVED_ARTEMIS_LINK_NETWORK_LIFECYCLE_SUPPORT_IDS.map(
    (supportId) => `featureSupport.specialWeaponMechanics.${supportId}`,
  ).sort();

const UNRESOLVED_MINEFIELD_VARIANT_SIDE_PATH_REFS =
  MINEFIELD_VARIANT_SIDE_PATH_UNSUPPORTED_IDS.map(
    (supportId) => `ruleSupport.terrainEnvironment.${supportId}`,
  ).sort();

const UNRESOLVED_TERRAIN_LOS_SIDE_PATH_REFS =
  TERRAIN_LOS_SIDE_PATH_UNSUPPORTED_IDS.map(
    (supportId) => `ruleSupport.terrainEnvironment.${supportId}`,
  ).sort();

function catalogMaps(): readonly {
  readonly sectionId: string;
  readonly mapId: string;
  readonly support: CombatValidationSupportMap;
}[] {
  const rows: {
    sectionId: string;
    mapId: string;
    support: CombatValidationSupportMap;
  }[] = [];

  for (const [sectionId, section] of Object.entries(
    BATTLEMECH_COMBAT_VALIDATION_CATALOG,
  ) as readonly [string, CombatValidationCatalogSection][]) {
    for (const [mapId, support] of Object.entries(section)) {
      rows.push({ sectionId, mapId, support });
    }
  }

  return rows;
}

type CatalogMapRow = ReturnType<typeof catalogMaps>[number];
type CombatValidationSupportEntry = CombatValidationSupportMap[string];
type CombatValidationSourceRef = NonNullable<
  CombatValidationSupportEntry['sourceRefs']
>[number];

function supportIds(support: CombatValidationSupportMap): readonly string[] {
  return Object.values(support)
    .map((entry) => entry.id)
    .sort();
}

function triadEvidenceMaps(): Readonly<
  Record<string, Record<string, ICombatCatalogTriadEvidence>>
> {
  return COMBAT_CATALOG_TRIAD_EVIDENCE;
}

function parseLocalSourceAnchor(url: string): {
  readonly file: string;
  readonly startLine: number;
  readonly endLine: number;
} | null {
  const match = /^((?:src|scripts)\/[^#]+)#L(\d+)(?:-L(\d+))?$/.exec(url);
  if (!match) return null;

  const startLine = Number(match[2]);
  return {
    file: match[1],
    startLine,
    endLine: Number(match[3] ?? startLine),
  };
}

function fileLineCount(file: string): number {
  return readFileSync(join(process.cwd(), file), 'utf8').split(/\r?\n/).length;
}

function catalogEntryRef(
  sectionId: string,
  mapId: string,
  entryId: string,
): string {
  return `${sectionId}.${mapId}.${entryId}`;
}

function entryNeedsEvidenceOrGap(entry: CombatValidationSupportEntry): boolean {
  if (entry.evidence.length === 0) return true;

  return (
    entry.level !== 'integrated' &&
    (entry.gap === undefined || entry.gap.length === 0)
  );
}

function findMissingEvidenceOrGapRefs(): string[] {
  const failures: string[] = [];

  for (const { sectionId, mapId, support } of catalogMaps()) {
    for (const entry of Object.values(support)) {
      if (entryNeedsEvidenceOrGap(entry)) {
        failures.push(catalogEntryRef(sectionId, mapId, entry.id));
      }
    }
  }

  return failures;
}

function findMissingSourceRefRefs(): string[] {
  const failures: string[] = [];

  for (const { sectionId, mapId, support } of catalogMaps()) {
    for (const entry of Object.values(support)) {
      if ((entry.sourceRefs ?? []).length === 0) {
        failures.push(catalogEntryRef(sectionId, mapId, entry.id));
      }
    }
  }

  return failures;
}

function triadSectionMapMatches(
  section: CombatValidationCatalogSection,
  triadSection: Record<string, ICombatCatalogTriadEvidence> | undefined,
): boolean {
  return (
    sortedKeys(triadSection ?? {}).join('|') === sortedKeys(section).join('|')
  );
}

function findTriadSectionKeyFailures(
  triadMaps: Readonly<
    Record<string, Record<string, ICombatCatalogTriadEvidence>>
  >,
): string[] {
  const failures: string[] = [];
  const catalogSections: Readonly<
    Record<string, CombatValidationCatalogSection>
  > = BATTLEMECH_COMBAT_VALIDATION_CATALOG;

  for (const [sectionId, section] of Object.entries(catalogSections)) {
    const triadSection = triadMaps[sectionId];
    if (!triadSectionMapMatches(section, triadSection)) {
      failures.push(
        `${sectionId}: expected ${sortedKeys(section).join(', ')}, got ${sortedKeys(triadSection ?? {}).join(', ')}`,
      );
    }
  }

  return failures;
}

function hasIntegratedRows(
  supportEntries: readonly CombatValidationSupportEntry[],
): boolean {
  return supportEntries.some((entry) => entry.level === 'integrated');
}

function triadTestRefFailures(
  refPrefix: string,
  testRefs: readonly ICombatCatalogTriadTestReference[],
): string[] {
  const failures: string[] = [];

  testRefs.forEach((testRef, testIndex) => {
    const testRefId = `${refPrefix}.testRefs[${testIndex}]`;
    if (testRef.file.trim().length === 0) {
      failures.push(`${testRefId}: missing file`);
    } else if (!existsSync(join(process.cwd(), testRef.file))) {
      failures.push(`${testRefId}: file does not exist ${testRef.file}`);
    }
    if (testRef.assertion.trim().length === 0) {
      failures.push(`${testRefId}: missing assertion`);
    }
  });

  return failures;
}

function sourceRefAnchorFailures(
  sourceRef: CombatValidationSourceRef,
  sourceRefId: string,
): string[] {
  if (sourceRef.kind !== 'mekstation-deviation') return [];

  const localAnchor = parseLocalSourceAnchor(sourceRef.url);
  if (!localAnchor) {
    return [
      `${sourceRefId}: MekStation deviation ref must use a local src/ path with line anchors`,
    ];
  }

  if (!existsSync(join(process.cwd(), localAnchor.file))) {
    return [
      `${sourceRefId}: MekStation deviation file does not exist ${localAnchor.file}`,
    ];
  }

  const lineCount = fileLineCount(localAnchor.file);
  const invalidRange =
    localAnchor.startLine < 1 ||
    localAnchor.endLine < localAnchor.startLine ||
    localAnchor.endLine > lineCount;

  return invalidRange
    ? [
        `${sourceRefId}: MekStation deviation line range ${localAnchor.startLine}-${localAnchor.endLine} exceeds ${localAnchor.file} line count ${lineCount}`,
      ]
    : [];
}

function sourceRefMetadataFailures(
  sourceRef: CombatValidationSourceRef,
  sourceRefId: string,
): string[] {
  const failures: string[] = [];

  if (!VALID_SOURCE_KINDS.has(sourceRef.kind)) {
    failures.push(`${sourceRefId}: invalid source kind ${sourceRef.kind}`);
  }
  if (sourceRef.citation.trim().length === 0) {
    failures.push(`${sourceRefId}: missing citation`);
  }
  if (sourceRef.url.trim().length === 0) {
    failures.push(`${sourceRefId}: missing url`);
  }
  if (sourceRef.sourceVersion.trim().length === 0) {
    failures.push(`${sourceRefId}: missing sourceVersion`);
  }

  return failures;
}

function sourceRefAuthorityFailures(
  sourceRef: CombatValidationSourceRef,
  sourceRefId: string,
): string[] {
  const failures: string[] = [];

  if (
    sourceRef.kind === 'megamek-source' &&
    (!sourceRef.url.includes('github.com/MegaMek/megamek/blob/') ||
      !sourceRef.url.includes(sourceRef.sourceVersion) ||
      !sourceRef.url.includes('#L'))
  ) {
    failures.push(
      `${sourceRefId}: MegaMek ref must be commit-pinned and line-anchored`,
    );
  }
  if (
    sourceRef.kind === 'mekhq-behavior' &&
    (!sourceRef.url.includes('github.com/MegaMek/mekhq/blob/') ||
      !sourceRef.url.includes(sourceRef.sourceVersion) ||
      !sourceRef.url.includes('#L'))
  ) {
    failures.push(
      `${sourceRefId}: MekHQ ref must be commit-pinned and line-anchored`,
    );
  }
  if (
    sourceRef.kind === 'mekstation-deviation' &&
    !sourceRef.url.includes('#L')
  ) {
    failures.push(
      `${sourceRefId}: MekStation deviation ref must be line-anchored`,
    );
  }
  if (
    sourceRef.kind === 'rulebook' &&
    !sourceRef.url.includes('battletech.com/')
  ) {
    failures.push(`${sourceRefId}: rulebook ref is not official`);
  }

  return failures;
}

function validateSourceRef(
  sourceRef: CombatValidationSourceRef,
  sourceRefId: string,
): string[] {
  return [
    ...sourceRefMetadataFailures(sourceRef, sourceRefId),
    ...sourceRefAuthorityFailures(sourceRef, sourceRefId),
    ...sourceRefAnchorFailures(sourceRef, sourceRefId),
  ];
}

function entrySourceRefFailures(
  refPrefix: string,
  supportEntries: readonly CombatValidationSupportEntry[],
): string[] {
  const failures: string[] = [];

  for (const entry of supportEntries) {
    const sourceRefs = entry.sourceRefs ?? [];
    if (sourceRefs.length === 0) {
      failures.push(
        `${refPrefix}.${entry.id}: entry-source-refs boundary requires row sourceRefs`,
      );
    }

    sourceRefs.forEach((sourceRef, sourceRefIndex) => {
      const sourceRefId = `${refPrefix}.${entry.id}.sourceRefs[${sourceRefIndex}]`;
      failures.push(...validateSourceRef(sourceRef, sourceRefId));
    });
  }

  return failures;
}

function triadEvidenceFailuresForMap(
  row: CatalogMapRow,
  triadMaps: Readonly<
    Record<string, Record<string, ICombatCatalogTriadEvidence>>
  >,
): string[] {
  const { sectionId, mapId, support } = row;
  const triad = triadMaps[sectionId]?.[mapId];
  const refPrefix = `${sectionId}.${mapId}`;
  if (triad === undefined) return [`${refPrefix}: missing triad`];

  const supportEntries = Object.values(support);
  const failures: string[] = [];

  if (triad.authorityBoundary.rationale.trim().length === 0) {
    failures.push(`${refPrefix}: missing authority boundary rationale`);
  }
  if (hasIntegratedRows(supportEntries) && triad.testRefs.length === 0) {
    failures.push(`${refPrefix}: missing executable test refs`);
  }

  failures.push(...triadTestRefFailures(refPrefix, triad.testRefs));
  if (triad.authorityBoundary.kind === 'entry-source-refs') {
    failures.push(...entrySourceRefFailures(refPrefix, supportEntries));
  }

  return failures;
}

function findTriadEvidenceFailures(
  triadMaps: Readonly<
    Record<string, Record<string, ICombatCatalogTriadEvidence>>
  >,
): string[] {
  return catalogMaps().flatMap((row) =>
    triadEvidenceFailuresForMap(row, triadMaps),
  );
}

function expectUnresolvedInventoryClosedAfterLeafClosure(): void {
  const unresolvedRows = getCombatValidationUnresolvedRows();
  const unresolvedRefs = getCombatValidationUnresolvedRefs();
  expect(unresolvedRefs).toEqual([]);
  expect(unresolvedRefs).toEqual(Array.from(new Set(unresolvedRefs)));
  expect(unresolvedRefs).toEqual(unresolvedRows.map((row) => row.ref));
  expect(
    unresolvedRows.filter(
      (row) =>
        row.gap.length === 0 ||
        row.evidence.length === 0 ||
        row.sourceRefs.length === 0,
    ),
  ).toEqual([]);
  expect({
    total: unresolvedRows.length,
    byLevel: unresolvedRows.reduce<Record<string, number>>((counts, row) => {
      counts[row.level] = (counts[row.level] ?? 0) + 1;
      return counts;
    }, {}),
    bySection: unresolvedRows.reduce<Record<string, number>>((counts, row) => {
      counts[row.sectionId] = (counts[row.sectionId] ?? 0) + 1;
      return counts;
    }, {}),
  }).toEqual({
    total: 0,
    byLevel: {},
    bySection: {},
  });
  expect(unresolvedRefs).toEqual(
    expect.arrayContaining([
      ...UNRESOLVED_TERRAIN_LOS_SIDE_PATH_REFS,
      ...UNRESOLVED_MINEFIELD_VARIANT_SIDE_PATH_REFS,
    ]),
  );
  expect(unresolvedRefs).not.toContain(
    'ruleSupport.terrainEnvironment.terrain-los-side-paths',
  );
  expect(unresolvedRefs).not.toContain(
    'ruleSupport.terrainEnvironment.minefield-variant-side-paths',
  );
  expect(unresolvedRefs).not.toContain(
    'featureSupport.ammunitionCompatibility.unsupported-rotary-ac-10-20-ammo',
  );
  expect(unresolvedRefs).not.toContain(
    'ruleSupport.toHitModifiers.c3-equipment-network-formation',
  );
  expect(unresolvedRefs).not.toContain(
    'ruleSupport.movementEnhancements.masc-side-paths',
  );
  expect(unresolvedRefs).not.toContain(
    'ruleSupport.movementEnhancements.supercharger-side-paths',
  );
  expect(unresolvedRefs).toEqual(
    expect.arrayContaining([
      ...UNRESOLVED_EQUIPMENT_CRITICAL_EFFECT_SUPPORT_IDS.map(
        (id) => `damageAndDeath.criticalComponents.${id}`,
      ),
      ...UNRESOLVED_EQUIPMENT_CRITICAL_EFFECT_SUPPORT_IDS.map(
        (id) => `damageAndDeath.criticalSlotEffects.${id}`,
      ),
    ]),
  );
  expect(unresolvedRefs).not.toContain(
    'damageAndDeath.criticalComponents.equipment',
  );
  expect(unresolvedRefs).not.toContain(
    'damageAndDeath.criticalSlotEffects.equipment',
  );
  expect(unresolvedRefs).not.toContain(
    'validationScope.objectiveRequirements.critical-effects',
  );
  expect(unresolvedRefs).not.toContain(
    'pilotSkills.pilotModifierResolvers.heavy-lifter-throw-object-action-application',
  );
  expect(unresolvedRefs).not.toContain(
    'pilotSkills.pilotModifierResolvers.heavy-lifter-carry-object-action-application',
  );
  expect(unresolvedRefs).not.toContain(
    'pilotSkills.pilotModifierResolvers.heavy-lifter-throw-release-lifecycle-application',
  );
  expect(unresolvedRefs).not.toContain(
    'pilotSkills.pilotModifierResolvers.maneuvering-ace-flanking-turning-producer-application',
  );
  expect(unresolvedRefs).not.toContain(
    'pilotSkills.pilotModifierResolvers.maneuvering-ace-out-of-control-producer-application',
  );
  expect(unresolvedRefs).not.toContain(
    'pilotSkills.pilotModifierResolvers.movement-application',
  );
  expect(unresolvedRefs).not.toContain(
    'pilotSkills.pilotModifierResolvers.heavy-lifter-carry-object-capacity-check-application',
  );
  expect(unresolvedRefs).not.toContain(
    'pilotSkills.pilotModifierResolvers.heavy-lifter-ground-object-weight-gate-application',
  );
  expect(unresolvedRefs).not.toContain(
    'pilotSkills.pilotModifierResolvers.legacy-defensive-quirk-to-hit-application',
  );
  expect(
    unresolvedRows.find(
      (row) => row.ref === 'eventStream.battleMechCombatEvents.turn_started',
    ),
  ).toBeUndefined();
  const unresolvedAmmoCompatibilityRows = unresolvedRows.filter((row) =>
    row.ref.startsWith('featureSupport.ammunitionCompatibility.'),
  );
  expect(unresolvedAmmoCompatibilityRows).toEqual([]);
  expect(unresolvedRefs).not.toContain(
    'featureSupport.pilotAbilities.sandblaster',
  );
  expect(unresolvedRefs).not.toContain(
    'featureSupport.canonicalPilotAbilityScope.sandblaster',
  );
  expect(unresolvedRefs).not.toContain(
    'pilotSkills.pilotModifierResolvers.sandblaster-application',
  );
  expect(unresolvedRefs).not.toContain(
    'featureSupport.specialWeaponFamilies.ams',
  );
  expect(unresolvedRefs).not.toContain(
    'featureSupport.specialWeaponMechanics.ams-manual-defender-choice',
  );
  expect(unresolvedRefs).not.toContain(
    'featureSupport.specialWeaponMechanics.ams-authored-multi-use-lifecycle',
  );
  expect(unresolvedRefs).not.toContain(
    'featureSupport.specialWeaponMechanics.inarc-ecm-sensor-effects',
  );
  expect(unresolvedRefs).not.toContain(
    'featureSupport.specialWeaponMechanics.inarc-producer-c3-authoring',
  );
  expect(unresolvedRefs).not.toContain(
    'pilotSkills.pilotModifierResolvers.edge-head-hit-reroll-application',
  );
  expect(unresolvedRefs).not.toContain(
    'pilotSkills.pilotModifierResolvers.edge-tac-reroll-application',
  );
  expect(unresolvedRefs).not.toContain(
    'pilotSkills.pilotModifierResolvers.edge-ko-consciousness-reroll-application',
  );
  expect(unresolvedRefs).not.toContain(
    'pilotSkills.pilotModifierResolvers.edge-masc-supercharger-reroll-application',
  );
  expect(unresolvedRefs).not.toContain(
    'pilotSkills.pilotModifierResolvers.critical-prevention-edge-explosion-application',
  );
  expect(unresolvedRefs).not.toContain('featureSupport.pilotAbilities.edge');
  expect(unresolvedRefs).not.toContain(
    'pilotSkills.pilotModifierResolvers.edge-application',
  );
  expect(unresolvedRefs).not.toContain(
    'ruleSupport.toHitModifiers.c3-equipment-conservative-network-seeding',
  );
  expect(unresolvedRefs).not.toContain(
    'ruleSupport.toHitModifiers.c3-equipment-unambiguous-network-formation',
  );
  expect(unresolvedRefs).not.toContain(
    'ruleSupport.toHitModifiers.c3-equipment-independent-side-formation',
  );
  expect(unresolvedRefs).not.toContain(
    'ruleSupport.toHitModifiers.c3-equipment-denial-boundaries',
  );
  expect(
    unresolvedRows.find(
      (row) =>
        row.ref ===
        'featureSupport.specialWeaponMechanics.ams-optional-multi-use-authoring',
    ),
  ).toBeUndefined();
  expect(
    getCombatValidationOutOfScopeRows().find(
      (row) =>
        row.ref ===
        'featureSupport.specialWeaponMechanics.ams-optional-multi-use-authoring',
    ),
  ).toMatchObject({
    level: 'out-of-scope',
    evidence: expect.stringContaining(
      'does not expose a multi-use AMS variant',
    ),
    gap: expect.stringContaining(
      'outside the current BattleMech blocker matrix',
    ),
  });
  expect(
    SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['ams-authored-multi-use-lifecycle'],
  ).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining('already-authored'),
  });
  expect(
    SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['ams-authored-multi-use-lifecycle']
      .gap,
  ).toBeUndefined();
  expect(unresolvedRefs).not.toContain(
    'pilotSkills.pilotModifierResolvers.sandblaster-tacops-rapid-fire-application',
  );
  expect(unresolvedRefs).not.toContain(
    'pilotSkills.pilotModifierResolvers.sandblaster-tacops-rapid-fire-application',
  );
  expect(
    unresolvedRows.find(
      (row) =>
        row.ref === 'ruleSupport.terrainEnvironment.terrain-los-side-paths',
    ),
  ).toBeUndefined();
  const terrainLosResiduals = unresolvedRows.filter((row) =>
    UNRESOLVED_TERRAIN_LOS_SIDE_PATH_REFS.includes(row.ref),
  );
  expect(terrainLosResiduals.map((row) => row.ref).sort()).toEqual(
    UNRESOLVED_TERRAIN_LOS_SIDE_PATH_REFS,
  );
  expect(terrainLosResiduals.map((row) => row.level)).toEqual(
    UNRESOLVED_TERRAIN_LOS_SIDE_PATH_REFS.map(() => 'unsupported'),
  );
  const terrainLosResidualGapText = terrainLosResiduals
    .map((row) => row.gap)
    .join('\n');
  expect(terrainLosResidualGapText).not.toContain(
    'industrial-zone side-path terrain density/elevation',
  );
  expect(terrainLosResidualGapText).not.toContain(
    'planted-field side-path terrain density/elevation',
  );
  expect(unresolvedRefs).not.toContain(
    'ruleSupport.terrainEnvironment.terrain-los-tacops-diagram-industrial-zone-side-paths',
  );
  expect(unresolvedRefs).not.toContain(
    'ruleSupport.terrainEnvironment.terrain-los-tacops-diagram-planted-field-side-paths',
  );
  expect(unresolvedRefs).not.toContain(
    'ruleSupport.terrainEnvironment.terrain-los-tacops-diagram-combat-caller-option-propagation',
  );
  expect(terrainLosResidualGapText).not.toContain(
    'grounded DropShip level-10 cover',
  );
  const minefieldVariantResiduals = unresolvedRows.filter((row) =>
    UNRESOLVED_MINEFIELD_VARIANT_SIDE_PATH_REFS.includes(row.ref),
  );
  expect(minefieldVariantResiduals.map((row) => row.ref).sort()).toEqual(
    UNRESOLVED_MINEFIELD_VARIANT_SIDE_PATH_REFS,
  );
  expect(minefieldVariantResiduals.map((row) => row.level)).toEqual(
    UNRESOLVED_MINEFIELD_VARIANT_SIDE_PATH_REFS.map(() => 'unsupported'),
  );
  const minefieldVariantResidualGapText = minefieldVariantResiduals
    .map((row) => row.gap)
    .join('\n');
  expect(minefieldVariantResidualGapText).not.toContain(
    'hidden minefield state, reveal timing, and minefield detection lifecycle',
  );
  expect(minefieldVariantResidualGapText).not.toContain(
    'event-sourced add/set/reset/remove/clear lifecycle',
  );
  expect(minefieldVariantResidualGapText).not.toContain(
    'campaign/scenario minefield placement and authoring',
  );
  expect(minefieldVariantResidualGapText).not.toContain(
    'minefield type semantics',
  );
  expect(minefieldVariantResidualGapText).not.toContain('collateral reset');
  expect(minefieldVariantResidualGapText).not.toContain(
    'mine-sweeper interaction',
  );
  expect(minefieldVariantResidualGapText).not.toContain(
    'density reduction and collateral reset',
  );
  expect(minefieldVariantResidualGapText).not.toContain(
    'density trigger targets',
  );
  expect(minefieldVariantResidualGapText).not.toContain(
    'coordinate minefield persistence',
  );
  expect(minefieldVariantResidualGapText).not.toContain(
    'Game-level minefield state',
  );
  expect(minefieldVariantResidualGapText).not.toContain(
    'non-BattleMech and sea-mine variants',
  );
  expect(unresolvedRefs).not.toContain(
    'ruleSupport.terrainEnvironment.minefield-variant-side-paths',
  );
  expect(unresolvedRefs).not.toContain(
    'ruleSupport.terrainEnvironment.minefield-emp-effects',
  );
  expect(unresolvedRefs).not.toContain(
    'ruleSupport.terrainEnvironment.minefield-active-non-ground-triggers',
  );
  expect(unresolvedRefs).not.toContain(
    'ruleSupport.terrainEnvironment.minefield-inferno-residual-controls',
  );
  expect(unresolvedRefs).not.toContain(
    'ruleSupport.terrainEnvironment.minefield-non-conventional-type-semantics',
  );
  expect(unresolvedRefs).not.toContain(
    'ruleSupport.terrainEnvironment.minefield-non-battlemech-sea-variants',
  );
  expect(unresolvedRefs).not.toContain(
    'actions.absentActionSurfaces.movement.sprint',
  );
  expect(unresolvedRefs).not.toContain('ruleSupport.terrainTypeLos.water');
  expect(unresolvedRefs).not.toContain('ruleSupport.terrainEnvironment.dust');
  expect(unresolvedRefs).not.toContain('ruleSupport.terrainEnvironment.mines');
  expect(unresolvedRefs).not.toContain(
    'ruleSupport.terrainEnvironment.minefield-represented-entry-side-paths',
  );
  expect(unresolvedRefs).not.toContain(
    'ruleSupport.terrainEnvironment.minefield-represented-coordinate-state-lifecycle',
  );
  expect(unresolvedRefs).not.toContain(
    'ruleSupport.terrainEnvironment.minefield-represented-encoded-damage-levels',
  );
  expect(unresolvedRefs).not.toContain(
    'ruleSupport.terrainEnvironment.minefield-represented-coordinate-state-entry-damage',
  );
  expect(unresolvedRefs).not.toContain(
    'ruleSupport.terrainEnvironment.minefield-represented-conventional-detonated-state',
  );
  expect(unresolvedRefs).not.toContain(
    'ruleSupport.terrainEnvironment.minefield-represented-manual-conventional-detonation',
  );
  expect(unresolvedRefs).not.toContain(
    'ruleSupport.terrainEnvironment.minefield-represented-movement-detonation-event',
  );
  expect(unresolvedRefs).not.toContain(
    'ruleSupport.terrainEnvironment.minefield-represented-density-trigger-target',
  );
  expect(unresolvedRefs).not.toContain(
    'ruleSupport.terrainEnvironment.minefield-represented-density-reduction',
  );
  expect(unresolvedRefs).not.toContain(
    'ruleSupport.terrainEnvironment.minefield-represented-inferno-entry-heat',
  );
  expect(unresolvedRefs).not.toContain('ruleSupport.movementEnhancements.MASC');
  expect(unresolvedRefs).not.toContain(
    'ruleSupport.movementEnhancements.masc-battlemech-represented-side-paths',
  );
  expect(unresolvedRefs).not.toContain(
    'ruleSupport.movementEnhancements.Supercharger',
  );
  expect(unresolvedRefs).not.toContain(
    'ruleSupport.movementEnhancements.supercharger-battlemech-represented-side-paths',
  );
  expect(unresolvedRefs).not.toContain(
    'ruleSupport.movementRules.go-prone-battlemech-swarmer-dislodgement',
  );
  expect(unresolvedRefs).not.toContain(
    'ruleSupport.movementRules.go-prone-hull-down-zero-mp-transition',
  );
  expect(unresolvedRefs).not.toContain(
    'ruleSupport.movementRules.go-prone-enemy-occupied-start-follow-up-block',
  );
  expect(
    unresolvedRows.find(
      (row) => row.ref === 'ruleSupport.movementRules.go-prone-side-paths',
    ),
  ).toBeUndefined();
  expect(
    unresolvedRows.find(
      (row) => row.ref === 'ruleSupport.movementEnhancements.masc-side-paths',
    ),
  ).toBeUndefined();
  expect(
    unresolvedRows.find(
      (row) =>
        row.ref === 'ruleSupport.movementEnhancements.supercharger-side-paths',
    ),
  ).toBeUndefined();
  expect(unresolvedRefs).not.toContain(
    'ruleSupport.physicalDamageModifiers.claws',
  );
  expect(unresolvedRefs).not.toContain(
    'ruleSupport.physicalDamageModifiers.claw-represented-equipment-cleanup',
  );
  expect(unresolvedRefs).not.toContain(
    'ruleSupport.physicalDamageModifiers.claw-physical-critical-production',
  );
  expect(unresolvedRefs).not.toContain(
    'ruleSupport.physicalDamageModifiers.talons',
  );
  expect(unresolvedRefs).not.toContain(
    'ruleSupport.physicalDamageModifiers.talon-represented-equipment-cleanup',
  );
  expect(unresolvedRefs).not.toContain(
    'ruleSupport.physicalDamageModifiers.talon-physical-critical-production',
  );
  expect(
    BATTLEMECH_COMBAT_VALIDATION_CATALOG.ruleSupport.physicalDamageModifiers[
      'claw-represented-equipment-cleanup'
    ],
  ).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining('CriticalHitResolved marks Claws'),
  });
  expect(
    BATTLEMECH_COMBAT_VALIDATION_CATALOG.ruleSupport.physicalDamageModifiers[
      'claw-physical-critical-production'
    ],
  ).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining(
      'physical-phase CriticalHit/CriticalHitResolved',
    ),
  });
  expect(
    BATTLEMECH_COMBAT_VALIDATION_CATALOG.ruleSupport.physicalDamageModifiers[
      'talon-represented-equipment-cleanup'
    ],
  ).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining('CriticalHitResolved marks Talons'),
  });
  expect(
    BATTLEMECH_COMBAT_VALIDATION_CATALOG.ruleSupport.physicalDamageModifiers[
      'talon-physical-critical-production'
    ],
  ).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining(
      'physical-phase CriticalHit/CriticalHitResolved',
    ),
  });
  expect(unresolvedRefs).not.toContain(
    'ruleSupport.physicalLegalityGates.shared.displacement-domino-positional-chain',
  );
  expect(
    BATTLEMECH_COMBAT_VALIDATION_CATALOG.ruleSupport.physicalLegalityGates[
      'shared.displacement-domino-positional-chain'
    ],
  ).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining(
      'represented push/charge/DFA/charge-miss target-displacement helpers',
    ),
  });
  expect(unresolvedRefs).not.toContain(
    'ruleSupport.physicalLegalityGates.shared.displacement-domino-minefield-fallout',
  );
  expect(unresolvedRefs).not.toContain(
    'ruleSupport.physicalLegalityGates.shared.displacement-domino-chain',
  );
  expect(
    BATTLEMECH_COMBAT_VALIDATION_CATALOG.ruleSupport.physicalLegalityGates[
      'shared.displacement-domino-minefield-fallout'
    ],
  ).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining(
      'GamePhase.PhysicalAttack when a push/charge/DFA/charge-miss domino displacement lands in an existing represented mine destination',
    ),
  });
  expect(
    BATTLEMECH_COMBAT_VALIDATION_CATALOG.ruleSupport.physicalLegalityGates[
      'shared.displacement-domino-minefield-fallout'
    ].evidence,
  ).toContain('already-detonated coordinate suppression');
  expect(
    BATTLEMECH_COMBAT_VALIDATION_CATALOG.ruleSupport.physicalLegalityGates[
      'shared.displacement-domino-minefield-fallout'
    ].evidence,
  ).toContain('non-conventional coordinate-state no-fallback guards');
  expect(unresolvedRefs).not.toContain(
    'ruleSupport.physicalLegalityGates.shared.carried-cargo-arm-lockout',
  );
  expect(
    BATTLEMECH_COMBAT_VALIDATION_CATALOG.ruleSupport.physicalLegalityGates[
      'shared.carried-cargo-arm-lockout'
    ],
  ).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining(
      'selected-arm punch, selected-arm brush-off, arm-mounted melee weapon',
    ),
  });
  expect(unresolvedRefs).not.toContain(
    'ruleSupport.physicalLegalityGates.shared.displacement-domino-secondary-fallout',
  );
  expect(
    BATTLEMECH_COMBAT_VALIDATION_CATALOG.ruleSupport.physicalLegalityGates[
      'shared.displacement-domino-secondary-fallout'
    ],
  ).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining(
      'Broad domino secondary-fallout accounting is split',
    ),
  });
  for (const ref of UNRESOLVED_DISPLACEMENT_DOMINO_SECONDARY_FALLOUT_REFS) {
    expect(unresolvedRows.find((row) => row.ref === ref)).toMatchObject({
      level: 'unsupported',
      evidence: expect.stringContaining('forced pure helper chain'),
      gap: expect.stringContaining(
        'requires a new player-feedback/MovePath decision surface',
      ),
      sourceRefs: [
        expect.objectContaining({
          citation: expect.stringContaining('CFR_DOMINO_EFFECT'),
          url: expect.stringContaining('L9190-L9280'),
        }),
      ],
    });
  }
  for (const ref of OUT_OF_SCOPE_DISPLACEMENT_DOMINO_SECONDARY_FALLOUT_REFS) {
    expect(getCombatValidationOutOfScopeRefs()).toContain(ref);
    expect(unresolvedRefs).not.toContain(ref);
  }
  expect(unresolvedRefs).not.toContain('featureSupport.physicalWeapons.claws');
  expect(unresolvedRefs).not.toContain('featureSupport.physicalWeapons.talons');
  expect(unresolvedRefs).not.toContain(
    'validationScope.objectiveRequirements.official-physical-weapons',
  );
  expect(
    BATTLEMECH_COMBAT_VALIDATION_CATALOG.featureSupport.physicalWeapons.claws,
  ).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining(
      'not as a standalone runtime PhysicalAttackType',
    ),
  });
  expect(
    BATTLEMECH_COMBAT_VALIDATION_CATALOG.featureSupport.physicalWeapons.talons,
  ).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining(
      'not as a standalone runtime PhysicalAttackType',
    ),
  });
  expect(
    BATTLEMECH_COMBAT_VALIDATION_CATALOG.damageAndDeath.criticalComponents
      .equipment,
  ).toMatchObject({
    level: 'integrated',
    evidence: EQUIPMENT_CRITICAL_COMPONENT_EVIDENCE,
  });
  expect(
    BATTLEMECH_COMBAT_VALIDATION_CATALOG.damageAndDeath.criticalComponents
      .equipment.evidence,
  ).toContain('split-accounted');
  const representedEquipmentCriticalComponentRefs =
    REPRESENTED_EQUIPMENT_CRITICAL_EFFECT_SUPPORT_IDS.map(
      (id) => `damageAndDeath.criticalComponents.${id}`,
    );
  const representedEquipmentCriticalSlotEffectRefs =
    REPRESENTED_EQUIPMENT_CRITICAL_EFFECT_SUPPORT_IDS.map(
      (id) => `damageAndDeath.criticalSlotEffects.${id}`,
    );
  const unresolvedEquipmentCriticalComponentRefs =
    UNRESOLVED_EQUIPMENT_CRITICAL_EFFECT_SUPPORT_IDS.map(
      (id) => `damageAndDeath.criticalComponents.${id}`,
    );
  const unresolvedEquipmentCriticalSlotEffectRefs =
    UNRESOLVED_EQUIPMENT_CRITICAL_EFFECT_SUPPORT_IDS.map(
      (id) => `damageAndDeath.criticalSlotEffects.${id}`,
    );
  const outOfScopeEquipmentCriticalComponentRefs =
    OUT_OF_SCOPE_EQUIPMENT_CRITICAL_EFFECT_SUPPORT_IDS.map(
      (id) => `damageAndDeath.criticalComponents.${id}`,
    );
  const outOfScopeEquipmentCriticalSlotEffectRefs =
    OUT_OF_SCOPE_EQUIPMENT_CRITICAL_EFFECT_SUPPORT_IDS.map(
      (id) => `damageAndDeath.criticalSlotEffects.${id}`,
    );
  const broadEquipmentCriticalEffectRefs = [
    'damageAndDeath.criticalComponents.equipment',
    'damageAndDeath.criticalSlotEffects.equipment',
  ];
  const unresolvedEquipmentCriticalEffectRows = unresolvedRows.filter(
    (row) =>
      row.ref.startsWith('damageAndDeath.criticalComponents.equipment') ||
      row.ref.startsWith('damageAndDeath.criticalSlotEffects.equipment'),
  );
  expect(
    Object.keys(
      BATTLEMECH_COMBAT_VALIDATION_CATALOG.damageAndDeath.criticalComponents,
    )
      .filter((id) => id.startsWith('equipment-'))
      .sort(),
  ).toEqual(
    [
      ...OUT_OF_SCOPE_EQUIPMENT_CRITICAL_EFFECT_SUPPORT_IDS,
      ...REPRESENTED_EQUIPMENT_CRITICAL_EFFECT_SUPPORT_IDS,
      ...UNRESOLVED_EQUIPMENT_CRITICAL_EFFECT_SUPPORT_IDS,
    ].sort(),
  );
  expect(
    Object.keys(
      BATTLEMECH_COMBAT_VALIDATION_CATALOG.damageAndDeath.criticalSlotEffects,
    )
      .filter((id) => id.startsWith('equipment-'))
      .sort(),
  ).toEqual(
    [
      ...OUT_OF_SCOPE_EQUIPMENT_CRITICAL_EFFECT_SUPPORT_IDS,
      ...REPRESENTED_EQUIPMENT_CRITICAL_EFFECT_SUPPORT_IDS,
      ...UNRESOLVED_EQUIPMENT_CRITICAL_EFFECT_SUPPORT_IDS,
    ].sort(),
  );
  expect(
    unresolvedEquipmentCriticalEffectRows.map((row) => row.ref).sort(),
  ).toEqual(
    [
      ...unresolvedEquipmentCriticalComponentRefs,
      ...unresolvedEquipmentCriticalSlotEffectRefs,
    ].sort(),
  );
  expect(unresolvedRefs).toEqual(
    expect.not.arrayContaining(broadEquipmentCriticalEffectRefs),
  );
  for (const ref of [
    ...unresolvedEquipmentCriticalComponentRefs,
    ...unresolvedEquipmentCriticalSlotEffectRefs,
  ]) {
    expect(
      unresolvedEquipmentCriticalEffectRows.find((row) => row.ref === ref),
    ).toMatchObject({
      level: 'unsupported',
      gap: expect.any(String),
      sourceRefs: expect.arrayContaining([
        expect.objectContaining({
          citation: expect.stringContaining('applyEquipmentCritical'),
        }),
      ]),
    });
  }
  expect(unresolvedRefs).toEqual(
    expect.not.arrayContaining([
      ...representedEquipmentCriticalComponentRefs,
      ...representedEquipmentCriticalSlotEffectRefs,
      ...outOfScopeEquipmentCriticalComponentRefs,
      ...outOfScopeEquipmentCriticalSlotEffectRefs,
    ]),
  );
  expect(unresolvedRefs).not.toContain(
    'damageAndDeath.criticalComponents.equipment-prototype-improved-jump-jet-explosion',
  );
  expect(unresolvedRefs).not.toContain(
    'damageAndDeath.criticalComponents.equipment-extended-fuel-tank-explosion',
  );
  expect(unresolvedRefs).not.toContain(
    'damageAndDeath.criticalSlotEffects.equipment-prototype-improved-jump-jet-explosion',
  );
  expect(unresolvedRefs).not.toContain(
    'damageAndDeath.criticalSlotEffects.equipment-extended-fuel-tank-explosion',
  );
  expect(unresolvedRefs).not.toContain(
    'damageAndDeath.criticalComponents.equipment-generic-destroyed-name-replay',
  );
  expect(unresolvedRefs).not.toContain(
    'damageAndDeath.criticalComponents.equipment-physical-modifiers',
  );
  expect(unresolvedRefs).not.toContain(
    'damageAndDeath.criticalComponents.equipment-partial-wing',
  );
  expect(unresolvedRefs).not.toContain(
    'damageAndDeath.criticalComponents.equipment-active-probe',
  );
  expect(unresolvedRefs).not.toContain(
    'damageAndDeath.criticalComponents.equipment-stealth-linked-ecm',
  );
  expect(
    BATTLEMECH_COMBAT_VALIDATION_CATALOG.damageAndDeath.criticalComponents[
      'equipment-active-probe'
    ],
  ).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining('active probes non-operational'),
    sourceRefs: expect.arrayContaining([
      expect.objectContaining({
        citation: expect.stringContaining('active-probe equipment'),
      }),
    ]),
  });
  expect(unresolvedRefs).not.toContain(
    'damageAndDeath.criticalComponents.equipment-ac-playtest',
  );
  expect(unresolvedRefs).not.toContain(
    'damageAndDeath.criticalComponents.equipment-harjel',
  );
  expect(unresolvedRefs).not.toContain(
    'damageAndDeath.criticalComponents.equipment-bomb-bays',
  );
  expect(getCombatValidationOutOfScopeRefs()).toEqual(
    expect.arrayContaining([
      ...outOfScopeEquipmentCriticalComponentRefs,
      ...outOfScopeEquipmentCriticalSlotEffectRefs,
    ]),
  );
  expect(
    getCombatValidationOutOfScopeRows().find(
      (row) =>
        row.ref === 'damageAndDeath.criticalComponents.equipment-bomb-bays',
    ),
  ).toMatchObject({
    level: 'out-of-scope',
    gap: EQUIPMENT_BOMB_BAY_CRITICAL_EFFECT_GAP,
  });
  expect(
    getCombatValidationOutOfScopeRows().find(
      (row) =>
        row.ref === 'damageAndDeath.criticalSlotEffects.equipment-bomb-bays',
    ),
  ).toMatchObject({
    level: 'out-of-scope',
    gap: EQUIPMENT_BOMB_BAY_CRITICAL_EFFECT_GAP,
  });
  expect(
    getCombatValidationOutOfScopeRows().find(
      (row) =>
        row.ref ===
        'damageAndDeath.criticalComponents.equipment-fuel-incendiary-branches',
    ),
  ).toMatchObject({
    level: 'out-of-scope',
    evidence: expect.stringContaining('LAM Fuel Tank'),
  });
  expect(
    getCombatValidationOutOfScopeRows().find(
      (row) =>
        row.ref ===
        'damageAndDeath.criticalSlotEffects.equipment-fuel-incendiary-branches',
    ),
  ).toMatchObject({
    level: 'out-of-scope',
    evidence: expect.stringContaining('incendiary/inferno'),
  });
  expect(
    BATTLEMECH_COMBAT_VALIDATION_CATALOG.damageAndDeath.criticalComponents[
      'equipment-ammo-exhaustion-no-explosion'
    ],
  ).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining('empty tracked bins'),
  });
  expect(
    BATTLEMECH_COMBAT_VALIDATION_CATALOG.damageAndDeath.criticalComponents[
      'equipment-generic-destroyed-name-replay'
    ],
  ).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining('destroyedEquipment'),
  });
  expect(
    BATTLEMECH_COMBAT_VALIDATION_CATALOG.damageAndDeath.criticalComponents[
      'equipment-physical-modifiers'
    ],
  ).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining('Claw/Talons'),
  });
  expect(
    BATTLEMECH_COMBAT_VALIDATION_CATALOG.damageAndDeath.criticalComponents[
      'equipment-partial-wing'
    ],
  ).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining('partialWingJumpBonus'),
  });
  expect(
    BATTLEMECH_COMBAT_VALIDATION_CATALOG.damageAndDeath.criticalComponents[
      'equipment-emergency-coolant'
    ],
  ).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining('damaged-coolant-system state'),
  });
  expect(
    BATTLEMECH_COMBAT_VALIDATION_CATALOG.damageAndDeath.criticalComponents[
      'equipment-ac-playtest'
    ],
  ).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining('first-hit state'),
  });
  expect(
    BATTLEMECH_COMBAT_VALIDATION_CATALOG.damageAndDeath.criticalComponents[
      'equipment-harjel'
    ],
  ).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining('breached location'),
  });
  expect(
    BATTLEMECH_COMBAT_VALIDATION_CATALOG.damageAndDeath.criticalComponents[
      'equipment-explosive-equipment'
    ],
  ).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining('explicit positive explosionDamage'),
    sourceRefs: expect.arrayContaining([
      expect.objectContaining({
        citation: expect.stringContaining('explosionDamage payloads'),
      }),
    ]),
  });
  expect(
    BATTLEMECH_COMBAT_VALIDATION_CATALOG.damageAndDeath.criticalComponents[
      'equipment-charged-capacitors'
    ],
  ).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining('PPC Capacitor'),
  });
  expect(
    BATTLEMECH_COMBAT_VALIDATION_CATALOG.damageAndDeath.criticalComponents[
      'equipment-blue-shield-explosion'
    ],
  ).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining('Blue Shield'),
    sourceRefs: expect.arrayContaining([
      expect.objectContaining({
        citation: expect.stringContaining('F_BLUE_SHIELD'),
      }),
      expect.objectContaining({
        citation: expect.stringContaining('mode is Off'),
      }),
    ]),
  });
  expect(
    BATTLEMECH_COMBAT_VALIDATION_CATALOG.damageAndDeath.criticalComponents[
      'equipment-prototype-improved-jump-jet-explosion'
    ],
  ).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining('Prototype Improved Jump Jet'),
    sourceRefs: expect.arrayContaining([
      expect.objectContaining({
        citation: expect.stringContaining('Mounted.getExplosionDamage'),
      }),
    ]),
  });
  expect(
    BATTLEMECH_COMBAT_VALIDATION_CATALOG.damageAndDeath.criticalComponents[
      'equipment-extended-fuel-tank-explosion'
    ],
  ).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining('Extended Fuel Tank'),
    sourceRefs: expect.arrayContaining([
      expect.objectContaining({
        citation: expect.stringContaining('getExplosionDamage returns 20'),
      }),
    ]),
  });
  expect(
    BATTLEMECH_COMBAT_VALIDATION_CATALOG.damageAndDeath.criticalComponents[
      'equipment-artemis-fcs-critical-lifecycle'
    ],
  ).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining('guidance flags'),
    sourceRefs: expect.arrayContaining([
      expect.objectContaining({
        citation: expect.stringContaining('destroyedArtemisFcs'),
      }),
    ]),
  });
  expect(
    BATTLEMECH_COMBAT_VALIDATION_CATALOG.damageAndDeath.criticalComponents[
      'equipment-stealth-linked-ecm'
    ],
  ).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining('electronic-warfare ECM suites'),
  });
  expect(
    BATTLEMECH_COMBAT_VALIDATION_CATALOG.damageAndDeath.criticalComponents[
      'equipment-risc-laser-pulse-module-inoperable-linked-module'
    ],
  ).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining(
      'already points at a destroyed linked laser',
    ),
    sourceRefs: expect.arrayContaining([
      expect.objectContaining({
        citation: expect.stringContaining('isExplosive returns false'),
      }),
    ]),
  });
  expect(
    BATTLEMECH_COMBAT_VALIDATION_CATALOG.damageAndDeath.criticalSlotEffects
      .equipment,
  ).toMatchObject({
    level: 'integrated',
    evidence: EQUIPMENT_CRITICAL_EFFECT_EVIDENCE,
  });
  expect(
    BATTLEMECH_COMBAT_VALIDATION_CATALOG.damageAndDeath.criticalSlotEffects
      .equipment.evidence,
  ).toContain('explicit out-of-scope rows');
  expect(unresolvedRefs).not.toContain(
    'damageAndDeath.criticalSlotEffects.equipment-ammo-exhaustion-no-explosion',
  );
  expect(unresolvedRefs).not.toContain(
    'damageAndDeath.criticalSlotEffects.equipment-generic-destroyed-name-replay',
  );
  expect(unresolvedRefs).not.toContain(
    'damageAndDeath.criticalSlotEffects.equipment-physical-modifiers',
  );
  expect(unresolvedRefs).not.toContain(
    'damageAndDeath.criticalSlotEffects.equipment-partial-wing',
  );
  expect(unresolvedRefs).not.toContain(
    'damageAndDeath.criticalSlotEffects.equipment-active-probe',
  );
  expect(unresolvedRefs).not.toContain(
    'damageAndDeath.criticalSlotEffects.equipment-emergency-coolant',
  );
  expect(unresolvedRefs).not.toContain(
    'damageAndDeath.criticalSlotEffects.equipment-stealth-linked-ecm',
  );
  expect(unresolvedRefs).not.toContain(
    'damageAndDeath.criticalSlotEffects.equipment-ac-playtest',
  );
  expect(unresolvedRefs).not.toContain(
    'damageAndDeath.criticalSlotEffects.equipment-harjel',
  );
  expect(unresolvedRefs).not.toContain(
    'damageAndDeath.criticalSlotEffects.equipment-risc-laser-pulse-module-inoperable-linked-module',
  );
  expect(unresolvedRefs).not.toContain(
    'damageAndDeath.criticalSlotEffects.equipment-bomb-bays',
  );
  expect(
    BATTLEMECH_COMBAT_VALIDATION_CATALOG.damageAndDeath.criticalSlotEffects[
      'equipment-ammo-exhaustion-no-explosion'
    ],
  ).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining('no AmmoExplosion'),
  });
  expect(
    BATTLEMECH_COMBAT_VALIDATION_CATALOG.damageAndDeath.criticalSlotEffects[
      'equipment-active-probe'
    ],
  ).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining('active probes non-operational'),
    sourceRefs: expect.arrayContaining([
      expect.objectContaining({
        citation: expect.stringContaining('active-probe equipment'),
      }),
    ]),
  });
  expect(
    BATTLEMECH_COMBAT_VALIDATION_CATALOG.damageAndDeath.criticalSlotEffects[
      'equipment-generic-destroyed-name-replay'
    ],
  ).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining('destroyedEquipment'),
  });
  expect(
    BATTLEMECH_COMBAT_VALIDATION_CATALOG.damageAndDeath.criticalSlotEffects[
      'equipment-risc-laser-pulse-module-inoperable-linked-module'
    ],
  ).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining(
      'already points at a destroyed linked laser',
    ),
    sourceRefs: expect.arrayContaining([
      expect.objectContaining({
        citation: expect.stringContaining('isExplosive returns false'),
      }),
    ]),
  });
  expect(
    BATTLEMECH_COMBAT_VALIDATION_CATALOG.damageAndDeath.criticalSlotEffects[
      'equipment-physical-modifiers'
    ],
  ).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining('Claw/Talons'),
  });
  expect(
    BATTLEMECH_COMBAT_VALIDATION_CATALOG.damageAndDeath.criticalSlotEffects[
      'equipment-partial-wing'
    ],
  ).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining('partialWingJumpBonus'),
  });
  expect(
    BATTLEMECH_COMBAT_VALIDATION_CATALOG.damageAndDeath.criticalSlotEffects[
      'equipment-emergency-coolant'
    ],
  ).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining('damaged-coolant-system state'),
  });
  expect(
    BATTLEMECH_COMBAT_VALIDATION_CATALOG.damageAndDeath.criticalSlotEffects[
      'equipment-ac-playtest'
    ],
  ).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining('first-hit autocannon state'),
  });
  expect(
    BATTLEMECH_COMBAT_VALIDATION_CATALOG.damageAndDeath.criticalSlotEffects[
      'equipment-harjel'
    ],
  ).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining('HarJel II/III'),
  });
  expect(
    BATTLEMECH_COMBAT_VALIDATION_CATALOG.damageAndDeath.criticalSlotEffects[
      'equipment-explosive-equipment'
    ],
  ).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining('equipment AmmoExplosion payloads'),
    sourceRefs: expect.arrayContaining([
      expect.objectContaining({
        citation: expect.stringContaining('without ammo-bin fallback fields'),
      }),
    ]),
  });
  expect(
    BATTLEMECH_COMBAT_VALIDATION_CATALOG.damageAndDeath.criticalSlotEffects[
      'equipment-charged-capacitors'
    ],
  ).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining('AmmoExplosion'),
  });
  expect(
    BATTLEMECH_COMBAT_VALIDATION_CATALOG.damageAndDeath.criticalSlotEffects[
      'equipment-blue-shield-explosion'
    ],
  ).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining(
      '5-point secondary-effect-gated explosion metadata',
    ),
    sourceRefs: expect.arrayContaining([
      expect.objectContaining({
        citation: expect.stringContaining('Blue Shield'),
      }),
    ]),
  });
  expect(
    BATTLEMECH_COMBAT_VALIDATION_CATALOG.damageAndDeath.criticalSlotEffects[
      'equipment-prototype-improved-jump-jet-explosion'
    ],
  ).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining('10-point equipment explosion'),
    sourceRefs: expect.arrayContaining([
      expect.objectContaining({
        citation: expect.stringContaining('Prototype Improved Jump Jet'),
      }),
    ]),
  });
  expect(
    BATTLEMECH_COMBAT_VALIDATION_CATALOG.damageAndDeath.criticalSlotEffects[
      'equipment-extended-fuel-tank-explosion'
    ],
  ).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining('20-point secondary-effect-gated'),
    sourceRefs: expect.arrayContaining([
      expect.objectContaining({
        citation: expect.stringContaining('Extended Fuel Tank'),
      }),
    ]),
  });
  expect(
    BATTLEMECH_COMBAT_VALIDATION_CATALOG.damageAndDeath.criticalSlotEffects[
      'equipment-artemis-fcs-critical-lifecycle'
    ],
  ).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining(
      'Artemis IV/prototype Artemis IV/Artemis V FCS',
    ),
    sourceRefs: expect.arrayContaining([
      expect.objectContaining({
        citation: expect.stringContaining('guidance'),
      }),
    ]),
  });
  expect(
    BATTLEMECH_COMBAT_VALIDATION_CATALOG.damageAndDeath.criticalSlotEffects[
      'equipment-stealth-linked-ecm'
    ],
  ).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining('ECM suites non-operational'),
    sourceRefs: expect.arrayContaining([
      expect.objectContaining({
        citation: expect.stringContaining('active own-ECM state'),
      }),
    ]),
  });
  expect(unresolvedRefs).not.toContain(
    'featureSupport.mechQuirks.command_mech',
  );
  expect(unresolvedRefs).not.toContain(
    'featureSupport.mechQuirks.battle_computer',
  );
  expect(unresolvedRefs).not.toContain(
    'pilotSkills.pilotModifierResolvers.initiative-hq-equipment-hydration',
  );
  expect(unresolvedRefs).not.toContain(
    'pilotSkills.pilotModifierResolvers.initiative-command-console-hydration',
  );
  expect(unresolvedRefs).not.toContain(
    'pilotSkills.pilotModifierResolvers.initiative-equipment-producer-hydration',
  );
  expect(unresolvedRefs).not.toContain(
    'pilotSkills.pilotSkillUse.initiative-skill-modifiers',
  );
  expect(unresolvedRefs).not.toContain(
    'pilotSkills.pilotModifierResolvers.heavy-lifter-throw-object-action-application',
  );
  expect(unresolvedRefs).not.toContain(
    'pilotSkills.pilotModifierResolvers.heavy-lifter-carry-object-action-application',
  );
  expect(unresolvedRefs).not.toContain(
    'pilotSkills.pilotModifierResolvers.heavy-lifter-throw-release-lifecycle-application',
  );
  expect(unresolvedRefs).not.toContain(
    'pilotSkills.pilotModifierResolvers.maneuvering-ace-flanking-turning-producer-application',
  );
  expect(unresolvedRefs).not.toContain(
    'pilotSkills.pilotModifierResolvers.maneuvering-ace-out-of-control-producer-application',
  );
  expect(unresolvedRefs).not.toContain(
    'pilotSkills.pilotModifierResolvers.movement-application',
  );
  expect(unresolvedRefs).not.toContain(
    'featureSupport.specialWeaponFamilies.narc',
  );
  expect(unresolvedRefs).not.toContain(
    'featureSupport.specialWeaponFamilies.artemis',
  );
  expect(unresolvedRefs).not.toContain(
    'featureSupport.specialWeaponFamilies.plasma-cannon',
  );
  const unresolvedSpecialWeaponResidualRefs = unresolvedRefs.filter(
    (ref) =>
      ref.startsWith('featureSupport.specialWeaponFamilies.') ||
      ref.startsWith('featureSupport.specialWeaponMechanics.'),
  );
  expect(unresolvedSpecialWeaponResidualRefs.sort()).toEqual([]);
  const representedArtemisMechanicRefs = [
    'featureSupport.specialWeaponMechanics.artemis-fcs-critical-slot-hydration',
    'featureSupport.specialWeaponMechanics.artemis-explicit-fcs-link-lifecycle',
    'featureSupport.specialWeaponMechanics.artemis-fcs-critical-lifecycle',
    'featureSupport.specialWeaponMechanics.artemis-cluster-modifier',
    'featureSupport.specialWeaponMechanics.artemis-cews-ecm-probe-lifecycle',
    'featureSupport.specialWeaponMechanics.artemis-link-network-lifecycle',
    'featureSupport.specialWeaponMechanics.artemis-ecm-suppression',
    'featureSupport.specialWeaponMechanics.artemis-ecm-mode-lifecycle',
    'featureSupport.specialWeaponMechanics.artemis-ecm-suite-hydration',
    'featureSupport.specialWeaponMechanics.active-probe-counter-hydration',
    'featureSupport.specialWeaponMechanics.active-probe-critical-lifecycle',
    'featureSupport.specialWeaponMechanics.artemis-stealth-suppression',
    'featureSupport.specialWeaponMechanics.artemis-stealth-mode-damage-lifecycle',
  ];
  expect(unresolvedRefs).toEqual(
    expect.not.arrayContaining(representedArtemisMechanicRefs),
  );
  for (const ref of [
    'featureSupport.specialWeaponMechanics.ams-authored-multi-use-lifecycle',
    'featureSupport.specialWeaponMechanics.plasma-cannon-battlemech-target-heat',
    'featureSupport.specialWeaponMechanics.plasma-cannon-battlemech-heat-phase-pending-bucket',
    'featureSupport.specialWeaponMechanics.inarc-variant-ammo-attachment',
    'featureSupport.specialWeaponMechanics.inarc-homing-marker-attachment',
    'featureSupport.specialWeaponMechanics.inarc-homing-cluster-modifier',
    'featureSupport.specialWeaponMechanics.inarc-homing-to-hit-modifier',
    'featureSupport.specialWeaponMechanics.inarc-haywire-to-hit-modifier',
    'featureSupport.specialWeaponMechanics.inarc-ecm-attacker-flight-path-suppression',
    'featureSupport.specialWeaponMechanics.inarc-ecm-c3-disruption',
    'featureSupport.specialWeaponMechanics.inarc-nemesis-redirect',
    'featureSupport.specialWeaponMechanics.inarc-pod-event-replay-lifecycle',
    'featureSupport.specialWeaponMechanics.inarc-pod-brush-off-removal-lifecycle',
    'featureSupport.specialWeaponMechanics.inarc-pod-brush-off-target-selection',
    'featureSupport.specialWeaponMechanics.inarc-pod-target-identity-lifecycle',
    'featureSupport.specialWeaponMechanics.inarc-pod-target-option-deduplication',
    'featureSupport.specialWeaponMechanics.inarc-pod-turn-reset-lifecycle',
    'featureSupport.specialWeaponMechanics.inarc-pod-variants',
    'featureSupport.specialWeaponMechanics.inarc-pod-object-lifecycle',
  ]) {
    expect(unresolvedRefs).not.toContain(ref);
  }
  const representedArtemisSplitRow =
    BATTLEMECH_COMBAT_VALIDATION_CATALOG.featureSupport.specialWeaponMechanics[
      'artemis-link-network-lifecycle'
    ];
  expect(representedArtemisSplitRow).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining('Split-accounted Artemis lifecycle row'),
  });
  expect(representedArtemisSplitRow.gap).toBeUndefined();
  expect(representedArtemisSplitRow.evidence).toContain(
    'whole-catalog non-torpedo Artemis FCS allocation audit coverage',
  );
  expect(unresolvedRefs).not.toContain(
    'featureSupport.specialWeaponMechanics.artemis-link-network-lifecycle',
  );
  expect(unresolvedRefs).not.toContain(
    'featureSupport.specialWeaponMechanics.artemis-ambiguous-fcs-allocation-authoring',
  );
  expect(
    SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT[
      'artemis-ambiguous-fcs-allocation-authoring'
    ],
  ).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining(
      'whole-catalog non-torpedo audit coverage',
    ),
  });
  expect(
    SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT[
      'artemis-ambiguous-fcs-allocation-authoring'
    ].gap,
  ).toBeUndefined();
  expect(unresolvedRows.map((row) => row.ref)).not.toContain(
    'featureSupport.specialWeaponMechanics.artemis-active-probe-mode-authoring',
  );
  expect(
    SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT[
      'artemis-active-probe-mode-authoring'
    ],
  ).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining(
      'represented by BAP/CEWS equipment hydration and operational lifecycle rather than a separate probe mode surface',
    ),
  });
  expect(
    SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT[
      'artemis-active-probe-mode-authoring'
    ].gap,
  ).toBeUndefined();
  expect(unresolvedRows.map((row) => row.ref)).not.toContain(
    'featureSupport.specialWeaponMechanics.artemis-ew-mode-authoring',
  );
  expect(
    SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['artemis-ew-mode-authoring'],
  ).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining(
      'imports ECM suite currentMode/mode/activeMode/modeName authoring',
    ),
  });
  expect(
    SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['artemis-ew-mode-authoring'].gap,
  ).toBeUndefined();
  expect(unresolvedRows.map((row) => row.ref)).not.toContain(
    'featureSupport.specialWeaponMechanics.artemis-stealth-mode-damage-lifecycle',
  );
  expect(
    SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT[
      'artemis-stealth-mode-damage-lifecycle'
    ],
  ).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining(
      'represented ECM equipment critical replay disables',
    ),
  });
  expect(
    SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT[
      'artemis-stealth-mode-damage-lifecycle'
    ].gap,
  ).toBeUndefined();
  expect(
    SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT[
      'artemis-stealth-mode-damage-lifecycle'
    ].sourceRefs?.some((sourceRef) =>
      sourceRef.citation.includes('attacker stealth'),
    ),
  ).toBe(true);
  expect(
    SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT[
      'artemis-stealth-mode-damage-lifecycle'
    ].sourceRefs?.some((sourceRef) =>
      sourceRef.citation.includes('ECM equipment destruction disables'),
    ),
  ).toBe(true);
  expect(
    SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT[
      'artemis-stealth-mode-damage-lifecycle'
    ].sourceRefs?.some((sourceRef) =>
      sourceRef.citation.includes('operational own ECM'),
    ),
  ).toBe(true);
  expect(
    SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT[
      'artemis-ambiguous-fcs-allocation-authoring'
    ].sourceRefs?.some((sourceRef) => sourceRef.citation.includes('F_ARTEMIS')),
  ).toBe(true);
  expect(
    SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT[
      'artemis-active-probe-mode-authoring'
    ].sourceRefs?.some((sourceRef) =>
      sourceRef.citation.includes('Watchdog and Nova CEWS'),
    ),
  ).toBe(true);
  expect(
    SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT[
      'artemis-ew-mode-authoring'
    ].sourceRefs?.some((sourceRef) =>
      sourceRef.citation.includes('suppressing ECM'),
    ),
  ).toBe(true);
  expect(
    representedArtemisSplitRow.sourceRefs?.some((sourceRef) =>
      sourceRef.citation.includes('C3Nova network ids'),
    ),
  ).toBe(true);
  expect(getCombatValidationOutOfScopeRefs()).toContain(
    'featureSupport.specialWeaponFamilies.plasma-cannon',
  );
  expect(unresolvedRows).not.toContainEqual(
    expect.objectContaining({
      ref: 'featureSupport.specialWeaponMechanics.inarc-pod-object-lifecycle',
    }),
  );
  expect(
    SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['inarc-pod-object-lifecycle'],
  ).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining('carrier iNarcPods state'),
  });
  expect(
    SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['inarc-pod-object-lifecycle'].gap,
  ).toBeUndefined();
  expect(
    SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['inarc-pod-object-lifecycle']
      .evidence,
  ).toContain('selectedINarcPod');
  expect(
    SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['inarc-pod-object-lifecycle']
      .evidence,
  ).toContain('producer-side C3 authoring remains separated');
  expect(
    SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['inarc-pod-turn-reset-lifecycle'],
  ).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining('resetTurnState'),
  });
  expect(
    SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['inarc-pod-turn-reset-lifecycle']
      .gap,
  ).toBeUndefined();
  expect(
    SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['inarc-ecm-sensor-effects'],
  ).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining('tactical sensor contacts'),
  });
  expect(
    SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['inarc-ecm-sensor-effects'].gap,
  ).toBeUndefined();
  expect(
    SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT[
      'inarc-ecm-sensor-effects'
    ].sourceRefs?.some((sourceRef) =>
      sourceRef.citation.includes('Sensor.getModForECM'),
    ),
  ).toBe(true);
  const residualINarcProducerC3Row = getCombatValidationOutOfScopeRows().find(
    (row) =>
      row.ref ===
      'featureSupport.specialWeaponMechanics.inarc-producer-c3-authoring',
  );
  expect(residualINarcProducerC3Row).toMatchObject({
    level: 'out-of-scope',
    evidence: expect.stringContaining('iNarc ECM C3 disruption'),
    gap: expect.stringContaining('Producer-side C3 membership'),
  });
  expect(residualINarcProducerC3Row?.evidence).toContain('Residual row only');
  expect(residualINarcProducerC3Row?.evidence).toContain(
    'conservative unambiguous C3 equipment seeding',
  );
  expect(residualINarcProducerC3Row?.gap).toContain('C3 assignment UI/editor');
  expect(residualINarcProducerC3Row?.gap).toContain(
    'explicit or conservative C3 state consumption alone',
  );
  expect(residualINarcProducerC3Row?.gap).toContain('equipment seeding');
  expect(residualINarcProducerC3Row?.gap).toContain(
    'iNarc ECM disruption alone',
  );
  expect(unresolvedRefs).not.toContain(
    'featureSupport.specialWeaponMechanics.inarc-explosive-ammo-compatibility',
  );
  expect(unresolvedRefs).not.toContain('ruleSupport.movementRules.prone');
  expect(unresolvedRefs).not.toContain(
    'actions.absentActionSurfaces.movement.evade',
  );
  expect(unresolvedRefs).not.toContain(
    'featureSupport.canonicalPilotAbilityScope.edge_when_masc_fails',
  );
  expect(unresolvedRefs).not.toContain(
    'featureSupport.canonicalPilotAbilityScope.artificial_pain_shunt',
  );
  expect(unresolvedRefs).not.toContain(
    'featureSupport.canonicalPilotAbilityScope.animal_mimic',
  );
  expect(unresolvedRefs).not.toContain(
    'featureSupport.pilotAbilities.animal-mimicry',
  );
  expect(unresolvedRefs).not.toContain(
    'featureSupport.canonicalPilotAbilityScope.cross_country',
  );
  expect(unresolvedRefs).not.toContain(
    'featureSupport.pilotAbilities.cross-country',
  );
  expect(unresolvedRefs).not.toContain(
    'featureSupport.mechQuirks.protected_actuators',
  );
  expect(unresolvedRefs).not.toContain(
    'featureSupport.mechQuirks.exposed_actuators',
  );
  expect(unresolvedRefs).not.toContain('featureSupport.mechQuirks.low_arms');
  expect(unresolvedRefs).not.toContain(
    'pilotSkills.pilotModifierResolvers.anti-mek-actuator-application',
  );
  expect(unresolvedRefs).not.toContain(
    'pilotSkills.pilotModifierResolvers.low-arms-application',
  );
  expect(unresolvedRefs).not.toContain(
    'featureSupport.canonicalPilotAbilityScope.melee_master',
  );
  expect(unresolvedRefs).not.toContain(
    'featureSupport.pilotAbilities.melee-master',
  );
  expect(unresolvedRefs).not.toContain(
    'pilotSkills.pilotModifierResolvers.physical-action-count-application',
  );
  expect(unresolvedRefs).not.toContain(
    'pilotSkills.pilotModifierResolvers.called-shot-application',
  );
  expect(unresolvedRefs).not.toContain(
    'pilotSkills.pilotModifierResolvers.heat-application',
  );
  expect(unresolvedRefs).not.toContain(
    'pilotSkills.pilotModifierResolvers.legacy-pain-resistance-to-hit-application',
  );
  expect(unresolvedRefs).not.toContain(
    'featureSupport.pilotAbilities.marksman',
  );
  expect(unresolvedRefs).not.toContain(
    'featureSupport.pilotAbilities.sharpshooter',
  );
  expect(unresolvedRefs).not.toContain('featureSupport.pilotAbilities.acrobat');
  expect(unresolvedRefs).not.toContain(
    'featureSupport.pilotAbilities.antagonizer',
  );
  expect(unresolvedRefs).not.toContain(
    'featureSupport.pilotAbilities.combat-intuition',
  );
  expect(unresolvedRefs).not.toContain(
    'featureSupport.pilotAbilities.cool-under-fire',
  );
  expect(unresolvedRefs).not.toContain('featureSupport.pilotAbilities.evasive');
  expect(unresolvedRefs).not.toContain(
    'featureSupport.pilotAbilities.natural-grace',
  );
  expect(unresolvedRefs).not.toContain(
    'featureSupport.pilotAbilities.speed-demon',
  );
  expect(unresolvedRefs).not.toContain(
    'pilotSkills.pilotModifierResolvers.target-priority-application',
  );
  expect(unresolvedRefs).not.toContain(
    'validationScope.objectiveRequirements.heat-driven-modifiers',
  );
  expect(unresolvedRefs).not.toContain(
    'lifecycleAndPsr.psrTriggers.masc_failure',
  );
  expect(unresolvedRefs).not.toContain(
    'lifecycleAndPsr.psrTriggers.supercharger_failure',
  );
  const unsupportedRefs = unresolvedRows
    .filter((row) => row.level === 'unsupported')
    .map((row) => row.ref);
  expect(unsupportedRefs).not.toContain(
    'featureSupport.canonicalPilotAbilityScope.hvy_lifter',
  );
  expect(unresolvedRefs).not.toContain(
    'featureSupport.canonicalPilotAbilityScope.hvy_lifter',
  );
  expect(unresolvedRefs).not.toContain(
    'featureSupport.pilotAbilities.maneuvering-ace',
  );
  expect(unresolvedRefs).not.toContain(
    'featureSupport.canonicalPilotAbilityScope.maneuvering_ace',
  );
  expect(unresolvedRefs).not.toContain(
    'pilotSkills.pilotModifierResolvers.movement-application',
  );
  expect(unresolvedRefs).not.toContain(
    'pilotSkills.pilotModifierResolvers.maneuvering-ace-flanking-turning-producer-application',
  );
  expect(
    BATTLEMECH_COMBAT_VALIDATION_CATALOG.pilotSkills.pilotModifierResolvers[
      'maneuvering-ace-flanking-turning-producer-application'
    ],
  ).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining('flanking-and-turning PSR'),
  });
  expect(unresolvedRefs).not.toContain(
    'pilotSkills.pilotModifierResolvers.maneuvering-ace-out-of-control-producer-application',
  );
  expect(
    getCombatValidationOutOfScopeRows().find(
      (row) =>
        row.ref ===
        'pilotSkills.pilotModifierResolvers.maneuvering-ace-out-of-control-producer-application',
    ),
  ).toMatchObject({
    evidence: expect.stringContaining(
      'aerospace, capital craft, and airborne LAM/AirMek',
    ),
    gap: expect.stringContaining('separate aerospace/LAM validation'),
  });
  expect(unresolvedRefs).not.toContain(
    'pilotSkills.pilotModifierResolvers.heavy-lifter-throw-object-action-application',
  );
  expect(unresolvedRefs).not.toContain(
    'pilotSkills.pilotModifierResolvers.aerospace-maneuvering-ace-movement-application',
  );
  expect(unresolvedRefs).not.toContain(
    'pilotSkills.pilotModifierResolvers.heavy-lifter-lift-capacity-application',
  );
  expect(unresolvedRefs).not.toContain(
    'pilotSkills.pilotModifierResolvers.heavy-lifter-carry-object-capacity-check-application',
  );
  expect(unresolvedRefs).not.toContain(
    'pilotSkills.pilotModifierResolvers.heavy-lifter-ground-object-weight-gate-application',
  );
  expect(unresolvedRefs).not.toContain(
    'pilotSkills.pilotModifierResolvers.heavy-lifter-throw-release-lifecycle-application',
  );
  expect(unresolvedRefs).not.toContain(
    'pilotSkills.pilotModifierResolvers.maneuvering-ace-lateral-movement-application',
  );
  expect(unresolvedRefs).not.toContain(
    'pilotSkills.pilotModifierResolvers.psr-spa-application',
  );
  expect(unsupportedRefs).not.toContain(
    'featureSupport.pilotAbilities.heavy-lifter',
  );
  expect(unresolvedRefs).not.toContain(
    'featureSupport.pilotAbilities.heavy-lifter',
  );
  expect(unresolvedRefs).not.toContain(
    'ruleSupport.terrainTypeLos.light_woods',
  );
  expect(unresolvedRefs).not.toContain('ruleSupport.terrainTypeLos.smoke');
  expect(unresolvedRefs).not.toContain(
    'ruleSupport.terrainEnvironment.terrain-los-blocking',
  );
  expect(unresolvedRefs).not.toContain(
    'ruleSupport.terrainEnvironment.terrain-los-water-endpoint-blocking',
  );
  expect(unresolvedRefs).not.toContain(
    'ruleSupport.terrainEnvironment.terrain-los-divided-side-path-blocking',
  );
  expect(unresolvedRefs).not.toContain(
    'ruleSupport.terrainEnvironment.terrain-los-divided-elevation-blocking',
  );
  expect(unresolvedRefs).not.toContain(
    'ruleSupport.terrainEnvironment.terrain-los-intervening-elevation-blocking',
  );
  expect(unresolvedRefs).not.toContain(
    'ruleSupport.terrainEnvironment.terrain-los-same-building-hex-blocking',
  );
  expect(unresolvedRefs).not.toContain(
    'ruleSupport.terrainEnvironment.terrain-los-same-building-level-count',
  );
  expect(
    unresolvedRefs.filter((ref) =>
      ref.startsWith('eventStream.nonBattleMechEventScope.'),
    ),
  ).toEqual([]);
  expect(unsupportedRefs).not.toContain(
    'pilotSkills.pilotModifierResolvers.multi-target-penalty-application',
  );
  expect(unresolvedRefs).not.toContain(
    'pilotSkills.pilotModifierResolvers.multi-target-penalty-application',
  );
  expect(unresolvedRefs).not.toContain(
    'featureSupport.pilotAbilities.multi-target',
  );
  expect(unsupportedRefs).not.toContain(
    'featureSupport.pilotAbilities.toughness',
  );
  expect(unresolvedRefs).not.toContain(
    'featureSupport.pilotAbilities.iron-will',
  );
  expect(unresolvedRefs).not.toContain(
    'featureSupport.pilotAbilities.terrain-master',
  );
  for (const representedBattleMechEdgeTriggerRef of [
    'featureSupport.canonicalPilotAbilityScope.edge_when_explosion',
    'featureSupport.canonicalPilotAbilityScope.edge_when_headhit',
    'featureSupport.canonicalPilotAbilityScope.edge_when_ko',
    'featureSupport.canonicalPilotAbilityScope.edge_when_masc_fails',
    'featureSupport.canonicalPilotAbilityScope.edge_when_tac',
  ]) {
    expect(unsupportedRefs).not.toContain(representedBattleMechEdgeTriggerRef);
    expect(unresolvedRefs).not.toContain(representedBattleMechEdgeTriggerRef);
  }
  expect(unresolvedRefs).not.toContain('featureSupport.pilotAbilities.edge');
  expect(unresolvedRefs).not.toContain(
    'pilotSkills.pilotModifierResolvers.edge-application',
  );
  expect(unsupportedRefs).not.toContain(
    'featureSupport.canonicalPilotAbilityScope.tm_nightwalker',
  );
  expect(unsupportedRefs).not.toContain(
    'featureSupport.mechQuirks.low_profile',
  );
  expect(unresolvedRefs).not.toContain('featureSupport.mechQuirks.distracting');
  expect(unresolvedRefs).not.toContain(
    'featureSupport.canonicalPilotAbilityScope.tm_nightwalker',
  );
  expect(CANONICAL_SPA_COMBAT_SCOPE_SUPPORT.tm_nightwalker).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining('MegaMek full-moon'),
  });
  expect(CANONICAL_SPA_COMBAT_SCOPE_SUPPORT.tm_nightwalker.gap).toBeUndefined();
  expect(CANONICAL_SPA_COMBAT_SCOPE_SUPPORT.tm_nightwalker.evidence).toContain(
    'no Nightwalker to-hit modifier is claimed',
  );
  const canonicalSpaResidualDetails = (
    spaIds: readonly string[],
  ): Record<
    string,
    {
      level: string | undefined;
      evidence: string | undefined;
      gap: string | undefined;
    }
  > =>
    Object.fromEntries(
      spaIds.map((spaId) => {
        const row = unresolvedRows.find(
          ({ ref }) =>
            ref === `featureSupport.canonicalPilotAbilityScope.${spaId}`,
        );
        const support = CANONICAL_SPA_COMBAT_SCOPE_SUPPORT[spaId];
        return [
          spaId,
          {
            level: row?.level ?? support?.level,
            evidence: row?.evidence ?? support?.evidence,
            gap: row?.gap ?? support?.gap,
          },
        ];
      }),
    );
  expect(CANONICAL_SPA_COMBAT_SCOPE_SUPPORT.zweihander).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining(
      'every official standalone physical-weapon declaration',
    ),
  });
  expect(CANONICAL_SPA_COMBAT_SCOPE_SUPPORT.zweihander.evidence).toContain(
    'represented self-critical side effects',
  );
  expect(CANONICAL_SPA_COMBAT_SCOPE_SUPPORT.zweihander.evidence).toContain(
    'physical-weapon action scope split',
  );
  expect(CANONICAL_SPA_COMBAT_SCOPE_SUPPORT.zweihander.gap).toBeUndefined();
  expect(unresolvedRows.map(({ ref }) => ref)).not.toContain(
    'featureSupport.canonicalPilotAbilityScope.zweihander',
  );
  expect(unresolvedRows.map(({ ref }) => ref)).not.toEqual(
    expect.arrayContaining([
      'featureSupport.canonicalPilotAbilityScope.vdni',
      'featureSupport.canonicalPilotAbilityScope.bvdni',
    ]),
  );
  expect(CANONICAL_SPA_COMBAT_SCOPE_SUPPORT.env_specialist).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining('source-backed runtime branches'),
  });
  expect(CANONICAL_SPA_COMBAT_SCOPE_SUPPORT.env_specialist.gap).toBeUndefined();
  const representedCanonicalCommImplants = canonicalSpaResidualDetails([
    'boost_comm_implant',
    'comm_implant',
  ]);
  expect(representedCanonicalCommImplants).toEqual({
    boost_comm_implant: {
      level: 'integrated',
      evidence: expect.stringContaining(
        'represented BattleMech C3i network state',
      ),
      gap: undefined,
    },
    comm_implant: {
      level: 'integrated',
      evidence: expect.stringContaining(
        'represented LOS spotter indirect-fire relief',
      ),
      gap: undefined,
    },
  });
  expect(
    Object.values(representedCanonicalCommImplants).map(({ level }) => level),
  ).toEqual(['integrated', 'integrated']);
  expect(
    Object.values(representedCanonicalCommImplants).map(({ evidence }) =>
      evidence?.includes('represented'),
    ),
  ).toEqual([true, true]);
  const representedProcessorResiduals = canonicalSpaResidualDetails([
    'triple_core_processor',
  ]);
  expect(representedProcessorResiduals).toEqual({
    triple_core_processor: {
      level: 'integrated',
      evidence: expect.stringContaining(
        'represented called-shot Targeting Computer -1 aimed-shot relief',
      ),
      gap: undefined,
    },
  });
  expect(representedProcessorResiduals.triple_core_processor.evidence).toEqual(
    expect.stringContaining('hostile-ECM/EMI initiative reductions'),
  );
  expect(representedProcessorResiduals.triple_core_processor.evidence).toEqual(
    expect.stringContaining('actual Targeting Computer equipment state'),
  );
  expect(unresolvedRefs).not.toContain(
    'featureSupport.canonicalPilotAbilityScope.triple_core_processor',
  );
  expect(unresolvedRefs).not.toContain(
    'pilotSkills.pilotModifierResolvers.env-specialist-snow-ranged-to-hit-application',
  );
  expect(unresolvedRefs).not.toContain(
    'pilotSkills.pilotModifierResolvers.env-specialist-wind-ranged-to-hit-application',
  );
  expect(unresolvedRefs).not.toContain(
    'pilotSkills.pilotModifierResolvers.zweihander-punch-physical-application',
  );
  expect(
    unresolvedRows.find(
      (row) => row.ref === 'featureSupport.mechQuirks.low_profile',
    ),
  ).toBeUndefined();
  expect(unresolvedRefs).not.toContain(
    'featureSupport.pilotAbilities.toughness',
  );
  expect(unsupportedRefs).not.toContain(
    'actions.physicalActionClassScope.trip',
  );
  expect(unsupportedRefs).not.toContain(
    'actions.physicalActionClassScope.thrash',
  );
  expect(unsupportedRefs).not.toContain(
    'actions.physicalActionClassScope.brush-off',
  );
  expect(unsupportedRefs).not.toContain(
    'actions.physicalActionClassScope.break-grapple',
  );
  expect(unsupportedRefs).not.toContain(
    'actions.physicalActionClassScope.jump-jet-attack',
  );
  expect(unsupportedRefs).not.toContain(
    'actions.physicalActionClassScope.grapple',
  );
  expect(unresolvedRefs).not.toContain(
    'actions.physicalActionClassScope.grapple',
  );
  expect(unresolvedRefs).not.toContain('actions.physicalActionClassScope.trip');
  expect(unresolvedRefs).not.toContain(
    'actions.physicalActionClassScope.thrash',
  );
  expect(unresolvedRefs).not.toContain(
    'actions.physicalActionClassScope.jump-jet-attack',
  );
  expect(unresolvedRefs).not.toContain(
    'actions.physicalActionClassScope.brush-off',
  );
  expect(unresolvedRefs).not.toContain(
    'actions.physicalActionClassScope.break-grapple',
  );
}

export {
  BATTLEMECH_COMBAT_VALIDATION_CATALOG,
  BATTLEMECH_VALIDATION_SCOPE_SUPPORT,
  CANONICAL_SPA_COMBAT_SCOPE_SUPPORT,
  CLOSED_EJECTION_COVERAGE_REFS,
  COMBAT_CATALOG_TRIAD_EVIDENCE,
  DISPLACEMENT_DOMINO_SECONDARY_FALLOUT_OUT_OF_SCOPE_IDS,
  DISPLACEMENT_DOMINO_SECONDARY_FALLOUT_UNSUPPORTED_IDS,
  EQUIPMENT_BOMB_BAY_CRITICAL_EFFECT_GAP,
  EQUIPMENT_CRITICAL_COMPONENT_EVIDENCE,
  EQUIPMENT_CRITICAL_EFFECT_EVIDENCE,
  MINEFIELD_VARIANT_SIDE_PATH_UNSUPPORTED_IDS,
  OUT_OF_SCOPE_DISPLACEMENT_DOMINO_SECONDARY_FALLOUT_REFS,
  OUT_OF_SCOPE_EQUIPMENT_CRITICAL_EFFECT_SUPPORT_IDS,
  REPRESENTED_EQUIPMENT_CRITICAL_EFFECT_SUPPORT_IDS,
  SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT,
  TERRAIN_LOS_SIDE_PATH_UNSUPPORTED_IDS,
  UNRESOLVED_ARTEMIS_LINK_NETWORK_LIFECYCLE_REFS,
  UNRESOLVED_ARTEMIS_LINK_NETWORK_LIFECYCLE_SUPPORT_IDS,
  UNRESOLVED_DISPLACEMENT_DOMINO_SECONDARY_FALLOUT_REFS,
  UNRESOLVED_EQUIPMENT_CRITICAL_COMPONENT_REFS,
  UNRESOLVED_EQUIPMENT_CRITICAL_EFFECT_SUPPORT_IDS,
  UNRESOLVED_EQUIPMENT_CRITICAL_SLOT_EFFECT_REFS,
  UNRESOLVED_MINEFIELD_VARIANT_SIDE_PATH_REFS,
  UNRESOLVED_TERRAIN_LOS_SIDE_PATH_REFS,
  VALID_SOURCE_KINDS,
  catalogEntryRef,
  catalogMaps,
  entryNeedsEvidenceOrGap,
  entrySourceRefFailures,
  existsSync,
  expectUnresolvedInventoryClosedAfterLeafClosure,
  fileLineCount,
  filterCombatValidationGapRowsByScope,
  findMissingEvidenceOrGapRefs,
  findMissingSourceRefRefs,
  findTriadEvidenceFailures,
  findTriadSectionKeyFailures,
  getCombatValidationOutOfScopeRefs,
  getCombatValidationOutOfScopeRows,
  getCombatValidationUnresolvedRefs,
  getCombatValidationUnresolvedRows,
  hasIntegratedRows,
  isCombatValidationAggregateGapRow,
  join,
  parseLocalSourceAnchor,
  readFileSync,
  sortedKeys,
  sourceRefAnchorFailures,
  sourceRefAuthorityFailures,
  sourceRefMetadataFailures,
  spawnSync,
  supportIds,
  triadEvidenceFailuresForMap,
  triadEvidenceMaps,
  triadSectionMapMatches,
  triadTestRefFailures,
  validateSourceRef,
};
export type {
  CatalogMapRow,
  CombatValidationCatalogSection,
  CombatValidationSourceRef,
  CombatValidationSupportEntry,
  CombatValidationSupportMap,
  ICombatCatalogTriadEvidence,
  ICombatCatalogTriadTestReference,
};
