/**
 * Electronic Warfare Module
 *
 * Implements BattleTech ECM, ECCM, Angel ECM, and Beagle Active Probe mechanics:
 * - Guardian ECM Suite: 6-hex bubble nullifying Artemis, Narc, TAG, C3, active probes
 * - Angel ECM Suite: Improved Guardian ECM (requires Angel ECCM to fully counter)
 * - Clan ECM Suite: Equivalent to Angel ECM
 * - ECCM Mode: One ECM counters another ECM (cannot provide ECM simultaneously)
 * - Beagle Active Probe (BAP): Counters ECM at probe range for the equipped unit
 * - Stealth Armor: +1 medium, +2 long range to-hit modifier (requires active Guardian ECM)
 *
 * @spec openspec/changes/full-combat-parity/specs/ecm-electronic-warfare/spec.md
 */

import { IHexCoordinate } from '@/types/gameplay';

import { hexDistance } from './hexMath';

// =============================================================================
// Types
// =============================================================================

/** ECM suite types */
export type ECMType = 'guardian' | 'angel' | 'clan';

/** Operating mode for an ECM-capable unit */
export type ECMMode = 'ecm' | 'eccm' | 'off';

/** ECM suite mounted on a unit */
export interface IECMSuite {
  /** Type of ECM suite */
  readonly type: ECMType;
  /** Current operating mode */
  readonly mode: ECMMode;
  /** Whether the suite is functional (not destroyed) */
  readonly operational: boolean;
  /** Owning unit's entity ID */
  readonly entityId: string;
  /** Owning unit's team/player ID */
  readonly teamId: string;
  /** Current hex position of the unit */
  readonly position: IHexCoordinate;
}

/** Active probe mounted on a unit */
export interface IActiveProbe {
  /** Probe type */
  readonly type: 'beagle' | 'bloodhound' | 'clan-active-probe';
  /** Whether the probe is functional */
  readonly operational: boolean;
  /** Owning unit's entity ID */
  readonly entityId: string;
  /** Owning unit's team/player ID */
  readonly teamId: string;
  /** Current hex position of the unit */
  readonly position: IHexCoordinate;
}

/** Stealth armor equipped on a unit */
export interface IStealthArmor {
  /** Whether stealth armor is present */
  readonly equipped: boolean;
  /** Entity ID of the unit with stealth armor */
  readonly entityId: string;
  /** Team ID */
  readonly teamId: string;
}

/** Result of ECM status query for a specific position/unit */
export interface IECMStatus {
  /** Is the unit/position protected by friendly ECM? */
  readonly ecmProtected: boolean;
  /** Is the unit/position affected by enemy ECM (disrupted)? */
  readonly ecmDisrupted: boolean;
  /** Are electronic systems (Artemis/Narc/TAG/C3/probes) nullified? */
  readonly electronicsNullified: boolean;
  /** Friendly ECM sources providing protection */
  readonly friendlyECMSources: readonly string[];
  /** Enemy ECM sources causing disruption */
  readonly enemyECMSources: readonly string[];
  /** ECCM sources countering enemy ECM */
  readonly eccmSources: readonly string[];
  /** BAP sources countering ECM for this unit */
  readonly bapCounterSources: readonly string[];
}

/** Stealth armor modifier result */
export interface IStealthModifier {
  /** To-hit modifier from stealth armor */
  readonly modifier: number;
  /** Whether stealth armor is active (has ECM support) */
  readonly active: boolean;
  /** Description for to-hit breakdown */
  readonly description: string;
}

/** Battlefield electronic warfare state */
export interface IElectronicWarfareState {
  /** All ECM suites on the battlefield */
  readonly ecmSuites: readonly IECMSuite[];
  /** All active probes on the battlefield */
  readonly activeProbes: readonly IActiveProbe[];
}

// =============================================================================
// Constants
// =============================================================================

/** Standard ECM bubble radius in hexes */
export const ECM_RADIUS = 6;

/** Beagle Active Probe effective range for ECM countering */
export const BAP_ECM_COUNTER_RANGE = 4;

/** Bloodhound Active Probe effective range for ECM countering */
export const BLOODHOUND_ECM_COUNTER_RANGE = 8;

/** Clan Active Probe effective range for ECM countering */
export const CLAN_PROBE_ECM_COUNTER_RANGE = 5;

/** Stealth armor to-hit modifiers by range bracket */
export const STEALTH_ARMOR_MODIFIERS = {
  short: 0,
  medium: 1,
  long: 2,
} as const;

// =============================================================================
// ECM Bubble Tracking (Task 14.1)
// =============================================================================

