import type { ICombatFeatureSupportEntry } from '../CombatFeatureSupport';
import type {
  CombatValidationCatalogSection,
  CombatValidationSupportMap,
} from '../CombatValidationCatalog';

import { AMMUNITION_COMPATIBILITY_SUPPORT } from '../CombatAmmunitionSupport';
import {
  ATTACK_INVALIDATION_REASON_SUPPORT,
  ATTACK_INVALIDATION_SIDE_EFFECT_SUPPORT,
  INVALID_TARGET_STATE_SUPPORT,
} from '../CombatAttackInvalidationSupport';
import { CANONICAL_SPA_COMBAT_SCOPE_SUPPORT } from '../CombatCanonicalSpaSupport';
import { CRITICAL_SLOT_EFFECT_COMBAT_SUPPORT } from '../CombatCriticalSlotEffectSupport';
import { CRITICAL_SLOT_HYDRATION_COMBAT_SUPPORT } from '../CombatCriticalSlotHydrationSupport';
import {
  CRITICAL_COMPONENT_COMBAT_SUPPORT,
  DAMAGE_RESOLUTION_COMBAT_SUPPORT,
  DESTRUCTION_CAUSE_COMBAT_SUPPORT,
  PILOT_DAMAGE_COMBAT_SUPPORT,
} from '../CombatDamageSupport';
import {
  BATTLEMECH_COMBAT_EVENT_SUPPORT,
  NON_BATTLEMECH_EVENT_SCOPE_SUPPORT,
} from '../CombatEventSupport';
import {
  QUIRK_COMBAT_SUPPORT,
  SPA_COMBAT_SUPPORT,
} from '../CombatFeatureSupport';
import { COMBAT_INTEGRATION_SCENARIO_SUPPORT } from '../CombatIntegrationSupport';
import {
  ACTION_ELIGIBILITY_COMBAT_SUPPORT,
  PSR_RESOLUTION_COMBAT_SUPPORT,
  RUNNER_PSR_TRIGGER_COMBAT_SUPPORT,
} from '../CombatLifecycleSupport';
import { RUNNER_INTERACTIVE_PARITY_SUPPORT } from '../CombatParitySupport';
import { PHYSICAL_LEGALITY_GATE_SUPPORT } from '../CombatPhysicalLegalityGateSupport';
import { PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT } from '../CombatPilotModifierApplicationSupport';
import { PILOT_SKILL_COMBAT_SUPPORT } from '../CombatPilotSkillSupport';
import {
  HEAT_RULE_COMBAT_SUPPORT,
  MOVEMENT_ENHANCEMENT_COMBAT_SUPPORT,
  MOVEMENT_RULE_COMBAT_SUPPORT,
  RUNNER_RANGE_BRACKET_COMBAT_SUPPORT,
  RUNNER_TO_HIT_MODIFIER_COMBAT_SUPPORT,
  TERRAIN_ENVIRONMENT_COMBAT_SUPPORT,
} from '../CombatRuleSupport';
import {
  TERRAIN_TYPE_ATTACK_MODIFIER_COMBAT_SUPPORT,
  TERRAIN_TYPE_HEAT_COMBAT_SUPPORT,
  TERRAIN_TYPE_LOS_COMBAT_SUPPORT,
  TERRAIN_TYPE_MOVEMENT_COMBAT_SUPPORT,
  TERRAIN_TYPE_PSR_COMBAT_SUPPORT,
} from '../CombatTerrainEnvironmentSupport';
import { BATTLEMECH_COMBAT_VALIDATION_CATALOG } from '../CombatValidationCatalog';
import {
  BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT,
  COMBAT_REQUIREMENT_PRIMARY_AUTHORITIES,
  type ICombatRequirementSupportEntry,
} from '../CombatValidationRequirementSupport';
import { BATTLEMECH_VALIDATION_SCOPE_SUPPORT } from '../CombatValidationScopeSupport';

