import type {
  CombatCatalogTriadAuthorityBoundaryKind,
  ICombatCatalogTriadEvidence,
  ICombatCatalogTriadTestReference,
} from './CombatCatalogTriadEvidence';

import { PILOT_ABILITY_FEATURE_TRIAD } from './CombatValidationPilotAbilityTriad';

export type {
  CombatCatalogTriadAuthorityBoundaryKind,
  ICombatCatalogTriadEvidence,
  ICombatCatalogTriadTestReference,
} from './CombatCatalogTriadEvidence';

const testRef = (
  file: string,
  assertion: string,
): ICombatCatalogTriadTestReference => ({ file, assertion });

const triad = (
  kind: CombatCatalogTriadAuthorityBoundaryKind,
  rationale: string,
  testRefs: readonly ICombatCatalogTriadTestReference[],
): ICombatCatalogTriadEvidence => ({
  authorityBoundary: { kind, rationale },
  testRefs,
});

const entryTriad = (
  rationale: string,
  testRefs: readonly ICombatCatalogTriadTestReference[],
): ICombatCatalogTriadEvidence =>
  triad('entry-source-refs', rationale, testRefs);

const ACTION_CONTRACT_REFS = [
  testRef(
    'src/simulation/runner/__tests__/combatActionCatalog.contract.test.ts',
    'Action command, game intent, wire intent, P2P, and physical action support maps stay aligned with executable action surfaces.',
  ),
] as const;

const INVALIDATION_REFS = [
  testRef(
    'src/simulation/runner/__tests__/combatAttackInvalidationCatalog.contract.test.ts',
    'Attack invalidation rows remain aligned with invalid target states and side-effect suppression expectations.',
  ),
  testRef(
    'src/simulation/runner/__tests__/weaponAttackInvalidation.behavior.test.ts',
    'Weapon attack invalidation rejects illegal declarations without spending heat, ammo, or damage side effects.',
  ),
] as const;

const EVENT_STREAM_REFS = [
  testRef(
    'src/simulation/runner/__tests__/combatEventCatalog.contract.test.ts',
    'BattleMech combat event rows stay partitioned between wired event payloads and explicit non-BattleMech scope rows.',
  ),
  testRef(
    'src/simulation/runner/__tests__/weaponAttackEvents.test.ts',
    'Weapon attack behavior emits and replays combat event payloads used by representative event rows.',
  ),
] as const;

const FEATURE_REFS = [
  testRef(
    'src/simulation/runner/__tests__/battlemechCombatCatalog.contract.test.ts',
    'Feature-support rows stay aligned with official weapons, ammo, SPAs, quirks, and source-backed mechanic rows.',
  ),
] as const;

const RULE_REFS = [
  testRef(
    'src/simulation/runner/__tests__/battlemechCombatCatalog.contract.test.ts',
    'Rule-support rows keep range, to-hit, movement, terrain, heat, and physical damage support discoverable.',
  ),
  testRef(
    'src/simulation/runner/__tests__/weaponAttackToHitModifiers.behavior.test.ts',
    'Runner ranged attack behavior proves executable range and to-hit modifier consumption.',
  ),
] as const;

const TERRAIN_REFS = [
  testRef(
    'src/simulation/runner/__tests__/combatTerrainEnvironmentCatalog.contract.test.ts',
    'Terrain type matrices stay aligned with movement, LOS, attack modifier, heat, and PSR catalog rows.',
  ),
  testRef(
    'src/simulation/runner/__tests__/movementPhase.behavior.test.ts',
    'Runner movement behavior consumes terrain movement and legality data.',
  ),
] as const;

const DAMAGE_REFS = [
  testRef(
    'src/simulation/runner/__tests__/battlemechCombatCatalog.contract.test.ts',
    'Damage, critical, pilot damage, and destruction support rows stay discoverable from the catalog.',
  ),
  testRef(
    'src/simulation/runner/__tests__/damageLifecycle.behavior.test.ts',
    'Runner damage behavior proves armor, structure, transfer, location destruction, and death lifecycle outcomes.',
  ),
] as const;

