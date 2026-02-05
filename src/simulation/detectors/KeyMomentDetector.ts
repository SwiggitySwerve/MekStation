/**
 * KeyMomentDetector - Detects significant battle moments from game event streams
 *
 * Processes IGameEvent[] to identify 18 key moment types across 3 tiers:
 * - Tier 1 (6): first-blood, bv-swing-major, comeback, wipe, last-stand, ace-kill
 * - Tier 2 (7): head-shot, ammo-explosion, pilot-kill, critical-engine, critical-gyro, alpha-strike, focus-fire
 * - Tier 3 (5): heat-crisis, mobility-kill, weapons-kill, rear-arc-hit, overkill
 */

import type {
  IKeyMoment,
  KeyMomentType,
} from '@/types/simulation-viewer/IKeyMoment';

import {
  GameEventType,
  GameSide,
  type IGameEvent,
  type IUnitDestroyedPayload,
  type IDamageAppliedPayload,
  type IAttackResolvedPayload,
  type IPilotHitPayload,
} from '@/types/gameplay/GameSessionInterfaces';

import { getPayload } from './utils/getPayload';

// =============================================================================
// Types
// =============================================================================

/**
 * Static information about a unit in the battle.
 * Provided by the caller to give the detector context about each unit.
 */
export interface BattleUnit {
  readonly id: string;
  readonly name: string;
  readonly side: GameSide;
  readonly bv: number;
  readonly weaponIds: readonly string[];
  readonly initialArmor: Readonly<Record<string, number>>;
  readonly initialStructure: Readonly<Record<string, number>>;
}

/**
 * Static battle context provided to the detector.
 * Contains all participating units with their starting attributes.
 */
export interface BattleState {
  readonly units: readonly BattleUnit[];
}

/**
 * Payload for CriticalHit events.
 * Defined locally until added to GameSessionInterfaces.
 */
export interface ICriticalHitPayload {
  readonly unitId: string;
  readonly location: string;
  readonly component: string;
  readonly sourceUnitId?: string;
}

/**
 * Payload for AmmoExplosion events.
 * Defined locally until added to GameSessionInterfaces.
 */
export interface IAmmoExplosionPayload {
  readonly unitId: string;
  readonly location: string;
  readonly damage: number;
}

/**
 * Payload for HeatEffectApplied events.
 * Defined locally until added to GameSessionInterfaces.
 */
export interface IHeatEffectAppliedPayload {
  readonly unitId: string;
  readonly effect: 'shutdown' | 'ammo-explosion' | 'modifier';
  readonly heat: number;
}

/** Extended AttackResolved payload with rear arc information */
interface IAttackResolvedExtended extends IAttackResolvedPayload {
  readonly attackerFacing?: 'front' | 'left' | 'right' | 'rear';
}

// =============================================================================
// Constants
// =============================================================================

/** Mapping from key moment type to its tier */
const TIER_MAP: Readonly<Record<KeyMomentType, 1 | 2 | 3>> = {
  'first-blood': 1,
  'bv-swing-major': 1,
  comeback: 1,
  wipe: 1,
  'last-stand': 1,
  'ace-kill': 1,
  'head-shot': 2,
  'ammo-explosion': 2,
  'pilot-kill': 2,
  'critical-engine': 2,
  'critical-gyro': 2,
  'alpha-strike': 2,
  'focus-fire': 2,
  'heat-crisis': 3,
  'mobility-kill': 3,
  'weapons-kill': 3,
  'rear-arc-hit': 3,
  overkill: 3,
};

/** Minimum BV advantage shift to trigger bv-swing-major (30 percentage points) */
const BV_SWING_THRESHOLD = 0.3;

/** Minimum number of attackers on same target per turn for focus-fire */
const FOCUS_FIRE_THRESHOLD = 3;

/** Minimum kills for ace-kill */
const ACE_KILL_THRESHOLD = 3;

/** Minimum enemy count for last-stand */
const LAST_STAND_ENEMY_THRESHOLD = 3;

