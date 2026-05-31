import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import type {
  CombatValidationCatalogSection,
  CombatValidationSupportMap,
} from '../CombatValidationCatalog';
import type { ICombatCatalogTriadEvidence } from '../CombatValidationCatalogTriad';

import { BATTLEMECH_COMBAT_VALIDATION_CATALOG } from '../CombatValidationCatalog';
import { COMBAT_CATALOG_TRIAD_EVIDENCE } from '../CombatValidationCatalogTriad';
import {
  getCombatValidationOutOfScopeRefs,
  getCombatValidationOutOfScopeRows,
  getCombatValidationUnresolvedRefs,
  getCombatValidationUnresolvedRows,
} from '../CombatValidationGapInventory';

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

  it('keeps unresolved helper and unsupported rows visible as completion blockers', () => {
    const unresolvedRows = getCombatValidationUnresolvedRows();
    const unresolvedRefs = getCombatValidationUnresolvedRefs();

    expect(unresolvedRefs.length).toBeGreaterThan(0);
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
      total: 129,
      byLevel: {
        'helper-only': 112,
        unsupported: 17,
      },
      bySection: {
        actions: 4,
        damageAndDeath: 2,
        featureSupport: 73,
        lifecycleAndPsr: 3,
        pilotSkills: 17,
        ruleSupport: 13,
        validationScope: 17,
      },
    });
    expect(unresolvedRefs).toEqual(
      expect.arrayContaining([
        'featureSupport.ammunitionCompatibility.battlemech-ammo-missing-compatible-weapon-refs',
        'featureSupport.ammunitionCompatibility.nonstandard-empty-compatible-row',
        'pilotSkills.pilotModifierResolvers.edge-application',
        'ruleSupport.movementEnhancements.masc-side-paths',
        'ruleSupport.movementEnhancements.supercharger-side-paths',
        'ruleSupport.movementRules.go-prone-side-paths',
        'ruleSupport.physicalDamageModifiers.claw-equipment-lifecycle',
        'ruleSupport.physicalDamageModifiers.talon-equipment-lifecycle',
        'ruleSupport.terrainEnvironment.terrain-los-side-paths',
      ]),
    );
    expect(unresolvedRefs).not.toContain(
      'actions.absentActionSurfaces.movement.sprint',
    );
    expect(unresolvedRefs).not.toContain(
      'ruleSupport.movementEnhancements.MASC',
    );
    expect(unresolvedRefs).not.toContain(
      'ruleSupport.movementEnhancements.Supercharger',
    );
    expect(unresolvedRefs).not.toContain(
      'ruleSupport.physicalDamageModifiers.claws',
    );
    expect(unresolvedRefs).not.toContain(
      'ruleSupport.physicalDamageModifiers.talons',
    );
    expect(unresolvedRefs).not.toContain(
      'featureSupport.physicalWeapons.claws',
    );
    expect(unresolvedRefs).not.toContain(
      'featureSupport.physicalWeapons.talons',
    );
    expect(unresolvedRefs).not.toContain(
      'validationScope.objectiveRequirements.official-physical-weapons',
    );
    expect(unresolvedRefs).not.toContain(
      'featureSupport.mechQuirks.command_mech',
    );
    expect(unresolvedRefs).not.toContain(
      'featureSupport.mechQuirks.battle_computer',
    );
    expect(unresolvedRefs).not.toContain(
      'featureSupport.specialWeaponFamilies.narc',
    );
    expect(unresolvedRefs).toContain(
      'featureSupport.specialWeaponMechanics.inarc-pod-variants',
    );
    expect(unresolvedRefs).not.toContain('ruleSupport.movementRules.prone');
    expect(unresolvedRefs).not.toContain(
      'actions.absentActionSurfaces.movement.evade',
    );
    expect(unresolvedRefs).not.toContain(
      'featureSupport.canonicalPilotAbilityScope.edge_when_masc_fails',
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
    expect(unresolvedRefs).not.toContain(
      'pilotSkills.pilotModifierResolvers.anti-mek-actuator-application',
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
    const unsupportedRefs = unresolvedRows
      .filter((row) => row.level === 'unsupported')
      .map((row) => row.ref);
    expect(unsupportedRefs).not.toContain(
      'featureSupport.canonicalPilotAbilityScope.hvy_lifter',
    );
    expect(unsupportedRefs).not.toContain(
      'featureSupport.pilotAbilities.heavy-lifter',
    );
    expect(
      unresolvedRows.find(
        (row) =>
          row.ref === 'featureSupport.canonicalPilotAbilityScope.hvy_lifter',
      )?.level,
    ).toBe('helper-only');
    expect(
      unresolvedRows.find(
        (row) => row.ref === 'featureSupport.pilotAbilities.heavy-lifter',
      )?.level,
    ).toBe('helper-only');
    expect(unresolvedRefs).not.toContain(
      'ruleSupport.terrainTypeLos.light_woods',
    );
    expect(unresolvedRefs).not.toContain('ruleSupport.terrainTypeLos.smoke');
    expect(unresolvedRefs).not.toContain(
      'ruleSupport.terrainEnvironment.terrain-los-blocking',
    );
    expect(
      unresolvedRefs.filter((ref) =>
        ref.startsWith('eventStream.nonBattleMechEventScope.'),
      ),
    ).toEqual([]);
    expect(unsupportedRefs).not.toContain(
      'pilotSkills.pilotModifierResolvers.multi-target-penalty-application',
    );
    expect(
      unresolvedRows.find(
        (row) =>
          row.ref ===
          'pilotSkills.pilotModifierResolvers.multi-target-penalty-application',
      )?.level,
    ).toBe('helper-only');
    expect(unresolvedRefs).toContain(
      'featureSupport.pilotAbilities.multi-target',
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
      'actions.physicalActionClassScope.trip',
    );
    expect(unresolvedRefs).not.toContain(
      'actions.physicalActionClassScope.thrash',
    );
    expect(
      unresolvedRows.find(
        (row) => row.ref === 'actions.physicalActionClassScope.brush-off',
      )?.level,
    ).toBe('helper-only');
    expect(
      unresolvedRows.find(
        (row) => row.ref === 'actions.physicalActionClassScope.break-grapple',
      )?.level,
    ).toBe('helper-only');
    expect(
      unresolvedRows.find(
        (row) => row.ref === 'actions.physicalActionClassScope.jump-jet-attack',
      )?.level,
    ).toBe('helper-only');
    expect(
      unresolvedRows.find(
        (row) => row.ref === 'actions.physicalActionClassScope.grapple',
      )?.level,
    ).toBe('helper-only');
  });

  it('keeps non-BattleMech scope rows auditable without making them BattleMech blockers', () => {
    const outOfScopeRows = getCombatValidationOutOfScopeRows();
    const outOfScopeRefs = getCombatValidationOutOfScopeRefs();

    expect(outOfScopeRefs).toEqual(outOfScopeRows.map((row) => row.ref));
    expect(outOfScopeRefs).toEqual(
      expect.arrayContaining([
        'eventStream.nonBattleMechEventScope.leg_attack',
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
        'featureSupport.canonicalPilotAbilityScope.cross_country',
        'featureSupport.canonicalPilotAbilityScope.edge_when_aero_alt_loss',
        'featureSupport.canonicalPilotAbilityScope.foot_cav',
        'featureSupport.canonicalPilotAbilityScope.gunnery_laser',
        'featureSupport.canonicalPilotAbilityScope.weathered',
        'featureSupport.pilotAbilities.cross-country',
        'featureSupport.mechQuirks.rugged_1',
        'featureSupport.mechQuirks.rugged_2',
        'lifecycleAndPsr.psrTriggers.charge_miss',
        'lifecycleAndPsr.psrTriggers.dfa_miss',
        'pilotSkills.pilotModifierResolvers.campaign-maintenance-application',
        'pilotSkills.pilotModifierResolvers.anti-mek-actuator-application',
        'pilotSkills.pilotModifierResolvers.vehicle-movement-application',
        'validationScope.objectiveRequirements.campaign-quirk-behavior',
        'validationScope.knownLimitationsAndScope.non-battlemech-ammo-scope',
        'validationScope.knownLimitationsAndScope.non-battlemech-combat-system-split',
        'validationScope.objectiveRequirements.non-battlemech-scope',
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
    expect(outOfScopeRows).toHaveLength(76);
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
      'featureSupport.ammunitionCompatibility.non-battlemech-aerospace-capital-ammo',
      'featureSupport.ammunitionCompatibility.non-battlemech-battle-armor',
      'featureSupport.ammunitionCompatibility.non-battlemech-protomech',
      'featureSupport.ammunitionCompatibility.unsupported-aquatic-torpedo-ammo',
      'featureSupport.ammunitionCompatibility.unsupported-artillery-ammo',
    ]);
    expect(
      outOfScopeRefs.filter((ref) =>
        ref.startsWith('featureSupport.canonicalPilotAbilityScope.'),
      ),
    ).toEqual([
      'featureSupport.canonicalPilotAbilityScope.allweather',
      'featureSupport.canonicalPilotAbilityScope.blind_fighter',
      'featureSupport.canonicalPilotAbilityScope.clan_pilot_training',
      'featureSupport.canonicalPilotAbilityScope.cluster_master',
      'featureSupport.canonicalPilotAbilityScope.cross_country',
      'featureSupport.canonicalPilotAbilityScope.edge_when_aero_alt_loss',
      'featureSupport.canonicalPilotAbilityScope.edge_when_aero_explosion',
      'featureSupport.canonicalPilotAbilityScope.edge_when_aero_ko',
      'featureSupport.canonicalPilotAbilityScope.edge_when_aero_lucky_crit',
      'featureSupport.canonicalPilotAbilityScope.edge_when_aero_nuke_crit',
      'featureSupport.canonicalPilotAbilityScope.edge_when_aero_unit_cargo_lost',
      'featureSupport.canonicalPilotAbilityScope.ei_implant',
      'featureSupport.canonicalPilotAbilityScope.foot_cav',
      'featureSupport.canonicalPilotAbilityScope.gunnery_ballistic',
      'featureSupport.canonicalPilotAbilityScope.gunnery_laser',
      'featureSupport.canonicalPilotAbilityScope.gunnery_missile',
      'featureSupport.canonicalPilotAbilityScope.sensor_geek',
      'featureSupport.canonicalPilotAbilityScope.small_pilot',
      'featureSupport.canonicalPilotAbilityScope.urban_guerrilla',
      'featureSupport.canonicalPilotAbilityScope.weathered',
    ]);
    expect(
      outOfScopeRefs.filter((ref) =>
        ref.startsWith('featureSupport.mechQuirks.'),
      ),
    ).toEqual([
      'featureSupport.mechQuirks.exposed_actuators',
      'featureSupport.mechQuirks.protected_actuators',
      'featureSupport.mechQuirks.rugged_1',
      'featureSupport.mechQuirks.rugged_2',
    ]);
    expect(
      outOfScopeRefs.filter((ref) =>
        ref.startsWith('featureSupport.pilotAbilities.'),
      ),
    ).toEqual(['featureSupport.pilotAbilities.cross-country']);
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
      'pilotSkills.pilotModifierResolvers.anti-mek-actuator-application',
      'pilotSkills.pilotModifierResolvers.campaign-maintenance-application',
      'pilotSkills.pilotModifierResolvers.vehicle-movement-application',
    ]);
    expect(
      outOfScopeRefs.filter((ref) => ref.startsWith('validationScope.')),
    ).toEqual([
      'validationScope.knownLimitationsAndScope.non-battlemech-ammo-scope',
      'validationScope.knownLimitationsAndScope.non-battlemech-combat-system-split',
      'validationScope.objectiveRequirements.campaign-quirk-behavior',
      'validationScope.objectiveRequirements.non-battlemech-scope',
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
    expect(
      readFileSync(
        join(process.cwd(), 'scripts', 'print-combat-validation-gaps.ts'),
        'utf8',
      ),
    ).toContain('getCombatValidationOutOfScopeRows');

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
        'movement.evade',
        'movement.sprint',
        'movement.activate-masc',
        'movement.activate-supercharger',
        'movement.go-prone',
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
        'masc-side-paths',
        'Supercharger',
        'supercharger-side-paths',
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
        'edge_when_tac',
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