const CRITICAL_SLOT_REFS = [
  testRef(
    'src/simulation/runner/__tests__/combatCriticalSlotHydrationCatalog.contract.test.ts',
    'Critical slot hydration rows stay aligned with critical component and mounted equipment state extraction.',
  ),
  testRef(
    'src/simulation/runner/__tests__/criticalSlotHydrationBoundary.behavior.test.ts',
    'Critical slot hydration behavior proves the executable boundary for mounted component and equipment state.',
  ),
] as const;

const LIFECYCLE_REFS = [
  testRef(
    'src/simulation/runner/__tests__/simulationRunnerTerminalParity.behavior.test.ts',
    'Runner terminal-state behavior proves destroyed, shutdown, unconscious, retreated, and ejected actors leave action queues and target filters as intended.',
  ),
  testRef(
    'src/simulation/runner/__tests__/psrPhase.behavior.test.ts',
    'PSR behavior proves pending PSR resolution, trigger preservation, fall, pilot wound, and cleanup paths.',
  ),
] as const;

const PARITY_REFS = [
  testRef(
    'src/simulation/runner/__tests__/combatIntegrationCatalog.contract.test.ts',
    'Representative integration rows stay aligned with runner and interactive parity scenarios.',
  ),
  testRef(
    'src/simulation/runner/__tests__/simulationRunnerTerminalParity.behavior.test.ts',
    'Terminal-state representative scenarios prove runner and interactive lifecycle parity.',
  ),
] as const;

const PILOT_REFS = [
  testRef(
    'src/simulation/runner/__tests__/combatPilotSkillCatalog.contract.test.ts',
    'Pilot skill catalog rows stay aligned with gunnery, piloting, initiative, wound, and PSR skill usage.',
  ),
  testRef(
    'src/simulation/runner/__tests__/combatPilotModifierApplicationCatalog.contract.test.ts',
    'Pilot modifier resolver rows stay aligned with executable SPA and quirk resolver paths.',
  ),
] as const;

const REQUIREMENT_REFS = [
  testRef(
    'src/simulation/runner/__tests__/combatValidationRequirementCatalog.contract.test.ts',
    'Requirement rows carry primary authority, support-map refs, source boundaries, and gap visibility.',
  ),
] as const;

const SCOPE_REFS = [
  testRef(
    'src/simulation/runner/__tests__/combatValidationScope.contract.test.ts',
    'Validation scope rows guard known-limitation handling, official catalog boundaries, and source-truth scope splits.',
  ),
] as const;

const MEKSTATION_ACTION_BOUNDARY =
  'MekStation action, intent, wire, UI, and P2P rows describe executable product surfaces; row sourceRefs are used only when a tabletop or MegaMek rule detail shapes that surface.';

const REQUIREMENT_AUTHORITY_BOUNDARY =
  'Rows inherit their source-truth boundary from the requirement crosswalk primary authority unless a row carries narrower sourceRefs.';

function requirementTriad(
  testRefs: readonly ICombatCatalogTriadTestReference[],
): ICombatCatalogTriadEvidence {
  return triad(
    'requirement-primary-authority',
    REQUIREMENT_AUTHORITY_BOUNDARY,
    testRefs,
  );
}