const EXPECTED_REQUIREMENT_IDS = [
  'attack-invalidation',
  'campaign-quirk-behavior',
  'critical-effects',
  'critical-slot-hydration',
  'damage-resolution',
  'damage-string-hazards',
  'ejection-lifecycle',
  'event-stream',
  'fallback-prevention',
  'heat-dissipation',
  'heat-driven-modifiers',
  'heat-generation',
  'heat-lifecycle',
  'known-limitation-audit',
  'movement-actions',
  'movement-enhancements',
  'movement-validation',
  'non-battlemech-scope',
  'objective-terminal-state',
  'official-ammo',
  'official-physical-weapons',
  'official-ranged-weapons',
  'physical-core-actions',
  'physical-self-risk',
  'physical-weapon-actions',
  'pilot-damage-death',
  'pilot-skills',
  'psr-resolution',
  'psr-trigger-catalog',
  'range-validation',
  'retreat-withdrawal',
  'runner-interactive-parity',
  'spa-quirk-catalog',
  'spa-quirk-resolver-application',
  'special-weapon-families',
  'targetability-lifecycle',
  'terrain-environment-modifiers',
  'terrain-movement-los-cover',
  'to-hit-advanced-modifiers',
  'to-hit-core-modifiers',
  'turn-rotation-removal',
  'weapon-stat-mapping',
] as const;

const VALID_AUTHORITY_KINDS = new Set([
  'rulebook',
  'megamek-source',
  'mekhq-behavior',
  'mekstation-deviation',
]);

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

function resolveSupportRef(
  ref: string,
): ICombatFeatureSupportEntry | undefined {
  const [sectionId, mapId, ...entryParts] = ref.split('.');
  const entryId = entryParts.join('.');
  const catalog: Readonly<Record<string, CombatValidationCatalogSection>> =
    BATTLEMECH_COMBAT_VALIDATION_CATALOG;
  const section = catalog[sectionId];
  const support = section?.[mapId];
  return support?.[entryId];
}

function refsFor(
  support: Record<string, ICombatRequirementSupportEntry>,
): readonly string[] {
  return Object.values(support).flatMap((entry) => [...entry.supportMapRefs]);
}

function supportRefs(
  sectionId: string,
  mapId: string,
  support: Record<string, ICombatFeatureSupportEntry>,
): readonly string[] {
  return Object.keys(support).map((id) => `${sectionId}.${mapId}.${id}`);
}

function sourceBackedFeatureRows(): readonly {
  readonly ref: string;
  readonly entry: ICombatFeatureSupportEntry;
}[] {
  return catalogMaps()
    .filter(({ sectionId }) => sectionId === 'featureSupport')
    .flatMap(({ sectionId, mapId, support }) =>
      Object.entries(support).flatMap(([entryId, entry]) =>
        /source-backed/i.test(entry.evidence)
          ? [{ ref: `${sectionId}.${mapId}.${entryId}`, entry }]
          : [],
      ),
    );
}

function missingRefsForRequirement(
  requirementId: keyof typeof BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT,
  sectionId: string,
  mapId: string,
  support: Record<string, ICombatFeatureSupportEntry>,
): readonly string[] {
  const requirementRefs = new Set(
    BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT[requirementId].supportMapRefs,
  );

  return Object.keys(support)
    .map((id) => `${sectionId}.${mapId}.${id}`)
    .filter((ref) => !requirementRefs.has(ref))
    .sort();
}

function missingRefsAcrossRequirements(
  requirementIds: readonly (keyof typeof BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT)[],
  sectionId: string,
  mapId: string,
  support: Record<string, ICombatFeatureSupportEntry>,
): readonly string[] {
  const requirementRefs = new Set(
    requirementIds.flatMap((requirementId) => [
      ...BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT[requirementId]
        .supportMapRefs,
    ]),
  );

  return Object.keys(support)
    .map((id) => `${sectionId}.${mapId}.${id}`)
    .filter((ref) => !requirementRefs.has(ref))
    .sort();
}

