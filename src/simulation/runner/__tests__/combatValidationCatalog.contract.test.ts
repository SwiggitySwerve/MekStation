import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import type {
  CombatValidationCatalogSection,
  CombatValidationSupportMap,
} from '../CombatValidationCatalog';
import type { ICombatCatalogTriadEvidence } from '../CombatValidationCatalogTriad';

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

describe('BattleMech combat validation catalog index', () => {
  it('indexes every catalog lane under one authoritative section map', () => {
    expect(sortedKeys(BATTLEMECH_COMBAT_VALIDATION_CATALOG)).toEqual([
      'actions',
      'damageAndDeath',
      'eventStream',
      'featureSupport',
      'invalidation',
      'lifecycleAndPsr',
      'parityAndIntegration',
      'pilotSkills',
      'ruleSupport',
      'validationScope',
    ]);

    expect(
      Object.values(BATTLEMECH_COMBAT_VALIDATION_CATALOG).every(
        (section) => sortedKeys(section).length > 0,
      ),
    ).toBe(true);
  });

  it('requires every indexed support entry to carry evidence and explicit gaps when not integrated', () => {
    const missingEvidenceOrGap = catalogMaps().flatMap(
      ({ sectionId, mapId, support }) =>
        Object.values(support)
          .filter(
            (entry) =>
              entry.evidence.length === 0 ||
              (entry.level !== 'integrated' &&
                (entry.gap === undefined || entry.gap.length === 0)),
          )
          .map((entry) => `${sectionId}.${mapId}.${entry.id}`),
    );

    expect(missingEvidenceOrGap).toEqual([]);
  });

  it('requires every indexed support entry to carry row-level source references', () => {
    const missingSourceRefs = catalogMaps().flatMap(
      ({ sectionId, mapId, support }) =>
        Object.values(support)
          .filter((entry) => (entry.sourceRefs ?? []).length === 0)
          .map((entry) => `${sectionId}.${mapId}.${entry.id}`),
    );

    expect(missingSourceRefs).toEqual([]);
  });

  it('keeps the unresolved helper and unsupported inventory empty after leaf closure', () => {
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
      bySection: unresolvedRows.reduce<Record<string, number>>(
        (counts, row) => {
          counts[row.sectionId] = (counts[row.sectionId] ?? 0) + 1;
          return counts;
        },
        {},
      ),
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
      SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT[
        'ams-authored-multi-use-lifecycle'
      ],
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
    expect(unresolvedRefs).not.toContain(
      'ruleSupport.terrainEnvironment.mines',
    );
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
    expect(unresolvedRefs).not.toContain(
      'ruleSupport.movementEnhancements.MASC',
    );
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
          row.ref ===
          'ruleSupport.movementEnhancements.supercharger-side-paths',
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
    expect(unresolvedRefs).not.toContain(
      'featureSupport.physicalWeapons.claws',
    );
    expect(unresolvedRefs).not.toContain(
      'featureSupport.physicalWeapons.talons',
    );
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
      BATTLEMECH_COMBAT_VALIDATION_CATALOG.featureSupport.physicalWeapons
        .talons,
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
      BATTLEMECH_COMBAT_VALIDATION_CATALOG.featureSupport
        .specialWeaponMechanics['artemis-link-network-lifecycle'];
    expect(representedArtemisSplitRow).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining(
        'Split-accounted Artemis lifecycle row',
      ),
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
      ].sourceRefs?.some((sourceRef) =>
        sourceRef.citation.includes('F_ARTEMIS'),
      ),
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
    expect(residualINarcProducerC3Row?.gap).toContain(
      'C3 assignment UI/editor',
    );
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
    expect(unresolvedRefs).not.toContain(
      'featureSupport.pilotAbilities.acrobat',
    );
    expect(unresolvedRefs).not.toContain(
      'featureSupport.pilotAbilities.antagonizer',
    );
    expect(unresolvedRefs).not.toContain(
      'featureSupport.pilotAbilities.combat-intuition',
    );
    expect(unresolvedRefs).not.toContain(
      'featureSupport.pilotAbilities.cool-under-fire',
    );
    expect(unresolvedRefs).not.toContain(
      'featureSupport.pilotAbilities.evasive',
    );
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
      expect(unsupportedRefs).not.toContain(
        representedBattleMechEdgeTriggerRef,
      );
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
    expect(unresolvedRefs).not.toContain(
      'featureSupport.mechQuirks.distracting',
    );
    expect(unresolvedRefs).not.toContain(
      'featureSupport.canonicalPilotAbilityScope.tm_nightwalker',
    );
    expect(CANONICAL_SPA_COMBAT_SCOPE_SUPPORT.tm_nightwalker).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('MegaMek full-moon'),
    });
    expect(
      CANONICAL_SPA_COMBAT_SCOPE_SUPPORT.tm_nightwalker.gap,
    ).toBeUndefined();
    expect(
      CANONICAL_SPA_COMBAT_SCOPE_SUPPORT.tm_nightwalker.evidence,
    ).toContain('no Nightwalker to-hit modifier is claimed');
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
    expect(
      CANONICAL_SPA_COMBAT_SCOPE_SUPPORT.env_specialist.gap,
    ).toBeUndefined();
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
    expect(
      representedProcessorResiduals.triple_core_processor.evidence,
    ).toEqual(expect.stringContaining('hostile-ECM/EMI initiative reductions'));
    expect(
      representedProcessorResiduals.triple_core_processor.evidence,
    ).toEqual(
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
    expect(unresolvedRefs).not.toContain(
      'actions.physicalActionClassScope.trip',
    );
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
  });

  it('classifies source-backed canonical comm implant rows as represented BattleMech behavior', () => {
    expect(getCombatValidationUnresolvedRefs()).not.toContain(
      'featureSupport.canonicalPilotAbilityScope.comm_implant',
    );
    expect(getCombatValidationUnresolvedRefs()).not.toContain(
      'featureSupport.canonicalPilotAbilityScope.boost_comm_implant',
    );
    expect(CANONICAL_SPA_COMBAT_SCOPE_SUPPORT.boost_comm_implant).toMatchObject(
      {
        level: 'integrated',
        evidence: expect.stringContaining(
          'represented BattleMech C3i network state',
        ),
      },
    );
    expect(
      CANONICAL_SPA_COMBAT_SCOPE_SUPPORT.boost_comm_implant.gap,
    ).toBeUndefined();
    expect(CANONICAL_SPA_COMBAT_SCOPE_SUPPORT.comm_implant).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('represented LOS spotter'),
    });
    expect(CANONICAL_SPA_COMBAT_SCOPE_SUPPORT.comm_implant.gap).toBeUndefined();
    expect(getCombatValidationUnresolvedRefs()).not.toContain(
      'featureSupport.canonicalPilotAbilityScope.proto_dni',
    );
    expect(CANONICAL_SPA_COMBAT_SCOPE_SUPPORT.proto_dni).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('without inferring VDNI'),
    });
    expect(CANONICAL_SPA_COMBAT_SCOPE_SUPPORT.proto_dni.gap).toBeUndefined();
    for (const ref of ['comm_implant', 'boost_comm_implant'] as const) {
      expect(
        CANONICAL_SPA_COMBAT_SCOPE_SUPPORT[ref].sourceRefs?.map(
          ({ citation }) => citation,
        ),
      ).toEqual(
        expect.arrayContaining([
          'Current MegaMek ComputeToHit applies comm_implant and boost_comm_implant as -1 indirect LRM spotter target-number relief.',
          'Current MegaMek Entity.hasC3i treats boosted comm implant as C3i access for any crewed unit after mounted C3i equipment checks.',
        ]),
      );
    }
  });

  it('keeps unresolved leaf mechanic blockers and objective rollups closed', () => {
    const unresolvedRows = getCombatValidationUnresolvedRows();
    const allRows = filterCombatValidationGapRowsByScope(unresolvedRows, 'all');
    const leafRows = filterCombatValidationGapRowsByScope(
      unresolvedRows,
      'leaf',
    );
    const aggregateRows = filterCombatValidationGapRowsByScope(
      unresolvedRows,
      'aggregate',
    );

    expect(allRows).toEqual(unresolvedRows);
    expect(leafRows).toHaveLength(0);
    expect(aggregateRows).toHaveLength(0);
    expect(leafRows.some(isCombatValidationAggregateGapRow)).toBe(false);
    expect(aggregateRows.every(isCombatValidationAggregateGapRow)).toBe(true);
    expect(leafRows.map((row) => row.ref)).toEqual(
      expect.arrayContaining([
        ...UNRESOLVED_EQUIPMENT_CRITICAL_COMPONENT_REFS,
        ...UNRESOLVED_EQUIPMENT_CRITICAL_SLOT_EFFECT_REFS,
        ...UNRESOLVED_MINEFIELD_VARIANT_SIDE_PATH_REFS,
        ...UNRESOLVED_TERRAIN_LOS_SIDE_PATH_REFS,
      ]),
    );
    expect(leafRows.map((row) => row.ref)).not.toContain(
      'ruleSupport.terrainEnvironment.terrain-los-side-paths',
    );
    expect(leafRows.map((row) => row.ref)).not.toContain(
      'ruleSupport.terrainEnvironment.minefield-variant-side-paths',
    );
    expect(leafRows.map((row) => row.ref)).not.toContain(
      'featureSupport.specialWeaponMechanics.artemis-link-network-lifecycle',
    );
    expect(leafRows.map((row) => row.ref)).not.toContain(
      'featureSupport.specialWeaponMechanics.artemis-ambiguous-fcs-allocation-authoring',
    );
    expect(leafRows.map((row) => row.ref)).not.toContain(
      'featureSupport.ammunitionCompatibility.unsupported-rotary-ac-10-20-ammo',
    );
    expect(aggregateRows.map((row) => row.ref)).toEqual([]);
  });

  it('keeps non-BattleMech scope rows auditable without making them BattleMech blockers', () => {
    const outOfScopeRows = getCombatValidationOutOfScopeRows();
    const outOfScopeRefs = getCombatValidationOutOfScopeRefs();

    expect(outOfScopeRefs).toEqual(outOfScopeRows.map((row) => row.ref));
    expect(outOfScopeRefs).toEqual(
      expect.arrayContaining([
        'damageAndDeath.criticalComponents.equipment-bomb-bays',
        'damageAndDeath.criticalComponents.equipment-blue-shield-special-rules',
        'damageAndDeath.criticalSlotEffects.equipment-bomb-bays',
        'damageAndDeath.criticalSlotEffects.equipment-blue-shield-special-rules',
        'eventStream.nonBattleMechEventScope.leg_attack',
        'ruleSupport.toHitModifiers.c3-equipment-network-formation',
        'eventStream.nonBattleMechEventScope.motive_damaged',
        'eventStream.nonBattleMechEventScope.swarm_damage',
        'eventStream.nonBattleMechEventScope.vtol_crash_check',
        'actions.physicalActionClassScope.airmek-ram',
        'actions.physicalActionClassScope.battle-armor-vibro-claw',
        'actions.physicalActionClassScope.lay-explosives',
        'actions.physicalActionClassScope.protomek-physical',
        'actions.physicalActionClassScope.ram',
        'featureSupport.ammunitionCompatibility.non-battlemech-aerospace-capital-ammo',
        'featureSupport.ammunitionCompatibility.non-battlemech-battle-armor',
        'featureSupport.ammunitionCompatibility.non-battlemech-protomech',
        'featureSupport.ammunitionCompatibility.unsupported-aquatic-torpedo-ammo',
        'featureSupport.ammunitionCompatibility.unsupported-artillery-ammo',
        'featureSupport.pilotAbilities.acrobat',
        'featureSupport.pilotAbilities.antagonizer',
        'featureSupport.pilotAbilities.combat-intuition',
        'featureSupport.pilotAbilities.cool-under-fire',
        'featureSupport.pilotAbilities.evasive',
        'featureSupport.pilotAbilities.multi-target',
        'featureSupport.canonicalPilotAbilityScope.aptitude_gunnery',
        'featureSupport.canonicalPilotAbilityScope.aptitude_piloting',
        'featureSupport.canonicalPilotAbilityScope.atow_combat_paralysis',
        'featureSupport.canonicalPilotAbilityScope.atow_combat_sense',
        'featureSupport.canonicalPilotAbilityScope.atow_g_tolerance',
        'featureSupport.canonicalPilotAbilityScope.cross_country',
        'featureSupport.canonicalPilotAbilityScope.dermal_camo_armor',
        'featureSupport.canonicalPilotAbilityScope.edge_when_aero_alt_loss',
        'featureSupport.canonicalPilotAbilityScope.foot_cav',
        'featureSupport.canonicalPilotAbilityScope.gunnery_laser',
        'featureSupport.canonicalPilotAbilityScope.weathered',
        'featureSupport.pilotAbilities.cross-country',
        'featureSupport.pilotAbilities.marksman',
        'featureSupport.pilotAbilities.natural-grace',
        'featureSupport.pilotAbilities.sharpshooter',
        'featureSupport.pilotAbilities.speed-demon',
        'featureSupport.mechQuirks.rugged_1',
        'featureSupport.mechQuirks.rugged_2',
        'lifecycleAndPsr.psrTriggers.charge_miss',
        'lifecycleAndPsr.psrTriggers.dfa_miss',
        'pilotSkills.pilotModifierResolvers.campaign-maintenance-application',
        'pilotSkills.pilotModifierResolvers.target-priority-application',
        'pilotSkills.pilotModifierResolvers.anti-mek-actuator-application',
        'pilotSkills.pilotModifierResolvers.vehicle-movement-application',
        'validationScope.objectiveRequirements.campaign-quirk-behavior',
        'validationScope.objectiveRequirements.physical-weapon-actions',
        'validationScope.knownLimitationsAndScope.non-battlemech-ammo-scope',
        'validationScope.knownLimitationsAndScope.non-battlemech-combat-system-split',
        'validationScope.objectiveRequirements.non-battlemech-scope',
        'ruleSupport.physicalLegalityGates.shared.displacement-domino-dropship-secondary-hex',
        'actions.gmCommandExclusions.gm.advance-phase',
        'actions.gmCommandExclusions.gm.grant-resource',
        'actions.gmCommandExclusions.gm.set-damage',
        'actions.tacticalCommands.movement.cancel',
        'actions.tacticalCommands.movement.stabilize',
        'actions.tacticalCommands.utility.withdraw',
        'actions.tacticalCommands.weapon.clear-attacks',
        'actions.tacticalCommands.weapon.declare-attack',
        'actions.wireIntents.ForfeitMatch',
        'actions.wireIntents.LaunchMatch',
        'actions.wireIntents.LeaveSeat',
        'actions.wireIntents.MarkSeatAi',
        'actions.wireIntents.OccupySeat',
        'actions.wireIntents.ReassignSeat',
        'actions.wireIntents.SetAiSlot',
        'actions.wireIntents.SetHumanSlot',
        'actions.wireIntents.SetReady',
      ]),
    );
    expect(outOfScopeRows).toHaveLength(140);
    expect(
      outOfScopeRows.find(
        (row) =>
          row.ref ===
          'ruleSupport.terrainEnvironment.minefield-non-conventional-type-semantics',
      ),
    ).toBeUndefined();
    expect(
      outOfScopeRows.find(
        (row) =>
          row.ref ===
          'ruleSupport.toHitModifiers.c3-equipment-network-formation',
      ),
    ).toMatchObject({
      level: 'out-of-scope',
      evidence: expect.stringContaining(
        'represented BattleMech C3 runtime behavior is covered by explicit session-authored IGameState.c3Network consumption, mounted equipment role hydration, conservative single-network seeding, unambiguous per-side C3/C3i formation, independent side-by-side formation/denial evaluation, and fail-closed denial boundaries',
      ),
      gap: expect.stringContaining('Manual C3 network authoring UI'),
    });
    expect(
      outOfScopeRows.find(
        (row) =>
          row.ref ===
          'ruleSupport.toHitModifiers.c3-equipment-network-formation',
      ),
    ).toMatchObject({
      gap: expect.stringContaining(
        'automatic same-side multiple-network partitioning',
      ),
    });
    expect(outOfScopeRefs).toContain(
      'ruleSupport.terrainEnvironment.minefield-non-battlemech-sea-variants',
    );
    expect(
      outOfScopeRows.find(
        (row) =>
          row.ref ===
          'ruleSupport.terrainEnvironment.minefield-non-battlemech-sea-variants',
      ),
    ).toMatchObject({
      level: 'out-of-scope',
      evidence: expect.stringContaining('sea/depth state'),
      gap: expect.stringContaining('outside this BattleMech suite'),
    });
    expect(outOfScopeRefs).toContain(
      'ruleSupport.movementEnhancements.supercharger-non-battlemech-side-paths',
    );
    expect(
      outOfScopeRows.find(
        (row) =>
          row.ref ===
          'ruleSupport.movementEnhancements.supercharger-non-battlemech-side-paths',
      ),
    ).toMatchObject({
      level: 'out-of-scope',
      evidence:
        'MegaMek Supercharger has explicit Tank, SupportTank, SupportVTOL, and non-Mek failure-damage branches, but this catalog is scoped to BattleMech combat validation',
      gap: 'Non-BattleMech Supercharger support-unit roll adjustment and vehicle motive-damage branches stay outside this BattleMech suite instead of being counted as BattleMech movement-enhancement blockers',
    });
    expect(
      outOfScopeRefs.filter((ref) =>
        ref.startsWith('actions.physicalActionClassScope.'),
      ),
    ).toEqual([
      'actions.physicalActionClassScope.airmek-ram',
      'actions.physicalActionClassScope.battle-armor-vibro-claw',
      'actions.physicalActionClassScope.lay-explosives',
      'actions.physicalActionClassScope.protomek-physical',
      'actions.physicalActionClassScope.ram',
    ]);
    expect(
      outOfScopeRefs.filter((ref) =>
        ref.startsWith('featureSupport.ammunitionCompatibility.'),
      ),
    ).toEqual([
      'featureSupport.ammunitionCompatibility.experimental-empty-compatible-row',
      'featureSupport.ammunitionCompatibility.non-battlemech-aerospace-capital-ammo',
      'featureSupport.ammunitionCompatibility.non-battlemech-battle-armor',
      'featureSupport.ammunitionCompatibility.non-battlemech-protomech',
      'featureSupport.ammunitionCompatibility.unofficial-empty-compatible-row',
      'featureSupport.ammunitionCompatibility.unsupported-aquatic-torpedo-ammo',
      'featureSupport.ammunitionCompatibility.unsupported-artillery-ammo',
    ]);
    expect(
      outOfScopeRows.find(
        (row) =>
          row.ref ===
          'featureSupport.ammunitionCompatibility.experimental-empty-compatible-row',
      ),
    ).toMatchObject({
      evidence: expect.stringContaining('Experimental BattleMech-family ammo'),
      gap: expect.stringContaining('separate validation matrix'),
    });
    expect(
      outOfScopeRows.find(
        (row) =>
          row.ref ===
          'featureSupport.ammunitionCompatibility.unofficial-empty-compatible-row',
      ),
    ).toMatchObject({
      evidence: expect.stringContaining('Unofficial BattleMech-family ammo'),
      gap: expect.stringContaining('separate validation matrix'),
    });
    expect(
      outOfScopeRefs.filter((ref) =>
        ref.startsWith('featureSupport.canonicalPilotAbilityScope.'),
      ),
    ).toEqual([
      'featureSupport.canonicalPilotAbilityScope.allweather',
      'featureSupport.canonicalPilotAbilityScope.aptitude_gunnery',
      'featureSupport.canonicalPilotAbilityScope.aptitude_piloting',
      'featureSupport.canonicalPilotAbilityScope.atow_combat_paralysis',
      'featureSupport.canonicalPilotAbilityScope.atow_combat_sense',
      'featureSupport.canonicalPilotAbilityScope.atow_g_tolerance',
      'featureSupport.canonicalPilotAbilityScope.blind_fighter',
      'featureSupport.canonicalPilotAbilityScope.clan_pilot_training',
      'featureSupport.canonicalPilotAbilityScope.cluster_master',
      'featureSupport.canonicalPilotAbilityScope.cross_country',
      'featureSupport.canonicalPilotAbilityScope.cyber_imp_audio',
      'featureSupport.canonicalPilotAbilityScope.cyber_imp_laser',
      'featureSupport.canonicalPilotAbilityScope.cyber_imp_visual',
      'featureSupport.canonicalPilotAbilityScope.dermal_camo_armor',
      'featureSupport.canonicalPilotAbilityScope.edge_when_aero_alt_loss',
      'featureSupport.canonicalPilotAbilityScope.edge_when_aero_explosion',
      'featureSupport.canonicalPilotAbilityScope.edge_when_aero_ko',
      'featureSupport.canonicalPilotAbilityScope.edge_when_aero_lucky_crit',
      'featureSupport.canonicalPilotAbilityScope.edge_when_aero_nuke_crit',
      'featureSupport.canonicalPilotAbilityScope.edge_when_aero_unit_cargo_lost',
      'featureSupport.canonicalPilotAbilityScope.ei_implant',
      'featureSupport.canonicalPilotAbilityScope.enh_mm_implants',
      'featureSupport.canonicalPilotAbilityScope.filtration_implants',
      'featureSupport.canonicalPilotAbilityScope.foot_cav',
      'featureSupport.canonicalPilotAbilityScope.gas_effuser_pheromone',
      'featureSupport.canonicalPilotAbilityScope.gas_effuser_toxin',
      'featureSupport.canonicalPilotAbilityScope.golden_goose',
      'featureSupport.canonicalPilotAbilityScope.gunnery_ballistic',
      'featureSupport.canonicalPilotAbilityScope.gunnery_laser',
      'featureSupport.canonicalPilotAbilityScope.gunnery_missile',
      'featureSupport.canonicalPilotAbilityScope.human_tro',
      'featureSupport.canonicalPilotAbilityScope.mm_implants',
      'featureSupport.canonicalPilotAbilityScope.oblique_artillery',
      'featureSupport.canonicalPilotAbilityScope.pl_enhanced',
      'featureSupport.canonicalPilotAbilityScope.pl_extra_limbs',
      'featureSupport.canonicalPilotAbilityScope.pl_flight',
      'featureSupport.canonicalPilotAbilityScope.pl_glider',
      'featureSupport.canonicalPilotAbilityScope.pl_ienhanced',
      'featureSupport.canonicalPilotAbilityScope.pl_masc',
      'featureSupport.canonicalPilotAbilityScope.pl_tail',
      'featureSupport.canonicalPilotAbilityScope.sensor_geek',
      'featureSupport.canonicalPilotAbilityScope.small_pilot',
      'featureSupport.canonicalPilotAbilityScope.suicide_implants',
      'featureSupport.canonicalPilotAbilityScope.urban_guerrilla',
      'featureSupport.canonicalPilotAbilityScope.weathered',
    ]);
    expect(
      outOfScopeRefs.filter((ref) =>
        ref.startsWith('featureSupport.specialWeaponFamilies.'),
      ),
    ).toEqual(['featureSupport.specialWeaponFamilies.plasma-cannon']);
    expect(
      outOfScopeRefs.filter((ref) =>
        ref.startsWith('featureSupport.specialWeaponMechanics.'),
      ),
    ).toEqual([
      'featureSupport.specialWeaponMechanics.ams-bay-authoring',
      'featureSupport.specialWeaponMechanics.ams-optional-multi-use-authoring',
      'featureSupport.specialWeaponMechanics.inarc-producer-c3-authoring',
    ]);
    expect(
      outOfScopeRefs.filter((ref) =>
        ref.startsWith('featureSupport.mechQuirks.'),
      ),
    ).toEqual([
      'featureSupport.mechQuirks.exposed_actuators',
      'featureSupport.mechQuirks.low_arms',
      'featureSupport.mechQuirks.protected_actuators',
      'featureSupport.mechQuirks.rugged_1',
      'featureSupport.mechQuirks.rugged_2',
    ]);
    expect(
      outOfScopeRefs.filter((ref) =>
        ref.startsWith('featureSupport.pilotAbilities.'),
      ),
    ).toEqual([
      'featureSupport.pilotAbilities.acrobat',
      'featureSupport.pilotAbilities.antagonizer',
      'featureSupport.pilotAbilities.combat-intuition',
      'featureSupport.pilotAbilities.cool-under-fire',
      'featureSupport.pilotAbilities.cross-country',
      'featureSupport.pilotAbilities.evasive',
      'featureSupport.pilotAbilities.iron-will',
      'featureSupport.pilotAbilities.marksman',
      'featureSupport.pilotAbilities.multi-target',
      'featureSupport.pilotAbilities.natural-grace',
      'featureSupport.pilotAbilities.sharpshooter',
      'featureSupport.pilotAbilities.speed-demon',
      'featureSupport.pilotAbilities.terrain-master',
      'featureSupport.pilotAbilities.toughness',
    ]);
    expect(
      outOfScopeRows.find(
        (row) => row.ref === 'featureSupport.pilotAbilities.toughness',
      ),
    ).toMatchObject({
      evidence: expect.stringContaining(
        'Legacy pilotAbilities.toughness ability strings',
      ),
      gap: expect.stringContaining(
        'explicit assigned-pilot rpgToughness/pilotToughness',
      ),
    });
    expect(
      outOfScopeRefs.filter((ref) =>
        ref.startsWith('ruleSupport.physicalDamageModifiers.'),
      ),
    ).toEqual([
      'ruleSupport.physicalDamageModifiers.claw-equipment-lifecycle',
      'ruleSupport.physicalDamageModifiers.talon-equipment-lifecycle',
    ]);
    expect(
      outOfScopeRows.find(
        (row) =>
          row.ref ===
          'ruleSupport.physicalDamageModifiers.claw-equipment-lifecycle',
      ),
    ).toMatchObject({
      evidence: expect.stringContaining(
        'Represented runtime claw lifecycle paths are covered',
      ),
      gap: expect.stringContaining(
        'outside the BattleMech combat runtime validation matrix',
      ),
    });
    expect(
      outOfScopeRows.find(
        (row) =>
          row.ref ===
          'ruleSupport.physicalDamageModifiers.talon-equipment-lifecycle',
      ),
    ).toMatchObject({
      evidence: expect.stringContaining(
        'Represented runtime talon lifecycle paths are covered',
      ),
      gap: expect.stringContaining(
        'outside the BattleMech combat runtime validation matrix',
      ),
    });
    expect(
      outOfScopeRefs.filter((ref) =>
        ref.startsWith('lifecycleAndPsr.psrTriggers.'),
      ),
    ).toEqual([
      'lifecycleAndPsr.psrTriggers.charge_miss',
      'lifecycleAndPsr.psrTriggers.dfa_miss',
    ]);
    expect(
      outOfScopeRefs.filter((ref) =>
        ref.startsWith('pilotSkills.pilotModifierResolvers.'),
      ),
    ).toEqual([
      'pilotSkills.pilotModifierResolvers.aerospace-maneuvering-ace-movement-application',
      'pilotSkills.pilotModifierResolvers.anti-mek-actuator-application',
      'pilotSkills.pilotModifierResolvers.campaign-maintenance-application',
      'pilotSkills.pilotModifierResolvers.critical-prevention-application',
      'pilotSkills.pilotModifierResolvers.legacy-defensive-quirk-to-hit-application',
      'pilotSkills.pilotModifierResolvers.low-arms-application',
      'pilotSkills.pilotModifierResolvers.maneuvering-ace-out-of-control-producer-application',
      'pilotSkills.pilotModifierResolvers.target-priority-application',
      'pilotSkills.pilotModifierResolvers.vehicle-movement-application',
    ]);
    expect(outOfScopeRefs).toContain(
      'pilotSkills.pilotModifierResolvers.vehicle-movement-application',
    );
    expect(outOfScopeRefs).toContain(
      'pilotSkills.pilotModifierResolvers.aerospace-maneuvering-ace-movement-application',
    );
    expect(
      outOfScopeRows.find(
        (row) =>
          row.ref ===
          'pilotSkills.pilotModifierResolvers.aerospace-maneuvering-ace-movement-application',
      ),
    ).toMatchObject({
      level: 'out-of-scope',
      evidence: expect.stringContaining('aerospace maneuver-thrust relief'),
      gap: expect.stringContaining('separate aerospace movement matrix'),
    });
    expect(outOfScopeRefs).toContain(
      'pilotSkills.pilotModifierResolvers.critical-prevention-application',
    );
    expect(outOfScopeRefs).not.toContain(
      'pilotSkills.pilotModifierResolvers.movement-application',
    );
    expect(
      outOfScopeRefs.filter((ref) => ref.startsWith('validationScope.')),
    ).toEqual([
      'validationScope.knownLimitationsAndScope.non-battlemech-ammo-scope',
      'validationScope.knownLimitationsAndScope.non-battlemech-combat-system-split',
      'validationScope.objectiveRequirements.campaign-quirk-behavior',
      'validationScope.objectiveRequirements.non-battlemech-scope',
      'validationScope.objectiveRequirements.physical-weapon-actions',
    ]);
    expect(
      outOfScopeRefs.filter((ref) =>
        ref.startsWith('actions.gmCommandExclusions.'),
      ),
    ).toEqual([
      'actions.gmCommandExclusions.gm.advance-phase',
      'actions.gmCommandExclusions.gm.grant-resource',
      'actions.gmCommandExclusions.gm.set-damage',
    ]);
    expect(
      outOfScopeRefs.filter((ref) =>
        ref.startsWith('actions.tacticalCommands.'),
      ),
    ).toEqual([
      'actions.tacticalCommands.movement.cancel',
      'actions.tacticalCommands.movement.stabilize',
      'actions.tacticalCommands.utility.withdraw',
      'actions.tacticalCommands.weapon.clear-attacks',
      'actions.tacticalCommands.weapon.declare-attack',
    ]);
    expect(
      outOfScopeRefs.filter((ref) => ref.startsWith('actions.wireIntents.')),
    ).toEqual([
      'actions.wireIntents.ForfeitMatch',
      'actions.wireIntents.LaunchMatch',
      'actions.wireIntents.LeaveSeat',
      'actions.wireIntents.MarkSeatAi',
      'actions.wireIntents.OccupySeat',
      'actions.wireIntents.ReassignSeat',
      'actions.wireIntents.SetAiSlot',
      'actions.wireIntents.SetHumanSlot',
      'actions.wireIntents.SetReady',
    ]);
    expect(
      outOfScopeRows.filter(
        (row) =>
          row.level !== 'out-of-scope' ||
          row.gap.length === 0 ||
          row.evidence.length === 0 ||
          row.sourceRefs.length === 0,
      ),
    ).toEqual([]);
  });

  it('exposes the unresolved inventory through combat validation tooling', () => {
    const packageJson = JSON.parse(
      readFileSync(join(process.cwd(), 'package.json'), 'utf8'),
    ) as { readonly scripts?: Record<string, string> };
    const validateCombatSuite = readFileSync(
      join(process.cwd(), 'scripts', 'validate-combat-suite.mjs'),
      'utf8',
    );

    expect(packageJson.scripts?.['validate:combat:gaps']).toBe(
      'npx tsx scripts/print-combat-validation-gaps.ts',
    );
    expect(validateCombatSuite).toContain('print-combat-validation-gaps.ts');
    expect(validateCombatSuite).toContain('--format=summary');
    expect(validateCombatSuite).toContain('--format=markdown');
    expect(validateCombatSuite).toContain(
      'Assert reviewer-readable unresolved leaf gap report',
    );
    expect(validateCombatSuite).toContain('--expect-total=0');
    expect(validateCombatSuite).toContain('--expect-total=140');
    expect(validateCombatSuite).toContain('--expect-level=helper-only:0');
    expect(validateCombatSuite).toContain('--expect-level=unsupported:0');
    expect(validateCombatSuite).toContain('--expect-scope=aggregate:0');
    expect(validateCombatSuite).toContain('--expect-scope=leaf:0');
    expect(validateCombatSuite).toContain('--expect-section=damageAndDeath:0');
    expect(validateCombatSuite).toContain('--expect-section=damageAndDeath:6');
    expect(validateCombatSuite).toContain('--expect-section=featureSupport:0');
    expect(validateCombatSuite).toContain('--expect-section=ruleSupport:0');
    expect(validateCombatSuite).toContain('--expect-section=ruleSupport:6');
    expect(validateCombatSuite).toContain('--expect-section=validationScope:0');
    expect(validateCombatSuite).toContain('--expect-section=validationScope:5');
    const gapInventoryScript = readFileSync(
      join(process.cwd(), 'scripts', 'print-combat-validation-gaps.ts'),
      'utf8',
    );
    expect(gapInventoryScript).toContain('getCombatValidationOutOfScopeRows');
    expect(gapInventoryScript).toContain("'markdown'");
    expect(gapInventoryScript).toContain(
      '# BattleMech Combat Validation Gap Inventory',
    );
    expect(gapInventoryScript).toContain('Evidence:');
    expect(gapInventoryScript).toContain('Gap:');

    const triadTestFiles = Array.from(
      new Set(
        Object.values(triadEvidenceMaps()).flatMap((section) =>
          Object.values(section).flatMap((triad) =>
            triad.testRefs.map((testRef) => testRef.file),
          ),
        ),
      ),
    ).sort();
    expect(
      triadTestFiles.filter(
        (testFile) => !validateCombatSuite.includes(`'${testFile}'`),
      ),
    ).toEqual([]);
  });

  it('accepts space-separated gap inventory CLI flags for reviewer hand checks', () => {
    const command = process.platform === 'win32' ? 'npx.cmd' : 'npx';
    const result = spawnSync(
      command,
      [
        'tsx',
        'scripts/print-combat-validation-gaps.ts',
        '--format',
        'refs',
        '--scope',
        'leaf',
        '--expect-total',
        '0',
        '--expect-no-ref',
        'featureSupport.specialWeaponMechanics.artemis-ambiguous-fcs-allocation-authoring',
        '--expect-no-ref',
        'ruleSupport.terrainEnvironment.terrain-los-tacops-diagram-industrial-zone-side-paths',
        '--expect-no-ref',
        'ruleSupport.terrainEnvironment.terrain-los-tacops-diagram-planted-field-side-paths',
        '--expect-no-ref',
        'ruleSupport.terrainEnvironment.terrain-los-tacops-diagram-elevation-side-paths',
        '--expect-no-ref',
        'ruleSupport.terrainEnvironment.terrain-los-tacops-diagram-combat-caller-option-propagation',
        '--expect-no-ref',
        'ruleSupport.terrainEnvironment.terrain-los-underwater-depth-height-side-paths',
        '--expect-no-ref',
        'ruleSupport.terrainEnvironment.terrain-los-dropship-special-building-handling',
        '--expect-no-ref',
        'ruleSupport.terrainEnvironment.terrain-los-grounded-dropship-cover-providers',
        '--expect-no-ref',
        'ruleSupport.terrainEnvironment.terrain-los-fuel-tank-damageable-cover-providers',
        '--expect-no-ref',
        'ruleSupport.terrainEnvironment.terrain-los-fuel-tank-elevation',
        '--expect-no-ref',
        'ruleSupport.terrainEnvironment.terrain-los-hard-soft-building-cover-providers',
        '--expect-no-ref',
        'ruleSupport.terrainEnvironment.terrain-los-damageable-cover-hit-resolution-routing',
        '--expect-no-ref',
        'ruleSupport.terrainEnvironment.terrain-los-building-level-residual-cases',
        '--expect-no-ref',
        'ruleSupport.terrainEnvironment.minefield-active-non-ground-triggers',
        '--expect-no-ref',
        'ruleSupport.terrainEnvironment.minefield-emp-effects',
        '--expect-no-ref',
        'ruleSupport.terrainEnvironment.minefield-inferno-residual-controls',
        '--expect-no-ref',
        'ruleSupport.terrainEnvironment.minefield-non-conventional-type-semantics',
        '--expect-no-ref',
        'ruleSupport.terrainEnvironment.minefield-hidden-reveal-detection',
        '--expect-no-ref',
        'ruleSupport.terrainEnvironment.minefield-clearing-sweeper-collateral-reset',
        '--expect-no-ref',
        'ruleSupport.terrainEnvironment.terrain-los-side-paths',
        '--expect-no-ref',
        'featureSupport.specialWeaponMechanics.artemis-link-network-lifecycle',
        '--expect-no-ref',
        'featureSupport.specialWeaponMechanics.artemis-stealth-mode-damage-lifecycle',
        '--expect-no-ref',
        'featureSupport.specialWeaponMechanics.inarc-pod-object-lifecycle',
      ],
      {
        cwd: process.cwd(),
        encoding: 'utf8',
        shell: process.platform === 'win32',
      },
    );

    expect(result.error).toBeUndefined();
    expect(result.status).toBe(0);
    expect(result.stderr).toBe('');
    expect(result.stdout.split(/\r?\n/).filter(Boolean)).toHaveLength(0);
  });

  it('rejects unknown gap inventory CLI flags instead of silently weakening gates', () => {
    const command = process.platform === 'win32' ? 'npx.cmd' : 'npx';
    const result = spawnSync(
      command,
      [
        'tsx',
        'scripts/print-combat-validation-gaps.ts',
        '--format',
        'summary',
        '--expect-totla',
        '17',
      ],
      {
        cwd: process.cwd(),
        encoding: 'utf8',
        shell: process.platform === 'win32',
      },
    );

    expect(result.error).toBeUndefined();
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('Unknown flag "--expect-totla"');
  });

  it('documents the reviewer-readable unresolved inventory report mode', () => {
    expect(
      BATTLEMECH_VALIDATION_SCOPE_SUPPORT[
        'unresolved-completion-blocker-inventory'
      ].sourceRefs?.map(({ citation }) => citation),
    ).toEqual(
      expect.arrayContaining([
        expect.stringContaining(
          'emits JSON, Markdown, refs, and summary views',
        ),
      ]),
    );
  });

  it('splits non-BattleMech Supercharger side paths out of BattleMech blockers', () => {
    const unresolvedRefs = getCombatValidationUnresolvedRefs();
    const outOfScopeRows = getCombatValidationOutOfScopeRows();

    expect(unresolvedRefs).not.toContain(
      'ruleSupport.movementEnhancements.supercharger-side-paths',
    );
    expect(unresolvedRefs).not.toContain(
      'ruleSupport.movementEnhancements.supercharger-non-battlemech-side-paths',
    );
    expect(
      outOfScopeRows.find(
        (row) =>
          row.ref ===
          'ruleSupport.movementEnhancements.supercharger-non-battlemech-side-paths',
      ),
    ).toMatchObject({
      level: 'out-of-scope',
      evidence:
        'MegaMek Supercharger has explicit Tank, SupportTank, SupportVTOL, and non-Mek failure-damage branches, but this catalog is scoped to BattleMech combat validation',
      gap: 'Non-BattleMech Supercharger support-unit roll adjustment and vehicle motive-damage branches stay outside this BattleMech suite instead of being counted as BattleMech movement-enhancement blockers',
      sourceRefs: expect.arrayContaining([
        expect.objectContaining({
          citation: expect.stringContaining('SupportTank'),
          kind: 'megamek-source',
        }),
        expect.objectContaining({
          citation: expect.stringContaining('non-Mek Supercharger failure'),
          kind: 'megamek-source',
        }),
      ]),
    });
  });

  it('keeps MASC and Supercharger side-path coverage bounded to represented BattleMech behavior', () => {
    const unresolvedRefs = getCombatValidationUnresolvedRefs();
    const movementEnhancementRows =
      BATTLEMECH_COMBAT_VALIDATION_CATALOG.ruleSupport.movementEnhancements;
    const representedRefs = [
      'ruleSupport.movementEnhancements.MASC',
      'ruleSupport.movementEnhancements.masc-battlemech-represented-side-paths',
      'ruleSupport.movementEnhancements.masc-side-paths',
      'ruleSupport.movementEnhancements.Supercharger',
      'ruleSupport.movementEnhancements.supercharger-battlemech-represented-side-paths',
      'ruleSupport.movementEnhancements.supercharger-side-paths',
    ];

    expect(unresolvedRefs).toEqual(expect.not.arrayContaining(representedRefs));
    expect(
      [
        movementEnhancementRows['masc-side-paths'],
        movementEnhancementRows['supercharger-side-paths'],
      ].map((row) => ({
        id: row.id,
        level: row.level,
        evidence: row.evidence,
        gap: row.gap,
      })),
    ).toEqual([
      {
        id: 'masc-side-paths',
        level: 'integrated',
        evidence: expect.stringContaining('named MASC failure trigger source'),
        gap: undefined,
      },
      {
        id: 'supercharger-side-paths',
        level: 'integrated',
        evidence: expect.stringContaining(
          'named Supercharger failure trigger source',
        ),
        gap: undefined,
      },
    ]);
    expect(
      movementEnhancementRows['supercharger-non-battlemech-side-paths'],
    ).toMatchObject({
      level: 'out-of-scope',
      gap: expect.stringContaining('outside this BattleMech suite'),
    });
  });

  it('keeps ejection lifecycle coverage closed in the aggregate gap inventory', () => {
    const entryLevels = new Map(
      catalogMaps().flatMap(({ sectionId, mapId, support }) =>
        Object.values(support).map((entry) => [
          `${sectionId}.${mapId}.${entry.id}`,
          entry.level,
        ]),
      ),
    );

    expect(
      CLOSED_EJECTION_COVERAGE_REFS.filter(
        (ref) => entryLevels.get(ref) !== 'integrated',
      ),
    ).toEqual([]);
    expect(
      getCombatValidationUnresolvedRefs().filter((ref) => /eject/i.test(ref)),
    ).toEqual([]);
  });

  it('requires every catalog map to declare source-boundary and executable test evidence', () => {
    const triadMaps = triadEvidenceMaps();

    expect(sortedKeys(triadMaps)).toEqual(
      sortedKeys(BATTLEMECH_COMBAT_VALIDATION_CATALOG),
    );

    const catalogSections: Readonly<
      Record<string, CombatValidationCatalogSection>
    > = BATTLEMECH_COMBAT_VALIDATION_CATALOG;
    const sectionKeyFailures = Object.entries(catalogSections).flatMap(
      ([sectionId, section]) => {
        const triadSection = triadMaps[sectionId];

        return sortedKeys(triadSection ?? {}).join('|') ===
          sortedKeys(section).join('|')
          ? []
          : [
              `${sectionId}: expected ${sortedKeys(section).join(', ')}, got ${sortedKeys(triadSection ?? {}).join(', ')}`,
            ];
      },
    );

    const evidenceFailures = catalogMaps().flatMap(
      ({ sectionId, mapId, support }) => {
        const triad = triadMaps[sectionId]?.[mapId];
        if (triad === undefined)
          return [`${sectionId}.${mapId}: missing triad`];

        const supportEntries = Object.values(support);
        const hasIntegratedRows = supportEntries.some(
          (entry) => entry.level === 'integrated',
        );
        const refPrefix = `${sectionId}.${mapId}`;
        const failures: string[] = [];

        if (triad.authorityBoundary.rationale.trim().length === 0) {
          failures.push(`${refPrefix}: missing authority boundary rationale`);
        }

        if (hasIntegratedRows && triad.testRefs.length === 0) {
          failures.push(`${refPrefix}: missing executable test refs`);
        }

        triad.testRefs.forEach((testRef, testIndex) => {
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

        if (triad.authorityBoundary.kind === 'entry-source-refs') {
          for (const entry of supportEntries) {
            const sourceRefs = entry.sourceRefs ?? [];

            if (sourceRefs.length === 0) {
              failures.push(
                `${refPrefix}.${entry.id}: entry-source-refs boundary requires row sourceRefs`,
              );
            }

            sourceRefs.forEach((sourceRef, sourceRefIndex) => {
              const sourceRefId = `${refPrefix}.${entry.id}.sourceRefs[${sourceRefIndex}]`;

              if (!VALID_SOURCE_KINDS.has(sourceRef.kind)) {
                failures.push(
                  `${sourceRefId}: invalid source kind ${sourceRef.kind}`,
                );
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
              if (sourceRef.kind === 'mekstation-deviation') {
                const localAnchor = parseLocalSourceAnchor(sourceRef.url);
                if (!localAnchor) {
                  failures.push(
                    `${sourceRefId}: MekStation deviation ref must use a local src/ path with line anchors`,
                  );
                } else if (!existsSync(join(process.cwd(), localAnchor.file))) {
                  failures.push(
                    `${sourceRefId}: MekStation deviation file does not exist ${localAnchor.file}`,
                  );
                } else {
                  const lineCount = fileLineCount(localAnchor.file);
                  if (
                    localAnchor.startLine < 1 ||
                    localAnchor.endLine < localAnchor.startLine ||
                    localAnchor.endLine > lineCount
                  ) {
                    failures.push(
                      `${sourceRefId}: MekStation deviation line range ${localAnchor.startLine}-${localAnchor.endLine} exceeds ${localAnchor.file} line count ${lineCount}`,
                    );
                  }
                }
              }
              if (
                sourceRef.kind === 'rulebook' &&
                !sourceRef.url.includes('battletech.com/')
              ) {
                failures.push(`${sourceRefId}: rulebook ref is not official`);
              }
            });
          }
        }

        return failures;
      },
    );

    expect([...sectionKeyFailures, ...evidenceFailures]).toEqual([]);
  });

  it('keeps source-pinned action, quirk, PSR trigger, pilot, resolver, and damage catalogs on row-level authority', () => {
    const triadMaps = triadEvidenceMaps();

    expect(triadMaps.actions.absentActionSurfaces.authorityBoundary.kind).toBe(
      'entry-source-refs',
    );
    expect(triadMaps.actions.gmCommandExclusions.authorityBoundary.kind).toBe(
      'entry-source-refs',
    );
    expect(
      triadMaps.validationScope.objectiveRequirements.authorityBoundary.kind,
    ).toBe('entry-source-refs');
    expect(triadMaps.featureSupport.mechQuirks.authorityBoundary.kind).toBe(
      'entry-source-refs',
    );
    expect(triadMaps.lifecycleAndPsr.psrTriggers.authorityBoundary.kind).toBe(
      'entry-source-refs',
    );
    expect(
      triadMaps.pilotSkills.pilotModifierResolvers.authorityBoundary.kind,
    ).toBe('entry-source-refs');
    expect(triadMaps.pilotSkills.pilotSkillUse.authorityBoundary.kind).toBe(
      'entry-source-refs',
    );
    expect(
      triadMaps.damageAndDeath.damageResolution.authorityBoundary.kind,
    ).toBe('entry-source-refs');
    expect(triadMaps.damageAndDeath.pilotDamage.authorityBoundary.kind).toBe(
      'entry-source-refs',
    );
    expect(
      triadMaps.damageAndDeath.destructionCauses.authorityBoundary.kind,
    ).toBe('entry-source-refs');
  });

  it('keeps representative must-cover requirements discoverable from the aggregate catalog', () => {
    const allIds = new Set(
      catalogMaps().flatMap(({ support }) => supportIds(support)),
    );

    expect(Array.from(allIds).sort()).toEqual(
      expect.arrayContaining([
        'movement.walk',
        'movement.run',
        'movement.jump',
        'movement.stand',
        'movement.carefulStand',
        'movement.hullDown',
        'movement.goProne',
        'movement.evade',
        'movement.sprint',
        'movement.activate-masc',
        'movement.activate-supercharger',
        'weapon.fire-volley',
        'attack_declared',
        'attack_invalid',
        'physical_attack_resolved',
        'unit_ejected',
        'motive_damaged',
        'physical.charge',
        'physical.push',
        'physical.thrash',
        'physical.trip',
        'shared.displacement-elevation-cap',
        'shared.displacement-prohibited-terrain',
        'shared.displacement-overgrown-terrain',
        'push.destination-open',
        'push.attacker-is-mek',
        'push.target-is-mek',
        'push.both-arms-present',
        'push.target-directly-ahead',
        'push.no-arm-weapons-fired',
        'utility.withdraw-control',
        'physical.sword',
        'physical.mace',
        'physical.lance',
        'physical.retractable-blade',
        'charge.requires-run',
        'charge.no-jump-movement',
        'charge.no-backward-movement',
        'charge.attacker-not-prone',
        'charge.target-mek-standing',
        'dfa.requires-jump',
        'dfa.no-mechanical-jump-booster',
        'dfa.target-not-dropship',
        'dfa.target-not-inside-building',
        'confirmHeat',
        'OutOfRange',
        'no-heat-spent',
        'battlemech-compatible-ammo',
        'battlemech-ammo-missing-compatible-weapon-refs',
        'unsupported-rotary-ac-10-20-ammo',
        'ultra-ac',
        'mml',
        'mml-variable-damage',
        'mml-srm-lrm-ammo-compatibility',
        'ams-interception-events',
        'ams-single-missile-parity',
        'tag-intent-wire-state-replay',
        'gunnery',
        'terrain-movement-costs',
        'MASC',
        'masc-battlemech-represented-side-paths',
        'masc-side-paths',
        'Supercharger',
        'supercharger-battlemech-represented-side-paths',
        'supercharger-side-paths',
        'go-prone-hull-down-zero-mp-transition',
        'Triple-Strength Myomer',
        'Partial Wing',
        'tsm',
        'underwater',
        'weapon-heat',
        'armor-damage',
        'heat_sink',
        'jump_jet',
        'weapon',
        'ammo',
        'equipment-generic-destroyed-name-replay',
        'equipment-physical-modifiers',
        'equipment-partial-wing',
        'equipment-active-probe',
        'equipment-stealth-linked-ecm',
        'equipment',
        'pilot-death',
        'ejection-damage-preservation',
        'physical-displacement-grid-occupancy',
        'phase-psr-queue-lifecycle',
        'ranged-gunnery-to-hit',
        'ranged-to-hit-calculation',
        'ranged-to-hit-state-hydration',
        'c3-equipment-network-formation',
        'psr-spa-application',
        'rugged_1',
        'campaign-quirk-behavior',
        'protected_actuators',
        'critical-prevention-application',
        'anti-mek-actuator-application',
        'campaign-maintenance-application',
        'known-limitation-bypass',
        'static-weapon-database-subset',
        'synthetic-medium-laser-fallback-ban',
        'variable-damage-string-guard',
        'official-ranged-weapons',
        'spa-quirk-resolver-application',
        'forward_observer',
        'oblique_artillery',
        'non-battlemech-combat-system-split',
        'smoke',
        'rubble',
        'fire',
      ]),
    );
  });
});