/** BV ratio threshold for comeback disadvantage (team has < 50% of enemy BV) */
const COMEBACK_DISADVANTAGE_RATIO = 0.5;

/** Overkill damage multiplier (damage must exceed this * remaining structure) */
const OVERKILL_MULTIPLIER = 2;

/** Leg actuator component names that indicate mobility impairment */
const LEG_ACTUATOR_COMPONENTS = new Set([
  'hip',
  'upper_leg_actuator',
  'lower_leg_actuator',
  'foot_actuator',
]);

// =============================================================================
// Internal Tracking State
// =============================================================================

interface DetectorTrackingState {
  // Tier 1 tracking
  firstBloodDetected: boolean;
  destroyedUnits: Set<string>;
  killsPerUnit: Map<string, string[]>;
  previousBvAdvantage: number;
  minPlayerBvRatio: number;
  minOpponentBvRatio: number;
  comebackDetectedPlayer: boolean;
  comebackDetectedOpponent: boolean;
  wipeDetected: boolean;
  lastStandDetected: Set<string>;
  aceKillDetected: Set<string>;

  // Tier 2 tracking
  attacksPerTurnPerTarget: Map<number, Map<string, Set<string>>>;
  weaponsFiredPerTurnPerUnit: Map<number, Map<string, Set<string>>>;
  focusFireDetected: Map<number, Set<string>>;
  alphaStrikeDetected: Map<number, Set<string>>;

  // Tier 3 tracking
  armorPerUnit: Map<string, Record<string, number>>;
  structurePerUnit: Map<string, Record<string, number>>;
  destroyedWeaponsPerUnit: Map<string, Set<string>>;
  mobilityKillDetected: Set<string>;
  weaponsKillDetected: Set<string>;

  // ID generation
  momentCounter: number;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Calculates normalized BV advantage for the player side.
 * Returns value from -1.0 (total defeat) to +1.0 (total victory).
 * Returns 0.0 when both sides have zero BV.
 */
function calculateBvAdvantage(
  units: readonly BattleUnit[],
  destroyedUnits: Set<string>,
): number {
  let playerBv = 0;
  let opponentBv = 0;

  for (const unit of units) {
    if (destroyedUnits.has(unit.id)) continue;
    if (unit.side === GameSide.Player) {
      playerBv += unit.bv;
    } else {
      opponentBv += unit.bv;
    }
  }

  const totalBv = playerBv + opponentBv;
  if (totalBv === 0) return 0;
  return (playerBv - opponentBv) / totalBv;
}

/**
 * Calculates raw BV ratio (teamBV / opposingBV).
 * Returns Infinity if opposing BV is 0, or 0 if team BV is 0.
 */
function calculateBvRatio(
  units: readonly BattleUnit[],
  destroyedUnits: Set<string>,
  side: GameSide,
): number {
  let teamBv = 0;
  let opposingBv = 0;

  for (const unit of units) {
    if (destroyedUnits.has(unit.id)) continue;
    if (unit.side === side) {
      teamBv += unit.bv;
    } else {
      opposingBv += unit.bv;
    }
  }

  if (opposingBv === 0) return teamBv > 0 ? Infinity : 0;
  return teamBv / opposingBv;
}

/**
 * Counts operational (non-destroyed) units for a given side.
 */
function countOperationalUnits(
  units: readonly BattleUnit[],
  destroyedUnits: Set<string>,
  side: GameSide,
): number {
  let count = 0;
  for (const unit of units) {
    if (unit.side === side && !destroyedUnits.has(unit.id)) {
      count++;
    }
  }
  return count;
}

/**
 * Gets a unit name by ID, falling back to the ID itself.
 */
function getUnitName(units: readonly BattleUnit[], unitId: string): string {
  const unit = units.find((u) => u.id === unitId);
  return unit ? unit.name : unitId;
}

// =============================================================================
// KeyMomentDetector
// =============================================================================

/**
 * Detects significant battle moments from a stream of game events.
 *
 * Processes events in a single O(n) pass, maintaining internal tracking state
 * to identify 18 key moment types across 3 tiers of significance.
 *
 * @example
 * ```typescript
 * const detector = new KeyMomentDetector();
 * const moments = detector.detect(gameEvents, battleState);
 * const tier1 = moments.filter(m => m.tier === 1);
 * ```
 */
export class KeyMomentDetector {
  /**
   * Detects all key moments from a stream of game events.
   *
   * @param events - Ordered array of game events to process
   * @param battleState - Static battle context (units, BV, weapons)
   * @returns Array of detected key moments, sorted by event sequence
   */
  detect(
    events: readonly IGameEvent[],
    battleState: BattleState,
  ): IKeyMoment[] {
    const state = this.initializeTrackingState(battleState);
    const moments: IKeyMoment[] = [];

    for (const event of events) {
      const detected = this.processEvent(event, battleState, state);
      for (const moment of detected) {
        moments.push(moment);
      }
    }

    return this.deduplicateMoments(moments);
  }