describe('BattleMech combat validation requirement crosswalk', () => {
  it('turns the active goal requirements into an explicit checklist', () => {
    expect(sortedKeys(BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT)).toEqual(
      [...EXPECTED_REQUIREMENT_IDS].sort(),
    );
    expect(supportGaps(BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT)).toEqual([]);
  });

  it('indexes the requirement crosswalk through the aggregate catalog', () => {
    expect(
      BATTLEMECH_COMBAT_VALIDATION_CATALOG.validationScope
        .objectiveRequirements,
    ).toBe(BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT);
  });

  it('points every requirement at existing catalog evidence entries', () => {
    const missingRefs = refsFor(BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT)
      .filter((ref) => resolveSupportRef(ref) === undefined)
      .sort();

    expect(missingRefs).toEqual([]);
  });

  it('requires every requirement to name one primary source authority', () => {
    expect(sortedKeys(COMBAT_REQUIREMENT_PRIMARY_AUTHORITIES)).toEqual(
      sortedKeys(BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT),
    );

    const invalidAuthorities = Object.values(
      BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT,
    ).flatMap((entry) => {
      const { primaryAuthority } = entry;

      return primaryAuthority.citation.length === 0 ||
        primaryAuthority.rationale.length === 0 ||
        !VALID_AUTHORITY_KINDS.has(primaryAuthority.kind)
        ? [entry.id]
        : [];
    });

    expect(invalidAuthorities).toEqual([]);
  });

  it('requires every requirement row to carry row-level source references', () => {
    const missingSourceRefs = Object.values(
      BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT,
    )
      .filter((entry) => (entry.sourceRefs ?? []).length === 0)
      .map((entry) => entry.id)
      .sort();

    expect(missingSourceRefs).toEqual([]);
  });

  it('requires source-backed feature rows to carry pinned authority refs', () => {
    const sourceBackedRows = sourceBackedFeatureRows();

    expect(sourceBackedRows.map(({ ref }) => ref)).toContain(
      'featureSupport.physicalWeapons.lance',
    );
    expect(sourceBackedRows.map(({ ref }) => ref)).toContain(
      'featureSupport.physicalWeapons.retractable-blade',
    );

    const invalidSourceRefs = sourceBackedRows.flatMap(({ ref, entry }) => {
      const sourceRefs = entry.sourceRefs ?? [];
      if (sourceRefs.length === 0) return [`${ref}: missing sourceRefs`];

      return sourceRefs.flatMap((sourceRef, index) => {
        const sourceRefId = `${ref}.sourceRefs[${index}]`;
        const failures: string[] = [];

        if (!VALID_AUTHORITY_KINDS.has(sourceRef.kind)) {
          failures.push(`${sourceRefId}: invalid kind ${sourceRef.kind}`);
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
            !sourceRef.url.includes(sourceRef.sourceVersion))
        ) {
          failures.push(`${sourceRefId}: MegaMek ref is not commit-pinned`);
        }
        if (
          sourceRef.kind === 'rulebook' &&
          !sourceRef.url.includes('battletech.com/')
        ) {
          failures.push(`${sourceRefId}: rulebook ref is not official`);
        }

        return failures;
      });
    });

    expect(invalidSourceRefs).toEqual([]);
  });

  it('pins ejection lifecycle to MegaMek original-unit removal sources', () => {
    const sourceRefs =
      BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['ejection-lifecycle']
        .sourceRefs ?? [];

    expect(sourceRefs).toHaveLength(3);
    expect(sourceRefs.map((sourceRef) => sourceRef.kind)).toEqual([
      'megamek-source',
      'megamek-source',
      'megamek-source',
    ]);
    expect(sourceRefs.map(({ citation }) => citation)).toEqual([
      'MovePathHandler routes manual EJECT movement into ejectEntity handling.',
      'TWGameManager.ejectEntity marks crew ejected, creates the ejected crew entity, destroys the original unit, and removes it with REMOVE_EJECTED for manual ejection.',
      'ServerReportsHelper separates active unit, ejected unit, and ejected crew counts after combat.',
    ]);
    expect(sourceRefs.map(({ sourceVersion }) => sourceVersion)).toEqual([
      '6ca18676725d273f6b96a3fe5bdd9ecda22c2811',
      '6ca18676725d273f6b96a3fe5bdd9ecda22c2811',
      '6ca18676725d273f6b96a3fe5bdd9ecda22c2811',
    ]);
    expect(sourceRefs.map(({ url }) => url)).toEqual([
      'https://github.com/MegaMek/megamek/blob/6ca18676725d273f6b96a3fe5bdd9ecda22c2811/megamek/src/megamek/server/totalWarfare/MovePathHandler.java#L177-L215',
      'https://github.com/MegaMek/megamek/blob/6ca18676725d273f6b96a3fe5bdd9ecda22c2811/megamek/src/megamek/server/totalWarfare/TWGameManager.java#L28991-L29232',
      'https://github.com/MegaMek/megamek/blob/6ca18676725d273f6b96a3fe5bdd9ecda22c2811/megamek/src/megamek/server/ServerReportsHelper.java#L46-L89',
    ]);
  });

  it('separates rules authorities from implementation evidence references', () => {
    expect(
      BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['official-ranged-weapons']
        .primaryAuthority.kind,
    ).toBe('megamek-source');
    expect(
      BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['heat-lifecycle']
        .primaryAuthority.kind,
    ).toBe('rulebook');
    expect(
      BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['known-limitation-audit']
        .primaryAuthority.kind,
    ).toBe('mekstation-deviation');
    expect(
      BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['runner-interactive-parity']
        .primaryAuthority.kind,
    ).toBe('mekstation-deviation');
    expect(
      BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['campaign-quirk-behavior']
        .primaryAuthority.kind,
    ).toBe('mekhq-behavior');
  });

  it('keeps every requirement support reference inside the aggregate catalog index', () => {
    const indexedRefs = new Set(
      catalogMaps().flatMap(({ sectionId, mapId, support }) =>
        Object.keys(support).map(
          (entryId) => `${sectionId}.${mapId}.${entryId}`,
        ),
      ),
    );

    expect(
      refsFor(BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT).filter(
        (ref) => !indexedRefs.has(ref),
      ),
    ).toEqual([]);
  });

  it('backs heat requirements with every heat rule support row', () => {
    expect(
      missingRefsAcrossRequirements(
        ['heat-generation', 'heat-dissipation', 'heat-lifecycle'],
        'ruleSupport',
        'heatRules',
        HEAT_RULE_COMBAT_SUPPORT,
      ),
    ).toEqual([]);
    expect(
      BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['heat-generation']
        .supportMapRefs,
    ).toEqual([
      'ruleSupport.heatRules.weapon-heat',
      'ruleSupport.heatRules.movement-heat',
      'ruleSupport.heatRules.jump-distance-heat',
      'ruleSupport.heatRules.engine-heat',
      'ruleSupport.heatRules.fire-heat',
    ]);
    expect(
      BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['heat-dissipation']
        .supportMapRefs,
    ).toEqual([
      'ruleSupport.heatRules.dissipation',
      'ruleSupport.heatRules.heat-sink-damage',
      'ruleSupport.heatRules.water-cooling',
      'ruleSupport.heatRules.environmental-heat',
    ]);
    expect(
      BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['heat-lifecycle']
        .supportMapRefs,
    ).toEqual([
      'ruleSupport.heatRules.threshold-effects',
      'ruleSupport.heatRules.shutdown-check',
      'ruleSupport.heatRules.auto-shutdown',
      'ruleSupport.heatRules.startup',
      'ruleSupport.heatRules.ammo-explosion-risk',
      'ruleSupport.heatRules.heat-induced-ammo-explosion',
      'ruleSupport.heatRules.pilot-heat-damage',
      'ruleSupport.heatRules.maxtech-pilot-heat-damage',
      'ruleSupport.heatRules.maxtech-heat-critical-damage',
    ]);
  });

  it('keeps heat-driven modifiers separate from core heat lifecycle coverage', () => {
    expect(
      BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['heat-driven-modifiers'],
    ).toMatchObject({
      level: 'helper-only',
      evidence: expect.stringContaining('Some Like It Hot'),
      gap: expect.stringContaining('Cool Under Fire'),
    });
    expect(
      BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['heat-driven-modifiers']
        .supportMapRefs,
    ).toEqual([
      'featureSupport.pilotAbilities.hot-dog',
      'featureSupport.pilotAbilities.some-like-it-hot',
      'featureSupport.pilotAbilities.cool-under-fire',
      'featureSupport.mechQuirks.improved_cooling',
      'featureSupport.mechQuirks.poor_cooling',
      'featureSupport.mechQuirks.no_cooling',
      'pilotSkills.pilotModifierResolvers.heat-application',
    ]);
    expect(
      BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT[
        'heat-driven-modifiers'
      ].supportMapRefs.filter((ref) => resolveSupportRef(ref) === undefined),
    ).toEqual([]);
    expect(
      BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['heat-lifecycle']
        .supportMapRefs,
    ).not.toContain('pilotSkills.pilotModifierResolvers.heat-application');
  });

  it('backs range requirements with every range bracket support row', () => {
    expect(
      missingRefsForRequirement(
        'range-validation',
        'ruleSupport',
        'rangeBrackets',
        RUNNER_RANGE_BRACKET_COMBAT_SUPPORT,
      ),
    ).toEqual([]);
    expect(
      BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['range-validation']
        .supportMapRefs,
    ).toContain('ruleSupport.toHitModifiers.minimum-range');
  });

  it('backs attack invalidation requirements with every invalidation support row', () => {
    expect(
      missingRefsForRequirement(
        'attack-invalidation',
        'invalidation',
        'attackReasons',
        ATTACK_INVALIDATION_REASON_SUPPORT,
      ),
    ).toEqual([]);
    expect(
      missingRefsForRequirement(
        'attack-invalidation',
        'invalidation',
        'invalidTargetStates',
        INVALID_TARGET_STATE_SUPPORT,
      ),
    ).toEqual([]);
    expect(
      missingRefsForRequirement(
        'attack-invalidation',
        'invalidation',
        'invalidAttackSideEffects',
        ATTACK_INVALIDATION_SIDE_EFFECT_SUPPORT,
      ),
    ).toEqual([]);
  });

  it('backs to-hit requirements with every to-hit modifier support row', () => {
    expect(
      missingRefsAcrossRequirements(
        ['to-hit-core-modifiers', 'to-hit-advanced-modifiers'],
        'ruleSupport',
        'toHitModifiers',
        RUNNER_TO_HIT_MODIFIER_COMBAT_SUPPORT,
      ),
    ).toEqual([]);
  });

  it('backs official-ammo claims with every ammunition compatibility support row', () => {
    expect(
      missingRefsForRequirement(
        'official-ammo',
        'featureSupport',
        'ammunitionCompatibility',
        AMMUNITION_COMPATIBILITY_SUPPORT,
      ),
    ).toEqual([]);
  });

  it('backs movement requirements with every movement and movement-enhancement support row', () => {
    expect(
      missingRefsForRequirement(
        'movement-actions',
        'ruleSupport',
        'movementRules',
        MOVEMENT_RULE_COMBAT_SUPPORT,
      ),
    ).toEqual([]);
    expect(
      missingRefsForRequirement(
        'movement-enhancements',
        'ruleSupport',
        'movementEnhancements',
        MOVEMENT_ENHANCEMENT_COMBAT_SUPPORT,
      ),
    ).toEqual([]);
  });

  it('backs terrain requirements with every terrain support row', () => {
    expect(
      missingRefsForRequirement(
        'terrain-movement-los-cover',
        'ruleSupport',
        'terrainTypeMovement',
        TERRAIN_TYPE_MOVEMENT_COMBAT_SUPPORT,
      ),
    ).toEqual([]);
    expect(
      missingRefsForRequirement(
        'terrain-movement-los-cover',
        'ruleSupport',
        'terrainTypeLos',
        TERRAIN_TYPE_LOS_COMBAT_SUPPORT,
      ),
    ).toEqual([]);
    expect(
      missingRefsForRequirement(
        'terrain-environment-modifiers',
        'ruleSupport',
        'terrainEnvironment',
        TERRAIN_ENVIRONMENT_COMBAT_SUPPORT,
      ),
    ).toEqual([]);
    expect(
      missingRefsForRequirement(
        'terrain-environment-modifiers',
        'ruleSupport',
        'terrainTypeAttackModifiers',
        TERRAIN_TYPE_ATTACK_MODIFIER_COMBAT_SUPPORT,
      ),
    ).toEqual([]);
    expect(
      missingRefsForRequirement(
        'terrain-environment-modifiers',
        'ruleSupport',
        'terrainTypeHeat',
        TERRAIN_TYPE_HEAT_COMBAT_SUPPORT,
      ),
    ).toEqual([]);
    expect(
      missingRefsForRequirement(
        'terrain-environment-modifiers',
        'ruleSupport',
        'terrainTypePsr',
        TERRAIN_TYPE_PSR_COMBAT_SUPPORT,
      ),
    ).toEqual([]);
  });

  it('backs pilot skill requirements with every pilot skill support row', () => {
    expect(
      missingRefsForRequirement(
        'pilot-skills',
        'pilotSkills',
        'pilotSkillUse',
        PILOT_SKILL_COMBAT_SUPPORT,
      ),
    ).toEqual([]);
  });

  it('backs SPA and quirk requirements with every support row', () => {
    expect(
      missingRefsForRequirement(
        'spa-quirk-catalog',
        'featureSupport',
        'pilotAbilities',
        SPA_COMBAT_SUPPORT,
      ),
    ).toEqual([]);
    expect(
      missingRefsForRequirement(
        'spa-quirk-catalog',
        'featureSupport',
        'canonicalPilotAbilityScope',
        CANONICAL_SPA_COMBAT_SCOPE_SUPPORT,
      ),
    ).toEqual([]);
    expect(
      missingRefsForRequirement(
        'spa-quirk-catalog',
        'featureSupport',
        'mechQuirks',
        QUIRK_COMBAT_SUPPORT,
      ),
    ).toEqual([]);
    expect(
      missingRefsForRequirement(
        'spa-quirk-resolver-application',
        'pilotSkills',
        'pilotModifierResolvers',
        PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT,
      ),
    ).toEqual([]);
  });

  it('backs damage and death requirements with every damage support row', () => {
    expect(
      BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['damage-resolution'].level,
    ).toBe('integrated');
    expect(
      BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['pilot-damage-death'],
    ).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('ammo-explosion pilot damage'),
    });
    expect(
      missingRefsForRequirement(
        'damage-resolution',
        'damageAndDeath',
        'damageResolution',
        DAMAGE_RESOLUTION_COMBAT_SUPPORT,
      ),
    ).toEqual([]);
    expect(
      missingRefsForRequirement(
        'damage-resolution',
        'damageAndDeath',
        'destructionCauses',
        DESTRUCTION_CAUSE_COMBAT_SUPPORT,
      ),
    ).toEqual([]);
    expect(
      missingRefsForRequirement(
        'pilot-damage-death',
        'damageAndDeath',
        'pilotDamage',
        PILOT_DAMAGE_COMBAT_SUPPORT,
      ),
    ).toEqual([]);
  });

  it('backs critical-effect requirements with every critical support row', () => {
    expect(
      missingRefsForRequirement(
        'critical-effects',
        'damageAndDeath',
        'criticalComponents',
        CRITICAL_COMPONENT_COMBAT_SUPPORT,
      ),
    ).toEqual([]);
    expect(
      missingRefsForRequirement(
        'critical-effects',
        'damageAndDeath',
        'criticalSlotEffects',
        CRITICAL_SLOT_EFFECT_COMBAT_SUPPORT,
      ),
    ).toEqual([]);
    expect(
      missingRefsForRequirement(
        'critical-slot-hydration',
        'damageAndDeath',
        'criticalSlotHydration',
        CRITICAL_SLOT_HYDRATION_COMBAT_SUPPORT,
      ),
    ).toEqual([]);
  });

  it('backs PSR requirements with every PSR support row', () => {
    expect(
      missingRefsForRequirement(
        'psr-resolution',
        'lifecycleAndPsr',
        'psrResolution',
        PSR_RESOLUTION_COMBAT_SUPPORT,
      ),
    ).toEqual([]);
    expect(
      missingRefsForRequirement(
        'psr-trigger-catalog',
        'lifecycleAndPsr',
        'psrTriggers',
        RUNNER_PSR_TRIGGER_COMBAT_SUPPORT,
      ),
    ).toEqual([]);
  });

  it('backs lifecycle requirements with every action-eligibility support row', () => {
    expect(
      missingRefsAcrossRequirements(
        [
          'turn-rotation-removal',
          'targetability-lifecycle',
          'ejection-lifecycle',
          'retreat-withdrawal',
          'objective-terminal-state',
        ],
        'lifecycleAndPsr',
        'actionEligibility',
        ACTION_ELIGIBILITY_COMBAT_SUPPORT,
      ),
    ).toEqual([]);
  });

  it('backs lifecycle, PSR, objective, and parity claims with every representative scenario row', () => {
    expect(
      missingRefsAcrossRequirements(
        [
          'turn-rotation-removal',
          'targetability-lifecycle',
          'ejection-lifecycle',
          'psr-resolution',
          'objective-terminal-state',
          'runner-interactive-parity',
        ],
        'parityAndIntegration',
        'representativeScenarios',
        COMBAT_INTEGRATION_SCENARIO_SUPPORT,
      ),
    ).toEqual([]);
  });

  it('backs runner-interactive parity claims with every parity support row', () => {
    expect(
      missingRefsForRequirement(
        'runner-interactive-parity',
        'parityAndIntegration',
        'runnerInteractiveParity',
        RUNNER_INTERACTIVE_PARITY_SUPPORT,
      ),
    ).toEqual([]);
    expect(
      BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['runner-interactive-parity']
        .supportMapRefs,
    ).toEqual([
      ...supportRefs(
        'parityAndIntegration',
        'runnerInteractiveParity',
        RUNNER_INTERACTIVE_PARITY_SUPPORT,
      ),
      'parityAndIntegration.representativeScenarios.runner-terminal-game-ended-event',
    ]);
  });

  it('backs event-stream scope with every BattleMech and non-BattleMech event row', () => {
    expect(
      missingRefsForRequirement(
        'event-stream',
        'eventStream',
        'battleMechCombatEvents',
        BATTLEMECH_COMBAT_EVENT_SUPPORT,
      ),
    ).toEqual([]);
    expect(
      missingRefsForRequirement(
        'event-stream',
        'eventStream',
        'nonBattleMechEventScope',
        NON_BATTLEMECH_EVENT_SCOPE_SUPPORT,
      ),
    ).toEqual([]);
  });

  it('backs validation-scope requirements with every scope support row', () => {
    expect(
      missingRefsAcrossRequirements(
        [
          'official-ranged-weapons',
          'official-physical-weapons',
          'official-ammo',
          'fallback-prevention',
          'damage-string-hazards',
          'known-limitation-audit',
          'non-battlemech-scope',
        ],
        'validationScope',
        'knownLimitationsAndScope',
        BATTLEMECH_VALIDATION_SCOPE_SUPPORT,
      ),
    ).toEqual([]);
  });

  it('backs physical-core claims with every source-checked physical legality gate row', () => {
    const physicalCoreRefs = new Set(
      BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['physical-core-actions']
        .supportMapRefs,
    );
    const missingLegalityGateRefs = Object.keys(
      PHYSICAL_LEGALITY_GATE_SUPPORT,
    ).flatMap((id) => {
      const ref = `ruleSupport.physicalLegalityGates.${id}`;
      return physicalCoreRefs.has(ref) ? [] : [ref];
    });

    expect(missingLegalityGateRefs).toEqual([]);
  });

  it('does not mark requirements integrated when their evidence refs are still gaps', () => {
    const overclaims = Object.values(
      BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT,
    ).flatMap((requirement) =>
      requirement.level === 'integrated'
        ? requirement.supportMapRefs.flatMap((ref) => {
            const support = resolveSupportRef(ref);
            return support && support.level !== 'integrated'
              ? [`${requirement.id} -> ${ref} (${support.level})`]
              : [];
          })
        : [],
    );

    expect(overclaims).toEqual([]);
  });

  it('keeps explicit gap categories visible instead of treating the goal as complete', () => {
    expect(
      BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['official-ammo'].level,
    ).toBe('helper-only');
    expect(
      BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['official-physical-weapons']
        .level,
    ).toBe('integrated');
    expect(
      BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['damage-string-hazards'].level,
    ).toBe('integrated');
    expect(
      BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['heat-lifecycle'].level,
    ).toBe('integrated');
    expect(
      BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['heat-driven-modifiers'].level,
    ).toBe('helper-only');
    expect(
      BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['movement-enhancements'].level,
    ).toBe('helper-only');
    expect(
      BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['terrain-movement-los-cover']
        .level,
    ).toBe('helper-only');
    expect(
      BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['terrain-movement-los-cover']
        .gap,
    ).toContain('LOS parity');
    expect(
      BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['physical-core-actions'].level,
    ).toBe('helper-only');
    expect(
      BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['physical-self-risk'].level,
    ).toBe('helper-only');
    expect(
      BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['physical-self-risk'].evidence,
    ).toContain('occupied-hex domino positional displacement cascades');
    expect(
      BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['physical-self-risk'].evidence,
    ).toContain('DominoEffect PSRs');
    expect(
      BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['physical-self-risk'].evidence,
    ).toContain('DFA-miss friendly occupied displacement avoidance');
    expect(
      BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['physical-self-risk'].evidence,
    ).toContain('runtime-hydrated grounded DropShip radius-two DFA hit');
    expect(
      BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['physical-self-risk'].gap,
    ).not.toContain('Stale grid occupancy');
    expect(
      BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['physical-self-risk'].gap,
    ).toContain('domino step-out');
    expect(
      BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['physical-self-risk'].gap,
    ).not.toContain('runtime grounded DropShip');
    expect(
      BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['physical-self-risk'].gap,
    ).not.toContain('friendly-unit displacement avoidance');
    expect(
      BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['physical-self-risk']
        .supportMapRefs,
    ).toEqual(
      expect.arrayContaining([
        'lifecycleAndPsr.psrTriggers.domino_effect',
        'ruleSupport.physicalLegalityGates.shared.displacement-domino-chain',
        'ruleSupport.physicalLegalityGates.shared.displacement-friendly-avoidance',
        'ruleSupport.physicalLegalityGates.shared.displacement-dropship-radius',
      ]),
    );
    expect(
      BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['physical-weapon-actions']
        .level,
    ).toBe('helper-only');
    expect(
      BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT[
        'spa-quirk-resolver-application'
      ].level,
    ).toBe('helper-only');
    expect(
      BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['non-battlemech-scope'].level,
    ).toBe('out-of-scope');
    expect(
      BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['non-battlemech-scope'].gap,
    ).toContain('Non-BattleMech');
    expect(
      BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['campaign-quirk-behavior']
        .level,
    ).toBe('out-of-scope');
    expect(
      BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['campaign-quirk-behavior'].gap,
    ).toContain('outside BattleMech combat runner validation scope');
  });

  it('keeps source-backed movement action support explicit until every optional path exists', () => {
    const evadeRefs =
      BATTLEMECH_COMBAT_VALIDATION_CATALOG.actions.tacticalCommands[
        'movement.evade'
      ].sourceRefs ?? [];
    const sprintRefs =
      BATTLEMECH_COMBAT_VALIDATION_CATALOG.actions.absentActionSurfaces[
        'movement.sprint'
      ].sourceRefs ?? [];
    const torsoTwistActionRefs =
      BATTLEMECH_COMBAT_VALIDATION_CATALOG.actions.tacticalCommands[
        'facing.torso-twist'
      ].sourceRefs ?? [];
    const torsoTwistRuleRefs =
      BATTLEMECH_COMBAT_VALIDATION_CATALOG.ruleSupport.movementRules[
        'torso-twist'
      ].sourceRefs ?? [];

    expect(evadeRefs.map((sourceRef) => sourceRef.citation)).toEqual(
      expect.arrayContaining([
        expect.stringContaining('TacOps Evade'),
        expect.stringContaining('MoveStepType defines EVADE'),
        expect.stringContaining('getEvasionBonus'),
        expect.stringContaining('target evasion bonus'),
        expect.stringContaining('evading attackers from firing'),
      ]),
    );
    expect(sprintRefs.map((sourceRef) => sourceRef.citation)).toEqual(
      expect.arrayContaining([
        expect.stringContaining('MoveStep.canUseSprint'),
        expect.stringContaining('Mek.getSprintMP'),
        expect.stringContaining('Mek.getSprintHeat'),
        expect.stringContaining('attacks by sprinting attackers'),
        expect.stringContaining('target sprinted'),
      ]),
    );
    expect(torsoTwistActionRefs.map((sourceRef) => sourceRef.citation)).toEqual(
      expect.arrayContaining([
        expect.stringContaining('TorsoTwistAction'),
        expect.stringContaining('secondary facing'),
        expect.stringContaining('ComputeArc'),
      ]),
    );
    expect(torsoTwistRuleRefs.map((sourceRef) => sourceRef.citation)).toEqual(
      expect.arrayContaining([
        expect.stringContaining('Entity.setSecondaryFacing'),
        expect.stringContaining('Mek.canChangeSecondaryFacing'),
        expect.stringContaining('Mek.isValidSecondaryFacing'),
      ]),
    );
    expect(
      BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['movement-actions']
        .supportMapRefs,
    ).toContain('actions.tacticalCommands.movement.evade');
    expect(
      BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['movement-actions']
        .supportMapRefs,
    ).not.toContain('actions.absentActionSurfaces.movement.evade');
    expect(
      BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['movement-actions']
        .supportMapRefs,
    ).toContain('actions.absentActionSurfaces.movement.sprint');
    expect(
      BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['movement-actions']
        .supportMapRefs,
    ).toContain('actions.tacticalCommands.facing.torso-twist');
    expect(
      BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['movement-actions']
        .supportMapRefs,
    ).toEqual(
      expect.arrayContaining([
        'actions.gameIntents.torsoTwist',
        'actions.wireIntents.TorsoTwist',
        'actions.p2pIntents.torsoTwist',
      ]),
    );
    expect(
      BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['movement-actions'].gap,
    ).toContain('Sprint action creation remains absent');
    expect(
      BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['movement-actions'].gap,
    ).not.toContain('torso-twist intent/wire/server actions');
    expect(
      BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['to-hit-advanced-modifiers']
        .supportMapRefs,
    ).toContain('actions.tacticalCommands.movement.evade');
    expect(
      BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['to-hit-advanced-modifiers']
        .supportMapRefs,
    ).not.toContain('actions.absentActionSurfaces.movement.evade');
    expect(
      BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['to-hit-advanced-modifiers']
        .evidence,
    ).toContain('ranged and physical to-hit');
    expect(
      BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['to-hit-advanced-modifiers']
        .gap,
    ).not.toContain('physical target evasion');
    expect(
      BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['physical-core-actions']
        .evidence,
    ).toContain('target-evasion physical to-hit');
  });
});