/**
 * Check if a position is within an ECM bubble from a specific ECM source.
 *
 * All ECM types use a 6-hex radius bubble centered on the ECM-equipped unit.
 */
export function isInECMBubble(
  position: IHexCoordinate,
  ecmSource: IECMSuite,
): boolean {
  if (!ecmSource.operational || ecmSource.mode !== 'ecm') {
    return false;
  }
  return hexDistance(position, ecmSource.position) <= ECM_RADIUS;
}

/**
 * Get all friendly ECM bubbles covering a position.
 * Friendly = same teamId as the queried unit.
 */
export function getFriendlyECMSources(
  position: IHexCoordinate,
  teamId: string,
  ewState: IElectronicWarfareState,
): readonly IECMSuite[] {
  return ewState.ecmSuites.filter(
    (ecm) =>
      ecm.teamId === teamId &&
      ecm.mode === 'ecm' &&
      ecm.operational &&
      hexDistance(position, ecm.position) <= ECM_RADIUS,
  );
}

/**
 * Get all enemy ECM bubbles affecting a position.
 * Enemy = different teamId from the queried unit.
 */
export function getEnemyECMSources(
  position: IHexCoordinate,
  teamId: string,
  ewState: IElectronicWarfareState,
): readonly IECMSuite[] {
  return ewState.ecmSuites.filter(
    (ecm) =>
      ecm.teamId !== teamId &&
      ecm.mode === 'ecm' &&
      ecm.operational &&
      hexDistance(position, ecm.position) <= ECM_RADIUS,
  );
}

// =============================================================================
// ECCM Counter (Task 14.3)
// =============================================================================

/**
 * Get all friendly ECCM sources within range of a position.
 * ECCM mode means the unit is countering enemy ECM instead of providing ECM.
 */
export function getFriendlyECCMSources(
  position: IHexCoordinate,
  teamId: string,
  ewState: IElectronicWarfareState,
): readonly IECMSuite[] {
  return ewState.ecmSuites.filter(
    (ecm) =>
      ecm.teamId === teamId &&
      ecm.mode === 'eccm' &&
      ecm.operational &&
      hexDistance(position, ecm.position) <= ECM_RADIUS,
  );
}

/**
 * Determine how many enemy ECM sources are countered by friendly ECCM.
 *
 * Rules:
 * - One ECCM counters one enemy ECM (1:1 ratio)
 * - Guardian ECCM can counter Guardian ECM
 * - Angel ECCM can counter Angel/Clan ECM
 * - Guardian ECCM cannot fully counter Angel/Clan ECM (partial only)
 *
 * Returns the number of enemy ECMs that remain uncountered.
 */
export function calculateECCMCountering(
  enemyECMs: readonly IECMSuite[],
  friendlyECCMs: readonly IECMSuite[],
): {
  readonly uncounteredEnemyECMs: readonly IECMSuite[];
  readonly counteredEnemyECMs: readonly IECMSuite[];
} {
  // Sort enemy ECMs: counter Guardian first (easiest to counter)
  const sortedEnemies = [...enemyECMs].sort((a, b) => {
    const tierA = a.type === 'guardian' ? 0 : 1;
    const tierB = b.type === 'guardian' ? 0 : 1;
    return tierA - tierB;
  });

  // Sort friendly ECCMs: use Angel/Clan first (can counter anything)
  const availableECCMs = [...friendlyECCMs].sort((a, b) => {
    const tierA = a.type === 'guardian' ? 1 : 0;
    const tierB = b.type === 'guardian' ? 1 : 0;
    return tierA - tierB;
  });

  const counteredEnemyECMs: IECMSuite[] = [];
  const usedECCMs = new Set<string>();

  for (const enemy of sortedEnemies) {
    // Find a suitable ECCM to counter this enemy
    const counterIdx = availableECCMs.findIndex((eccm) => {
      if (usedECCMs.has(eccm.entityId)) return false;

      // Guardian ECCM can counter Guardian ECM
      if (enemy.type === 'guardian') return true;

      // Angel/Clan ECM requires Angel/Clan ECCM to counter
      return eccm.type === 'angel' || eccm.type === 'clan';
    });

    if (counterIdx >= 0) {
      usedECCMs.add(availableECCMs[counterIdx].entityId);
      counteredEnemyECMs.push(enemy);
    }
  }

  const counteredIds = new Set(counteredEnemyECMs.map((e) => e.entityId));
  const uncounteredEnemyECMs = sortedEnemies.filter(
    (e) => !counteredIds.has(e.entityId),
  );

  return { uncounteredEnemyECMs, counteredEnemyECMs };
}