  // ===========================================================================
  // Initialization
  // ===========================================================================

  private initializeTrackingState(
    battleState: BattleState,
  ): DetectorTrackingState {
    const armorPerUnit = new Map<string, Record<string, number>>();
    const structurePerUnit = new Map<string, Record<string, number>>();

    for (const unit of battleState.units) {
      armorPerUnit.set(unit.id, { ...unit.initialArmor });
      structurePerUnit.set(unit.id, { ...unit.initialStructure });
    }

    const initialAdvantage = calculateBvAdvantage(battleState.units, new Set());

    return {
      firstBloodDetected: false,
      destroyedUnits: new Set(),
      killsPerUnit: new Map(),
      previousBvAdvantage: initialAdvantage,
      minPlayerBvRatio: calculateBvRatio(
        battleState.units,
        new Set(),
        GameSide.Player,
      ),
      minOpponentBvRatio: calculateBvRatio(
        battleState.units,
        new Set(),
        GameSide.Opponent,
      ),
      comebackDetectedPlayer: false,
      comebackDetectedOpponent: false,
      wipeDetected: false,
      lastStandDetected: new Set(),
      aceKillDetected: new Set(),
      attacksPerTurnPerTarget: new Map(),
      weaponsFiredPerTurnPerUnit: new Map(),
      focusFireDetected: new Map(),
      alphaStrikeDetected: new Map(),
      armorPerUnit,
      structurePerUnit,
      destroyedWeaponsPerUnit: new Map(),
      mobilityKillDetected: new Set(),
      weaponsKillDetected: new Set(),
      momentCounter: 0,
    };
  }

  // ===========================================================================
  // Event Processing
  // ===========================================================================

  private processEvent(
    event: IGameEvent,
    battleState: BattleState,
    state: DetectorTrackingState,
  ): IKeyMoment[] {
    switch (event.type) {
      case GameEventType.UnitDestroyed:
        return this.processUnitDestroyed(event, battleState, state);

      case GameEventType.DamageApplied:
        return this.processDamageApplied(event, battleState, state);

      case GameEventType.AttackResolved:
        return this.processAttackResolved(event, battleState, state);

      case GameEventType.CriticalHit:
        return this.processCriticalHit(event, battleState, state);

      case GameEventType.AmmoExplosion:
        return this.processAmmoExplosion(event, battleState, state);

      case GameEventType.HeatEffectApplied:
        return this.processHeatEffectApplied(event, battleState, state);

      case GameEventType.PilotHit:
        return this.processPilotHit(event, battleState, state);

      default:
        return [];
    }
  }

  // ===========================================================================
  // Tier 1 - Game-Changing Events
  // ===========================================================================

