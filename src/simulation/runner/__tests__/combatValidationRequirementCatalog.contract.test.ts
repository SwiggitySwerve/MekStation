import type { ICombatFeatureSupportEntry } from '../CombatFeatureSupport';
import type {
  CombatValidationCatalogSection,
  CombatValidationSupportMap,
} from '../CombatValidationCatalog';

import { AMMUNITION_COMPATIBILITY_SUPPORT } from '../CombatAmmunitionSupport';
import { CANONICAL_SPA_COMBAT_SCOPE_SUPPORT } from '../CombatCanonicalSpaSupport';
import {
  QUIRK_COMBAT_SUPPORT,
  SPA_COMBAT_SUPPORT,
} from '../CombatFeatureSupport';
import { PHYSICAL_LEGALITY_GATE_SUPPORT } from '../CombatPhysicalLegalityGateSupport';
import { PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT } from '../CombatPilotModifierApplicationSupport';
import { PILOT_SKILL_COMBAT_SUPPORT } from '../CombatPilotSkillSupport';
import {
  HEAT_RULE_COMBAT_SUPPORT,
  MOVEMENT_ENHANCEMENT_COMBAT_SUPPORT,
  MOVEMENT_RULE_COMBAT_SUPPORT,
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

  it('requires source-backed feature rows to carry pinned authority refs', () => {
    const sourceBackedRows = sourceBackedFeatureRows();

    expect(sourceBackedRows.map(({ ref }) => ref)).toContain(
      'featureSupport.physicalWeapons.lance',
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
    ]);
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

  it('backs runner-interactive parity claims with every parity support row', () => {
    expect(
      BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['runner-interactive-parity']
        .supportMapRefs,
    ).toEqual([
      'parityAndIntegration.runnerInteractiveParity.movement-action-eligibility',
      'parityAndIntegration.runnerInteractiveParity.movement-validation',
      'parityAndIntegration.runnerInteractiveParity.movement-heat-and-event-path',
      'parityAndIntegration.runnerInteractiveParity.weapon-target-validation',
      'parityAndIntegration.runnerInteractiveParity.weapon-range-and-to-hit',
      'parityAndIntegration.runnerInteractiveParity.weapon-indirect-fire',
      'parityAndIntegration.runnerInteractiveParity.weapon-damage-critical-events',
      'parityAndIntegration.runnerInteractiveParity.physical-attack-resolution',
      'parityAndIntegration.runnerInteractiveParity.heat-core-resolution',
      'parityAndIntegration.runnerInteractiveParity.heat-dissipation-event-payload',
      'parityAndIntegration.runnerInteractiveParity.heat-environment-and-water',
      'parityAndIntegration.runnerInteractiveParity.heat-pilot-damage',
      'parityAndIntegration.runnerInteractiveParity.psr-resolution',
      'parityAndIntegration.runnerInteractiveParity.psr-piloting-skill',
      'parityAndIntegration.runnerInteractiveParity.objective-outcome',
      'parityAndIntegration.runnerInteractiveParity.terminal-game-ended-event',
      'parityAndIntegration.representativeScenarios.runner-terminal-game-ended-event',
    ]);
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
      BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['damage-string-hazards'].level,
    ).toBe('integrated');
    expect(
      BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['heat-lifecycle'].level,
    ).toBe('integrated');
    expect(
      BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['movement-enhancements'].level,
    ).toBe('helper-only');
    expect(
      BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['physical-core-actions'].level,
    ).toBe('helper-only');
    expect(
      BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['physical-self-risk'].level,
    ).toBe('helper-only');
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
      BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['non-battlemech-scope'].gap,
    ).toContain('Non-BattleMech');
  });
});