// =============================================================================
// BAP / Active Probe Counter (Task 14.5)
// =============================================================================

/**
 * Get effective range for a probe type when countering ECM.
 */
export function getProbeECMCounterRange(
  probeType: IActiveProbe['type'],
): number {
  switch (probeType) {
    case 'beagle':
      return BAP_ECM_COUNTER_RANGE;
    case 'bloodhound':
      return BLOODHOUND_ECM_COUNTER_RANGE;
    case 'clan-active-probe':
      return CLAN_PROBE_ECM_COUNTER_RANGE;
  }
}

/**
 * Check if a BAP/active probe counters enemy ECM for its owning unit.
 *
 * BAP counters ECM only for the unit carrying the probe (not for allies).
 * The probe must be within its effective range of the enemy ECM source.
 */
export function getBAPCounterSources(
  unitPosition: IHexCoordinate,
  unitTeamId: string,
  ewState: IElectronicWarfareState,
): readonly IActiveProbe[] {
  return ewState.activeProbes.filter(
    (probe) =>
      probe.teamId === unitTeamId &&
      probe.operational &&
      hexDistance(unitPosition, probe.position) === 0, // BAP only benefits its own unit
  );
}

/**
 * Check if a unit's BAP can counter a specific enemy ECM source.
 */
export function canBAPCounterECM(
  probe: IActiveProbe,
  enemyECM: IECMSuite,
): boolean {
  if (!probe.operational) return false;

  const counterRange = getProbeECMCounterRange(probe.type);
  const distance = hexDistance(probe.position, enemyECM.position);

  // BAP can counter standard Guardian ECM within range
  if (enemyECM.type === 'guardian') {
    return distance <= counterRange;
  }

  // Bloodhound can counter Angel/Clan ECM within range
  if (probe.type === 'bloodhound') {
    return distance <= counterRange;
  }

  // Regular BAP/Clan probe cannot counter Angel/Clan ECM
  return false;
}

// =============================================================================
// ECM Effects Resolution (Task 14.2)
// =============================================================================

/**
 * Resolve the full ECM status for a unit at a given position.
 *
 * This is the main entry point for determining electronic warfare effects.
 * It considers:
 * 1. Friendly ECM protection
 * 2. Enemy ECM disruption
 * 3. ECCM countering
 * 4. BAP countering (for the specific unit)
 *
 * @param position - Unit's hex position
 * @param teamId - Unit's team
 * @param entityId - Unit's entity ID (for BAP resolution)
 * @param ewState - Battlefield electronic warfare state
 */
export function resolveECMStatus(
  position: IHexCoordinate,
  teamId: string,
  entityId: string,
  ewState: IElectronicWarfareState,
): IECMStatus {
  // 1. Gather all ECM sources
  const friendlyECMs = getFriendlyECMSources(position, teamId, ewState);
  const enemyECMs = getEnemyECMSources(position, teamId, ewState);
  const friendlyECCMs = getFriendlyECCMSources(position, teamId, ewState);

  // 2. Resolve ECCM countering
  const { uncounteredEnemyECMs } = calculateECCMCountering(
    enemyECMs,
    friendlyECCMs,
  );

  // 3. Check BAP countering for this specific unit
  const unitProbes = ewState.activeProbes.filter(
    (p) => p.entityId === entityId && p.operational,
  );

  const bapCountered = new Set<string>();
  for (const probe of unitProbes) {
    for (const enemyECM of uncounteredEnemyECMs) {
      if (canBAPCounterECM(probe, enemyECM)) {
        bapCountered.add(enemyECM.entityId);
      }
    }
  }

  // 4. Remaining uncountered enemy ECMs after ECCM + BAP
  const finalUncountered = uncounteredEnemyECMs.filter(
    (e) => !bapCountered.has(e.entityId),
  );

  const ecmProtected = friendlyECMs.length > 0;
  const ecmDisrupted = finalUncountered.length > 0;
  const electronicsNullified = ecmDisrupted;

  return {
    ecmProtected,
    ecmDisrupted,
    electronicsNullified,
    friendlyECMSources: friendlyECMs.map((e) => e.entityId),
    enemyECMSources: finalUncountered.map((e) => e.entityId),
    eccmSources: friendlyECCMs.map((e) => e.entityId),
    bapCounterSources: unitProbes
      .filter((p) => uncounteredEnemyECMs.some((e) => canBAPCounterECM(p, e)))
      .map((p) => p.entityId),
  };
}