  private processUnitDestroyed(
    event: IGameEvent,
    battleState: BattleState,
    state: DetectorTrackingState,
  ): IKeyMoment[] {
    const payload = getPayload<IUnitDestroyedPayload>(event);
    const moments: IKeyMoment[] = [];

    // Track the destruction
    state.destroyedUnits.add(payload.unitId);

    // Track kills
    if (payload.killerUnitId) {
      const kills = state.killsPerUnit.get(payload.killerUnitId) ?? [];
      kills.push(payload.unitId);
      state.killsPerUnit.set(payload.killerUnitId, kills);
    }

    // 1. First blood
    if (!state.firstBloodDetected) {
      state.firstBloodDetected = true;
      const relatedUnits = payload.killerUnitId
        ? [payload.killerUnitId, payload.unitId]
        : [payload.unitId];
      const killerName = payload.killerUnitId
        ? getUnitName(battleState.units, payload.killerUnitId)
        : 'Unknown';
      const victimName = getUnitName(battleState.units, payload.unitId);

      moments.push(
        this.createMoment(
          'first-blood',
          event,
          `First blood: ${killerName} destroyed ${victimName}`,
          relatedUnits,
          state,
        ),
      );
    }

    // 2. BV swing major
    const currentAdvantage = calculateBvAdvantage(
      battleState.units,
      state.destroyedUnits,
    );
    const swing = Math.abs(currentAdvantage - state.previousBvAdvantage);
    if (swing > BV_SWING_THRESHOLD) {
      const swingPercent = Math.round(swing * 100);
      const prevPercent = Math.round(state.previousBvAdvantage * 100);
      const currPercent = Math.round(currentAdvantage * 100);

      moments.push(
        this.createMoment(
          'bv-swing-major',
          event,
          `Major BV swing: ${swingPercent}% shift (from ${prevPercent > 0 ? '+' : ''}${prevPercent}% to ${currPercent > 0 ? '+' : ''}${currPercent}%)`,
          [payload.unitId],
          state,
          {
            swingPercent,
            bvBefore: prevPercent,
            bvAfter: currPercent,
          },
        ),
      );
    }
    state.previousBvAdvantage = currentAdvantage;

    const playerRatio = calculateBvRatio(
      battleState.units,
      state.destroyedUnits,
      GameSide.Player,
    );
    const opponentRatio = calculateBvRatio(
      battleState.units,
      state.destroyedUnits,
      GameSide.Opponent,
    );

    if (playerRatio < state.minPlayerBvRatio) {
      state.minPlayerBvRatio = playerRatio;
    }
    if (opponentRatio < state.minOpponentBvRatio) {
      state.minOpponentBvRatio = opponentRatio;
    }

    // 3. Comeback - player side
    if (
      !state.comebackDetectedPlayer &&
      state.minPlayerBvRatio < COMEBACK_DISADVANTAGE_RATIO &&
      playerRatio > 1.0
    ) {
      state.comebackDetectedPlayer = true;
      const playerUnits = battleState.units
        .filter(
          (u) => u.side === GameSide.Player && !state.destroyedUnits.has(u.id),
        )
        .map((u) => u.id);

      moments.push(
        this.createMoment(
          'comeback',
          event,
          `Player comeback from ${Math.round(state.minPlayerBvRatio * 100)}% BV disadvantage`,
          playerUnits,
          state,
          {
            side: GameSide.Player,
            minRatio: state.minPlayerBvRatio,
            currentRatio: playerRatio,
          },
        ),
      );
    }

    // 3. Comeback - opponent side
    if (
      !state.comebackDetectedOpponent &&
      state.minOpponentBvRatio < COMEBACK_DISADVANTAGE_RATIO &&
      opponentRatio > 1.0
    ) {
      state.comebackDetectedOpponent = true;
      const opponentUnits = battleState.units
        .filter(
          (u) =>
            u.side === GameSide.Opponent && !state.destroyedUnits.has(u.id),
        )
        .map((u) => u.id);

      moments.push(
        this.createMoment(
          'comeback',
          event,
          `Opponent comeback from ${Math.round(state.minOpponentBvRatio * 100)}% BV disadvantage`,
          opponentUnits,
          state,
          {
            side: GameSide.Opponent,
            minRatio: state.minOpponentBvRatio,
            currentRatio: opponentRatio,
          },
        ),
      );
    }

    // 4. Wipe - check if all units of one side destroyed
    if (!state.wipeDetected) {
      const destroyedSide = this.checkTeamWipe(battleState, state);
      if (destroyedSide !== undefined) {
        state.wipeDetected = true;
        const wipedUnits = battleState.units
          .filter((u) => u.side === destroyedSide)
          .map((u) => u.id);
        const sideName =
          destroyedSide === GameSide.Player ? 'Player' : 'Opponent';

        moments.push(
          this.createMoment(
            'wipe',
            event,
            `${sideName} team eliminated`,
            wipedUnits,
            state,
          ),
        );
      }
    }

    // 5. Last stand - check if either side has 1 unit vs 3+ enemies
    const playerCount = countOperationalUnits(
      battleState.units,
      state.destroyedUnits,
      GameSide.Player,
    );
    const opponentCount = countOperationalUnits(
      battleState.units,
      state.destroyedUnits,
      GameSide.Opponent,
    );

    if (playerCount === 1 && opponentCount >= LAST_STAND_ENEMY_THRESHOLD) {
      const loneUnit = battleState.units.find(
        (u) => u.side === GameSide.Player && !state.destroyedUnits.has(u.id),
      );
      if (loneUnit && !state.lastStandDetected.has(loneUnit.id)) {
        state.lastStandDetected.add(loneUnit.id);
        const enemyIds = battleState.units
          .filter(
            (u) =>
              u.side === GameSide.Opponent && !state.destroyedUnits.has(u.id),
          )
          .map((u) => u.id);

        moments.push(
          this.createMoment(
            'last-stand',
            event,
            `${loneUnit.name} last stand vs ${opponentCount} enemies`,
            [loneUnit.id, ...enemyIds],
            state,
          ),
        );
      }
    }

    if (opponentCount === 1 && playerCount >= LAST_STAND_ENEMY_THRESHOLD) {
      const loneUnit = battleState.units.find(
        (u) => u.side === GameSide.Opponent && !state.destroyedUnits.has(u.id),
      );
      if (loneUnit && !state.lastStandDetected.has(loneUnit.id)) {
        state.lastStandDetected.add(loneUnit.id);
        const enemyIds = battleState.units
          .filter(
            (u) =>
              u.side === GameSide.Player && !state.destroyedUnits.has(u.id),
          )
          .map((u) => u.id);

        moments.push(
          this.createMoment(
            'last-stand',
            event,
            `${loneUnit.name} last stand vs ${playerCount} enemies`,
            [loneUnit.id, ...enemyIds],
            state,
          ),
        );
      }
    }

    // 6. Ace kill - check if killer has 3+ kills
    if (payload.killerUnitId) {
      const kills = state.killsPerUnit.get(payload.killerUnitId) ?? [];
      if (
        kills.length >= ACE_KILL_THRESHOLD &&
        !state.aceKillDetected.has(payload.killerUnitId)
      ) {
        state.aceKillDetected.add(payload.killerUnitId);
        const aceName = getUnitName(battleState.units, payload.killerUnitId);

        moments.push(
          this.createMoment(
            'ace-kill',
            event,
            `${aceName} achieves ace status with ${kills.length} kills`,
            [payload.killerUnitId, ...kills],
            state,
            { kills: kills.length },
          ),
        );
      }
    }

    return moments;
  }