const ACTION_TRIAD = triad(
  'mekstation-deviation',
  MEKSTATION_ACTION_BOUNDARY,
  ACTION_CONTRACT_REFS,
);
const ACTION_SOURCE_TRIAD = entryTriad(
  'Action rows require refs.',
  ACTION_CONTRACT_REFS,
);
const ATTACK_REASON_TRIAD = entryTriad(
  'Ranged attack invalidation reason rows must carry row-level sourceRefs for ammo, same-hex, range, LOS/spotter, targetability, missing weapon, and weapon readiness boundaries; SameHex is an explicit MekStation deviation row.',
  INVALIDATION_REFS,
);
const INVALID_TARGET_STATE_TRIAD = entryTriad(
  'Ranged invalid target-state rows are MegaMek-source checked and must carry row-level sourceRefs for missing, destroyed, friendly, retreated, and ejected targetability boundaries.',
  INVALIDATION_REFS,
);
const ATTACK_SIDE_EFFECT_TRIAD = entryTriad(
  'Ranged invalid attack side-effect guard rows must carry row-level MekStation sourceRefs for event suppression, heat, ammo, damage, and fired-weapon state boundaries.',
  INVALIDATION_REFS,
);
const EVENT_TRIAD = entryTriad(
  'BattleMech event rows are MekStation executable event contracts and must carry row-level sourceRefs to the local factory, runner, reducer, or scenario paths that emit or intentionally omit each event.',
  EVENT_STREAM_REFS,
);
const MECH_QUIRK_TRIAD = entryTriad(
  'Mech quirk rows require row sourceRefs.',
  FEATURE_REFS,
);
const TERRAIN_ENVIRONMENT_TRIAD = entryTriad(
  'Terrain/environment rows are source checked and must carry row-level sourceRefs for terrain costs, LOS/cover/to-hit features, water/fire heat, fog/night/wind/extreme temperature, local atmosphere, and explicit dust/mines gaps.',
  TERRAIN_REFS,
);
const TERRAIN_TYPE_MOVEMENT_TRIAD = entryTriad(
  'Per-TerrainType movement rows are source checked and must carry row-level sourceRefs, distinguishing MegaMek terrain movement anchors from MekStation-local water and building movement simplifications.',
  TERRAIN_REFS,
);
const TERRAIN_TYPE_HEAT_TRIAD = entryTriad(
  'Per-TerrainType heat rows are source checked and must carry row-level sourceRefs, distinguishing MegaMek fire/water heat anchors from MekStation-local no-heat terrain rows.',
  TERRAIN_REFS,
);
const TERRAIN_TYPE_ATTACK_MODIFIER_TRIAD = entryTriad(
  'Per-TerrainType attack modifier rows are source checked and must carry row-level sourceRefs, distinguishing MegaMek woods/smoke/building to-hit anchors from MekStation-local water, swamp, and no-modifier rows.',
  TERRAIN_REFS,
);
const TERRAIN_TYPE_LOS_TRIAD = entryTriad(
  'Per-TerrainType LOS rows are source checked and must carry row-level sourceRefs, distinguishing MekStation direct and cumulative woods/smoke LOS behavior from MegaMek building, water, and divided-LOS parity gaps.',
  TERRAIN_REFS,
);
const TERRAIN_TYPE_PSR_TRIAD = entryTriad(
  'Per-TerrainType PSR rows are source checked and must carry row-level sourceRefs, distinguishing MegaMek rubble, water, skidding, swamp bog-down, and building-collapse anchors from MekStation-local rough/no-PSR terrain rows.',
  TERRAIN_REFS,
);
const DAMAGE_TRIAD = requirementTriad(DAMAGE_REFS);
const damageTriad = (rationale: string) => entryTriad(rationale, DAMAGE_REFS);
const DAMAGE_RESOLUTION_TRIAD = damageTriad('Damage rows require refs.');
const PILOT_DAMAGE_TRIAD = damageTriad('Pilot damage rows require refs.');
const DESTRUCTION_CAUSE_TRIAD = damageTriad('Death-cause rows require refs.');
const CRITICAL_SLOT_TRIAD = entryTriad(
  'Critical-slot hydration and effect rows are MegaMek-source checked and must carry row-level sourceRefs for system critical slots, mounted equipment critical slots, ammo cookoff selection, and equipment-specific lifecycle gap boundaries.',
  CRITICAL_SLOT_REFS,
);
const ACTION_ELIGIBILITY_TRIAD = entryTriad(
  'Action eligibility rows require row sourceRefs.',
  LIFECYCLE_REFS,
);
const PSR_RESOLUTION_TRIAD = entryTriad(
  'PSR resolution rows require row sourceRefs.',
  LIFECYCLE_REFS,
);
const PSR_TRIGGER_TRIAD = entryTriad(
  'Runner PSR trigger rows require row sourceRefs.',
  LIFECYCLE_REFS,
);
const PARITY_TRIAD = entryTriad(
  'Runner/interactive parity and representative integration rows require row sourceRefs for the executable MekStation paths they claim.',
  PARITY_REFS,
);
const PILOT_MODIFIER_RESOLVER_TRIAD = entryTriad(
  'Pilot modifier resolver rows require row sourceRefs.',
  PILOT_REFS,
);
const PHYSICAL_LEGALITY_TRIAD = entryTriad(
  'Physical legality gate rows are MegaMek-source checked and must carry row-level sourceRefs.',
  [
    ...RULE_REFS,
    testRef(
      'src/simulation/runner/__tests__/combatActionCatalog.contract.test.ts',
      'Physical legality gates are checked for pinned MegaMek source refs.',
    ),
  ],
);
const PHYSICAL_DAMAGE_TRIAD = entryTriad(
  'Physical damage modifier rows are MegaMek-source checked and must carry row-level sourceRefs for active TSM, claw punch, talon kick/DFA, underwater physical damage, and remaining claw/talon equipment-lifecycle side paths.',
  RULE_REFS,
);
const HEAT_TRIAD = entryTriad(
  'Heat rule rows are source checked and must carry row-level sourceRefs for weapon heat, movement/jump heat, engine crit heat, dissipation, damaged heat sinks, threshold effects, water/fire/environmental heat, shutdown/startup, ammo explosion, pilot heat damage, and optional MaxTech heat damage boundaries. Local atmosphere heat adjustment is marked as a MekStation deviation source.',
  [
    ...RULE_REFS,
    testRef(
      'src/simulation/runner/__tests__/heatEvents.test.ts',
      'Heat behavior proves generated heat, dissipation, shutdown, startup, ammo explosion, and heat-damage event paths.',
    ),
    testRef(
      'src/simulation/runner/__tests__/heatEnvironmentParity.behavior.test.ts',
      'Environmental heat and water cooling behavior prove terrain/environment heat rows.',
    ),
  ],
);