/**
 * Check if a target's electronics are nullified by enemy ECM.
 *
 * This is used by the weapon resolution pipeline to determine whether
 * Artemis, Narc, TAG, and C3 bonuses should apply.
 *
 * @param targetPosition - Target unit's position
 * @param attackerTeamId - Attacker's team (ECM from this team protects the target)
 * @param ewState - Battlefield EW state
 */
export function areElectronicsNullified(
  targetPosition: IHexCoordinate,
  attackerTeamId: string,
  targetEntityId: string,
  ewState: IElectronicWarfareState,
): boolean {
  const status = resolveECMStatus(
    targetPosition,
    attackerTeamId,
    targetEntityId,
    ewState,
  );
  return status.ecmProtected;
}

/**
 * Determine if a specific attack should have its electronic bonuses nullified.
 *
 * This is the primary integration point with the combat pipeline.
 * Call this when resolving whether Artemis/Narc/TAG/C3 bonuses apply to an attack.
 *
 * @param attackerPosition - Attacker's hex position
 * @param attackerTeamId - Attacker's team
 * @param attackerEntityId - Attacker's entity ID
 * @param targetPosition - Target's hex position
 * @param targetTeamId - Target's team
 * @param targetEntityId - Target's entity ID
 * @param ewState - Battlefield EW state
 */
export function isAttackECMProtected(
  attackerPosition: IHexCoordinate,
  attackerTeamId: string,
  attackerEntityId: string,
  targetPosition: IHexCoordinate,
  targetTeamId: string,
  _targetEntityId: string,
  ewState: IElectronicWarfareState,
): boolean {
  // Attack is ECM-protected if the TARGET is within a friendly ECM bubble
  // (friendly to the target, enemy to the attacker)
  const targetFriendlyECMs = getFriendlyECMSources(
    targetPosition,
    targetTeamId,
    ewState,
  );

  if (targetFriendlyECMs.length === 0) return false;

  // Check if attacker has ECCM countering the target's ECM
  const attackerECCMs = getFriendlyECCMSources(
    attackerPosition,
    attackerTeamId,
    ewState,
  );

  const { uncounteredEnemyECMs } = calculateECCMCountering(
    targetFriendlyECMs, // These are "enemy" from attacker's perspective
    attackerECCMs,
  );

  if (uncounteredEnemyECMs.length === 0) return false;

  // Check if attacker's BAP can counter the remaining ECM
  const attackerProbes = ewState.activeProbes.filter(
    (p) => p.entityId === attackerEntityId && p.operational,
  );

  for (const ecm of uncounteredEnemyECMs) {
    let countered = false;
    for (const probe of attackerProbes) {
      if (canBAPCounterECM(probe, ecm)) {
        countered = true;
        break;
      }
    }
    if (!countered) return true; // At least one ECM is not countered
  }

  return false; // All ECMs were countered by BAP
}

// =============================================================================
// Stealth Armor (Task 14.4)
// =============================================================================

/** Range bracket type for stealth modifier lookup */
export type StealthRangeBracket = 'short' | 'medium' | 'long';

/**
 * Calculate stealth armor to-hit modifier.
 *
 * Stealth armor requires an active Guardian ECM Suite. When active:
 * - Short range: +0
 * - Medium range: +1
 * - Long range: +2
 *
 * If the Guardian ECM is destroyed or in ECCM mode, stealth provides no bonus.
 *
 * @param hasStealthArmor - Whether the target has stealth armor
 * @param targetEntityId - Target's entity ID
 * @param targetTeamId - Target's team ID
 * @param rangeBracket - Range bracket of the attack
 * @param ewState - Battlefield EW state
 */
export function calculateStealthArmorModifier(
  hasStealthArmor: boolean,
  targetEntityId: string,
  targetTeamId: string,
  rangeBracket: StealthRangeBracket,
  ewState: IElectronicWarfareState,
): IStealthModifier {
  if (!hasStealthArmor) {
    return { modifier: 0, active: false, description: 'No stealth armor' };
  }

  // Check if target has an active Guardian ECM in ECM mode
  const hasActiveGuardianECM = ewState.ecmSuites.some(
    (ecm) =>
      ecm.entityId === targetEntityId &&
      ecm.teamId === targetTeamId &&
      ecm.mode === 'ecm' &&
      ecm.operational,
  );

  if (!hasActiveGuardianECM) {
    return {
      modifier: 0,
      active: false,
      description: 'Stealth armor inactive (no active ECM)',
    };
  }

  const modifier = STEALTH_ARMOR_MODIFIERS[rangeBracket];
  return {
    modifier,
    active: true,
    description:
      modifier > 0
        ? `Stealth armor at ${rangeBracket} range: +${modifier}`
        : `Stealth armor at ${rangeBracket} range: +0`,
  };
}