  private checkTeamWipe(
    battleState: BattleState,
    state: DetectorTrackingState,
  ): GameSide | undefined {
    const playerCount = countOperationalUnits(
      battleState.units,
      state.destroyedUnits,
      GameSide.Player,
    );
    const opponentCount = countOperationalUnits(
      battleState.units,
      state.destroyedUnits,
      GameSide.Opponent,
    );

    const totalPlayer = battleState.units.filter(
      (u) => u.side === GameSide.Player,
    ).length;
    const totalOpponent = battleState.units.filter(
      (u) => u.side === GameSide.Opponent,
    ).length;

    if (playerCount === 0 && totalPlayer > 0) return GameSide.Player;
    if (opponentCount === 0 && totalOpponent > 0) return GameSide.Opponent;
    return undefined;
  }

  // ===========================================================================
  // Tier 2 - Significant Tactical Events
  // ===========================================================================

  private processAttackResolved(
    event: IGameEvent,
    battleState: BattleState,
    state: DetectorTrackingState,
  ): IKeyMoment[] {
    const payload = getPayload<IAttackResolvedExtended>(event);
    const moments: IKeyMoment[] = [];

    if (!payload.hit) return moments;

    // Track attacks per target per turn for focus-fire
    if (!state.attacksPerTurnPerTarget.has(event.turn)) {
      state.attacksPerTurnPerTarget.set(event.turn, new Map());
    }
    const turnTargets = state.attacksPerTurnPerTarget.get(event.turn)!;
    if (!turnTargets.has(payload.targetId)) {
      turnTargets.set(payload.targetId, new Set());
    }
    turnTargets.get(payload.targetId)!.add(payload.attackerId);

    // Track weapons fired per unit per turn for alpha-strike
    if (!state.weaponsFiredPerTurnPerUnit.has(event.turn)) {
      state.weaponsFiredPerTurnPerUnit.set(event.turn, new Map());
    }
    const turnUnits = state.weaponsFiredPerTurnPerUnit.get(event.turn)!;
    if (!turnUnits.has(payload.attackerId)) {
      turnUnits.set(payload.attackerId, new Set());
    }
    turnUnits.get(payload.attackerId)!.add(payload.weaponId);

    // 12. Alpha strike - unit fires all weapons in one turn
    const attackerUnit = battleState.units.find(
      (u) => u.id === payload.attackerId,
    );
    if (attackerUnit && attackerUnit.weaponIds.length > 0) {
      const firedWeapons = turnUnits.get(payload.attackerId)!;
      if (!state.alphaStrikeDetected.has(event.turn)) {
        state.alphaStrikeDetected.set(event.turn, new Set());
      }
      const turnAlphas = state.alphaStrikeDetected.get(event.turn)!;

      if (
        firedWeapons.size >= attackerUnit.weaponIds.length &&
        !turnAlphas.has(payload.attackerId)
      ) {
        turnAlphas.add(payload.attackerId);

        moments.push(
          this.createMoment(
            'alpha-strike',
            event,
            `${attackerUnit.name} fires all ${attackerUnit.weaponIds.length} weapons`,
            [payload.attackerId, payload.targetId],
            state,
            { weaponCount: attackerUnit.weaponIds.length },
          ),
        );
      }
    }

    // 13. Focus fire - 3+ units attack same target in one turn
    const attackersOnTarget = turnTargets.get(payload.targetId)!;
    if (attackersOnTarget.size >= FOCUS_FIRE_THRESHOLD) {
      if (!state.focusFireDetected.has(event.turn)) {
        state.focusFireDetected.set(event.turn, new Set());
      }
      const turnFocus = state.focusFireDetected.get(event.turn)!;

      if (!turnFocus.has(payload.targetId)) {
        turnFocus.add(payload.targetId);
        const targetName = getUnitName(battleState.units, payload.targetId);
        const attackerIds = Array.from(attackersOnTarget);

        moments.push(
          this.createMoment(
            'focus-fire',
            event,
            `${attackersOnTarget.size} units focus fire on ${targetName}`,
            [...attackerIds, payload.targetId],
            state,
            { attackerCount: attackersOnTarget.size },
          ),
        );
      }
    }

    // 17. Rear arc hit
    if (payload.attackerFacing === 'rear') {
      const attackerName = getUnitName(battleState.units, payload.attackerId);
      const targetName = getUnitName(battleState.units, payload.targetId);

      moments.push(
        this.createMoment(
          'rear-arc-hit',
          event,
          `Rear arc hit on ${targetName} by ${attackerName}`,
          [payload.attackerId, payload.targetId],
          state,
          { location: payload.location },
        ),
      );
    }

    return moments;
  }