export const COMBAT_CATALOG_TRIAD_EVIDENCE = {
  actions: {
    tacticalCommands: ACTION_TRIAD,
    absentActionSurfaces: entryTriad(
      'Absent official BattleMech action surfaces must carry row-level sourceRefs so optional TacOps sprint/evade gaps remain explicit action blockers instead of inheriting broad movement authority.',
      ACTION_CONTRACT_REFS,
    ),
    directUiActions: ACTION_TRIAD,
    gmCommandExclusions: entryTriad(
      'GM command exclusion rows need local GM/referee command factory refs.',
      ACTION_CONTRACT_REFS,
    ),
    gameIntents: ACTION_TRIAD,
    wireIntents: ACTION_TRIAD,
    p2pIntents: ACTION_TRIAD,
    physicalAttackCommands: ACTION_SOURCE_TRIAD,
    physicalActionClassScope: ACTION_SOURCE_TRIAD,
  },
  invalidation: {
    attackReasons: ATTACK_REASON_TRIAD,
    invalidTargetStates: INVALID_TARGET_STATE_TRIAD,
    invalidAttackSideEffects: ATTACK_SIDE_EFFECT_TRIAD,
  },
  eventStream: {
    battleMechCombatEvents: EVENT_TRIAD,
    nonBattleMechEventScope: triad(
      'entry-source-refs',
      'Non-BattleMech event rows are MekStation scope boundaries that must carry row-level refs to the vehicle, battle armor, swarm, leg-attack, and stealth event surfaces they split out of the BattleMech matrix.',
      EVENT_STREAM_REFS,
    ),
  },
  featureSupport: {
    pilotAbilities: PILOT_ABILITY_FEATURE_TRIAD,
    canonicalPilotAbilityScope: triad(
      'entry-source-refs',
      'Canonical SPA rows must carry row-level sourceRefs that bind each canonical id to the MekStation SPA catalog plus the pinned MegaMek pilot option registry, including explicit helper-only and unsupported scope partitions.',
      FEATURE_REFS,
    ),
    mechQuirks: MECH_QUIRK_TRIAD,
    ammunitionCompatibility: triad(
      'entry-source-refs',
      'Ammunition compatibility rows must carry row-level sourceRefs for official ammo catalog imports, ammo lookup/hydration, consumable ammo tracking, and exact-id gap partitions before BattleMech ammo coverage can claim source-backed catalog parity.',
      FEATURE_REFS,
    ),
    specialWeaponFamilies: triad(
      'entry-source-refs',
      'Special weapon family rows are MegaMek-source checked for UAC, RAC, LB-X, Streak SRM, MML, NARC, AMS, TAG, Artemis, and plasma-cannon family boundaries and must carry row-level sourceRefs.',
      FEATURE_REFS,
    ),
    specialWeaponMechanics: triad(
      'entry-source-refs',
      'Special weapon mechanic rows are MegaMek-source checked for UAC, RAC, LB-X, Streak SRM, MML, NARC/iNARC, AMS, TAG, Artemis, ECM, active-probe, and stealth behavior and must carry row-level sourceRefs.',
      FEATURE_REFS,
    ),
    physicalWeapons: triad(
      'entry-source-refs',
      'Physical weapon rows must carry row-level sourceRefs before they can claim source-backed BattleMech weapon damage, to-hit, or legality behavior.',
      FEATURE_REFS,
    ),
  },
  ruleSupport: {
    rangeBrackets: triad(
      'entry-source-refs',
      'Range bracket rows are MegaMek-source checked and must carry row-level sourceRefs for short, medium, long, extreme, and out-of-range boundaries.',
      RULE_REFS,
    ),
    toHitModifiers: triad(
      'entry-source-refs',
      'Ranged to-hit modifier rows are MegaMek-source checked and must carry row-level sourceRefs for gunnery, range, movement, heat, terrain/cover, target state, damage, indirect fire, ECM/C3, and physical-DFA modifier boundaries.',
      RULE_REFS,
    ),
    physicalLegalityGates: PHYSICAL_LEGALITY_TRIAD,
    physicalDamageModifiers: PHYSICAL_DAMAGE_TRIAD,
    movementRules: triad(
      'entry-source-refs',
      'Core BattleMech movement rule rows are MegaMek-source checked and must carry row-level sourceRefs for walk, run, jump, stand, go-prone, go-prone side paths, facing, occupancy, elevation, heat movement penalties, and torso twist boundaries.',
      RULE_REFS,
    ),
    movementEnhancements: triad(
      'entry-source-refs',
      'Movement enhancement rows are source-backed MASC, Supercharger, TSM, Partial Wing, and remaining MASC/Supercharger side-path boundaries and must carry row-level sourceRefs.',
      RULE_REFS,
    ),
    terrainEnvironment: TERRAIN_ENVIRONMENT_TRIAD,
    terrainTypeMovement: TERRAIN_TYPE_MOVEMENT_TRIAD,
    terrainTypeLos: TERRAIN_TYPE_LOS_TRIAD,
    terrainTypeAttackModifiers: TERRAIN_TYPE_ATTACK_MODIFIER_TRIAD,
    terrainTypeHeat: TERRAIN_TYPE_HEAT_TRIAD,
    terrainTypePsr: TERRAIN_TYPE_PSR_TRIAD,
    heatRules: HEAT_TRIAD,
  },
  damageAndDeath: {
    damageResolution: DAMAGE_RESOLUTION_TRIAD,
    pilotDamage: PILOT_DAMAGE_TRIAD,
    criticalComponents: DAMAGE_TRIAD,
    criticalSlotEffects: CRITICAL_SLOT_TRIAD,
    criticalSlotHydration: CRITICAL_SLOT_TRIAD,
    destructionCauses: DESTRUCTION_CAUSE_TRIAD,
  },
  lifecycleAndPsr: {
    actionEligibility: ACTION_ELIGIBILITY_TRIAD,
    psrResolution: PSR_RESOLUTION_TRIAD,
    psrTriggers: PSR_TRIGGER_TRIAD,
  },
  parityAndIntegration: {
    runnerInteractiveParity: PARITY_TRIAD,
    representativeScenarios: PARITY_TRIAD,
  },
  pilotSkills: {
    pilotSkillUse: entryTriad('Pilot skill rows need refs.', PILOT_REFS),
    pilotModifierResolvers: PILOT_MODIFIER_RESOLVER_TRIAD,
  },
  validationScope: {
    objectiveRequirements: entryTriad(
      'Requirement rows derive row-level sourceRefs from their support-map refs, while explicit primaryAuthority remains the source-to-catalog crosswalk.',
      REQUIREMENT_REFS,
    ),
    knownLimitationsAndScope: triad(
      'entry-source-refs',
      'Validation scope rows carry row-level refs for known-limitation bypasses, official catalog boundaries, fallback guards, variable-damage hazards, and non-BattleMech scope splits.',
      SCOPE_REFS,
    ),
  },
} satisfies Record<string, Record<string, ICombatCatalogTriadEvidence>>;