// =============================================================================
// ECM-Aware Target Status (Integration Helper)
// =============================================================================

/**
 * Build the ecmProtected flag for use with ITargetStatusFlags in specialWeaponMechanics.
 *
 * This bridges the electronic warfare system with the existing weapon resolution pipeline
 * that checks `ecmProtected` on `ITargetStatusFlags`.
 */
export function getECMProtectedFlag(
  attackerPosition: IHexCoordinate,
  attackerTeamId: string,
  attackerEntityId: string,
  targetPosition: IHexCoordinate,
  targetTeamId: string,
  targetEntityId: string,
  ewState: IElectronicWarfareState,
): boolean {
  return isAttackECMProtected(
    attackerPosition,
    attackerTeamId,
    attackerEntityId,
    targetPosition,
    targetTeamId,
    targetEntityId,
    ewState,
  );
}

// =============================================================================
// ECM → C3 Disruption Integration
// =============================================================================

/**
 * Resolve ECM disruption for all units in a C3-style network member list.
 *
 * For each member, checks whether enemy ECM disrupts them (after ECCM/BAP
 * countering), and returns a map of entityId → ecmDisrupted boolean.
 *
 * Callers pass this result to updateC3UnitECMStatus() from c3Network.ts.
 */
export function resolveC3ECMDisruption(
  members: readonly {
    readonly entityId: string;
    readonly teamId: string;
    readonly position: IHexCoordinate;
  }[],
  ewState: IElectronicWarfareState,
): ReadonlyMap<string, boolean> {
  const result = new Map<string, boolean>();
  for (const member of members) {
    const status = resolveECMStatus(
      member.position,
      member.teamId,
      member.entityId,
      ewState,
    );
    result.set(member.entityId, status.ecmDisrupted);
  }
  return result;
}

// =============================================================================
// Factory Helpers
// =============================================================================

/**
 * Create an empty electronic warfare state.
 */
export function createEmptyEWState(): IElectronicWarfareState {
  return {
    ecmSuites: [],
    activeProbes: [],
  };
}

/**
 * Create an electronic warfare state from unit data.
 */
export function createEWState(
  ecmSuites: readonly IECMSuite[],
  activeProbes: readonly IActiveProbe[],
): IElectronicWarfareState {
  return { ecmSuites, activeProbes };
}

/**
 * Add an ECM suite to the battlefield state.
 */
export function addECMSuite(
  state: IElectronicWarfareState,
  suite: IECMSuite,
): IElectronicWarfareState {
  return {
    ...state,
    ecmSuites: [...state.ecmSuites, suite],
  };
}

/**
 * Add an active probe to the battlefield state.
 */
export function addActiveProbe(
  state: IElectronicWarfareState,
  probe: IActiveProbe,
): IElectronicWarfareState {
  return {
    ...state,
    activeProbes: [...state.activeProbes, probe],
  };
}

/**
 * Toggle ECM mode for a unit.
 */
export function setECMMode(
  state: IElectronicWarfareState,
  entityId: string,
  mode: ECMMode,
): IElectronicWarfareState {
  return {
    ...state,
    ecmSuites: state.ecmSuites.map((ecm) =>
      ecm.entityId === entityId ? { ...ecm, mode } : ecm,
    ),
  };
}

/**
 * Update position of an ECM-equipped unit (e.g., after movement).
 */
export function updateECMPosition(
  state: IElectronicWarfareState,
  entityId: string,
  newPosition: IHexCoordinate,
): IElectronicWarfareState {
  return {
    ...state,
    ecmSuites: state.ecmSuites.map((ecm) =>
      ecm.entityId === entityId ? { ...ecm, position: newPosition } : ecm,
    ),
    activeProbes: state.activeProbes.map((probe) =>
      probe.entityId === entityId ? { ...probe, position: newPosition } : probe,
    ),
  };
}

/**
 * Mark an ECM suite or probe as destroyed.
 */
export function destroyEquipment(
  state: IElectronicWarfareState,
  entityId: string,
  equipmentType: 'ecm' | 'probe',
): IElectronicWarfareState {
  if (equipmentType === 'ecm') {
    return {
      ...state,
      ecmSuites: state.ecmSuites.map((ecm) =>
        ecm.entityId === entityId ? { ...ecm, operational: false } : ecm,
      ),
    };
  }
  return {
    ...state,
    activeProbes: state.activeProbes.map((probe) =>
      probe.entityId === entityId ? { ...probe, operational: false } : probe,
    ),
  };
}