  private processDamageApplied(
    event: IGameEvent,
    battleState: BattleState,
    state: DetectorTrackingState,
  ): IKeyMoment[] {
    const payload = getPayload<IDamageAppliedPayload>(event);
    const moments: IKeyMoment[] = [];

    // Get pre-damage structure for overkill detection
    const unitStructure = state.structurePerUnit.get(payload.unitId);
    const unitArmor = state.armorPerUnit.get(payload.unitId);
    const preDamageStructure = unitStructure?.[payload.location] ?? 0;
    const preDamageArmor = unitArmor?.[payload.location] ?? 0;

    if (unitArmor) {
      unitArmor[payload.location] = payload.armorRemaining;
    }
    if (unitStructure) {
      unitStructure[payload.location] = payload.structureRemaining;
    }

    // 7. Head shot - damage to head location
    if (payload.location === 'head' && payload.damage > 0) {
      const targetName = getUnitName(battleState.units, payload.unitId);
      const relatedUnits = payload.sourceUnitId
        ? [payload.sourceUnitId, payload.unitId]
        : [payload.unitId];
      const attackerName = payload.sourceUnitId
        ? getUnitName(battleState.units, payload.sourceUnitId)
        : 'Unknown';

      moments.push(
        this.createMoment(
          'head-shot',
          event,
          `Head hit on ${targetName} by ${attackerName} for ${payload.damage} damage`,
          relatedUnits,
          state,
          { damage: payload.damage, location: 'head' },
        ),
      );
    }

    // 18. Overkill - damage significantly exceeds what the location could absorb
    if (preDamageStructure > 0) {
      const damageToStructure = Math.max(0, payload.damage - preDamageArmor);
      if (damageToStructure > OVERKILL_MULTIPLIER * preDamageStructure) {
        const targetName = getUnitName(battleState.units, payload.unitId);
        const relatedUnits = payload.sourceUnitId
          ? [payload.sourceUnitId, payload.unitId]
          : [payload.unitId];

        moments.push(
          this.createMoment(
            'overkill',
            event,
            `Overkill on ${targetName}: ${payload.damage} damage to ${payload.location} (${Math.round(damageToStructure / preDamageStructure)}x excess)`,
            relatedUnits,
            state,
            {
              damage: payload.damage,
              location: payload.location,
              preDamageStructure,
              excessMultiplier: Math.round(
                damageToStructure / preDamageStructure,
              ),
            },
          ),
        );
      }
    }

    return moments;
  }

  private processCriticalHit(
    event: IGameEvent,
    battleState: BattleState,
    state: DetectorTrackingState,
  ): IKeyMoment[] {
    const payload = getPayload<ICriticalHitPayload>(event);
    const moments: IKeyMoment[] = [];
    const targetName = getUnitName(battleState.units, payload.unitId);
    const relatedUnits = payload.sourceUnitId
      ? [payload.sourceUnitId, payload.unitId]
      : [payload.unitId];

    // 10. Critical engine
    if (payload.component === 'engine') {
      moments.push(
        this.createMoment(
          'critical-engine',
          event,
          `Engine critical hit on ${targetName}`,
          relatedUnits,
          state,
        ),
      );
    }

    // 11. Critical gyro
    if (payload.component === 'gyro') {
      moments.push(
        this.createMoment(
          'critical-gyro',
          event,
          `Gyro critical hit on ${targetName}`,
          relatedUnits,
          state,
        ),
      );
    }

    // 15. Mobility kill - leg actuator critical hit
    if (LEG_ACTUATOR_COMPONENTS.has(payload.component)) {
      if (!state.mobilityKillDetected.has(payload.unitId)) {
        state.mobilityKillDetected.add(payload.unitId);

        moments.push(
          this.createMoment(
            'mobility-kill',
            event,
            `Mobility kill on ${targetName}: ${payload.component} destroyed`,
            relatedUnits,
            state,
            { component: payload.component, location: payload.location },
          ),
        );
      }
    }

    // 16. Weapons kill - track destroyed weapons
    const unit = battleState.units.find((u) => u.id === payload.unitId);
    if (unit && unit.weaponIds.includes(payload.component)) {
      if (!state.destroyedWeaponsPerUnit.has(payload.unitId)) {
        state.destroyedWeaponsPerUnit.set(payload.unitId, new Set());
      }
      const destroyed = state.destroyedWeaponsPerUnit.get(payload.unitId)!;
      destroyed.add(payload.component);

      if (
        destroyed.size >= unit.weaponIds.length &&
        !state.weaponsKillDetected.has(payload.unitId)
      ) {
        state.weaponsKillDetected.add(payload.unitId);

        moments.push(
          this.createMoment(
            'weapons-kill',
            event,
            `All weapons destroyed on ${targetName}`,
            relatedUnits,
            state,
            { destroyedWeapons: Array.from(destroyed) },
          ),
        );
      }
    }

    return moments;
  }

  private processAmmoExplosion(
    event: IGameEvent,
    battleState: BattleState,
    state: DetectorTrackingState,
  ): IKeyMoment[] {
    const payload = getPayload<IAmmoExplosionPayload>(event);
    const unitName = getUnitName(battleState.units, payload.unitId);

    return [
      this.createMoment(
        'ammo-explosion',
        event,
        `Ammo explosion in ${unitName} at ${payload.location}`,
        [payload.unitId],
        state,
        { damage: payload.damage, location: payload.location },
      ),
    ];
  }

  private processHeatEffectApplied(
    event: IGameEvent,
    battleState: BattleState,
    state: DetectorTrackingState,
  ): IKeyMoment[] {
    const payload = getPayload<IHeatEffectAppliedPayload>(event);

    if (payload.effect !== 'shutdown') return [];

    const unitName = getUnitName(battleState.units, payload.unitId);

    return [
      this.createMoment(
        'heat-crisis',
        event,
        `Heat shutdown: ${unitName} shut down (${payload.heat} heat)`,
        [payload.unitId],
        state,
        { heat: payload.heat },
      ),
    ];
  }

  private processPilotHit(
    event: IGameEvent,
    battleState: BattleState,
    state: DetectorTrackingState,
  ): IKeyMoment[] {
    const payload = getPayload<IPilotHitPayload>(event);

    if (payload.consciousnessCheckPassed !== false) return [];

    const unitName = getUnitName(battleState.units, payload.unitId);
    const relatedUnits = event.actorId
      ? [event.actorId, payload.unitId]
      : [payload.unitId];

    return [
      this.createMoment(
        'pilot-kill',
        event,
        `Pilot killed in ${unitName} (${payload.totalWounds} wounds)`,
        relatedUnits,
        state,
        { wounds: payload.totalWounds, source: payload.source },
      ),
    ];
  }

  // ===========================================================================
  // Utility Methods
  // ===========================================================================

  private createMoment(
    type: KeyMomentType,
    event: IGameEvent,
    description: string,
    relatedUnitIds: string[],
    state: DetectorTrackingState,
    metadata?: Record<string, unknown>,
  ): IKeyMoment {
    const id = `km-${type}-${event.turn}-${state.momentCounter++}`;

    return {
      id,
      type,
      tier: TIER_MAP[type],
      turn: event.turn,
      phase: event.phase,
      description,
      relatedUnitIds,
      metadata,
      timestamp: Date.parse(event.timestamp) || Date.now(),
    };
  }

  /**
   * Removes duplicate moments with the same type, turn, and related units.
   */
  private deduplicateMoments(moments: IKeyMoment[]): IKeyMoment[] {
    const seen = new Set<string>();
    const result: IKeyMoment[] = [];

    for (const moment of moments) {
      const key = `${moment.type}-${moment.turn}-${[...moment.relatedUnitIds].sort().join(',')}`;
      if (!seen.has(key)) {
        seen.add(key);
        result.push(moment);
      }
    }

    return result;
  }
}
