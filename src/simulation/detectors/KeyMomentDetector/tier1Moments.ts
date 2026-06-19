/**
 * Tier 1 moment detection - Game-changing events
 * Detects: first-blood, bv-swing-major, comeback, wipe, last-stand, ace-kill
 */

import type { IKeyMoment } from '@/types/simulation-viewer/IKeyMoment';

import {
  GameEventType,
  GameSide,
  type IGameEvent,
} from '@/types/gameplay/GameSessionInterfaces';

import { getPayload } from '../utils/getPayload';
import {
  type BattleState,
  type DetectorTrackingState,
  type MomentFactory,
  ACE_KILL_THRESHOLD,
  COMEBACK_DISADVANTAGE_RATIO,
  LAST_STAND_ENEMY_THRESHOLD,
  BV_SWING_THRESHOLD,
  calculateBvAdvantage,
  calculateBvRatio,
  countOperationalUnits,
  getUnitName,
} from './types';

type UnitDestroyedPayload = ReturnType<typeof unitDestroyedPayload>;
type BattleUnit = BattleState['units'][number];

interface UnitDestroyedContext {
  readonly event: IGameEvent;
  readonly battleState: BattleState;
  readonly state: DetectorTrackingState;
  readonly createMoment: MomentFactory;
  readonly payload: UnitDestroyedPayload;
}

/**
 * Processes UnitDestroyed events and detects all Tier 1 moments:
 * - first-blood
 * - bv-swing-major
 * - comeback (player and opponent)
 * - wipe
 * - last-stand
 * - ace-kill
 */
export function processUnitDestroyed(
  event: IGameEvent,
  battleState: BattleState,
  state: DetectorTrackingState,
  createMoment: MomentFactory,
): IKeyMoment[] {
  const payload = unitDestroyedPayload(event);
  trackDestroyedUnit(payload, state);
  const context = { event, battleState, state, createMoment, payload };
  const currentAdvantage = calculateBvAdvantage(
    battleState.units,
    state.destroyedUnits,
  );
  const ratios = updateBvRatios(battleState, state);

  return [
    ...detectFirstBlood(context),
    ...detectBvSwing(context, currentAdvantage),
    ...detectComebacks(context, ratios),
    ...detectTeamWipe(context),
    ...detectLastStands(context),
    ...detectAceKill(context),
  ];
}

function unitDestroyedPayload(event: IGameEvent) {
  return getPayload(event, GameEventType.UnitDestroyed);
}

function trackDestroyedUnit(
  payload: UnitDestroyedPayload,
  state: DetectorTrackingState,
): void {
  state.destroyedUnits.add(payload.unitId);
  if (!payload.killerUnitId) return;
  const kills = state.killsPerUnit.get(payload.killerUnitId) ?? [];
  kills.push(payload.unitId);
  state.killsPerUnit.set(payload.killerUnitId, kills);
}

function detectFirstBlood({
  event,
  battleState,
  state,
  createMoment,
  payload,
}: UnitDestroyedContext): IKeyMoment[] {
  if (state.firstBloodDetected) return [];
  state.firstBloodDetected = true;
  const relatedUnits = payload.killerUnitId
    ? [payload.killerUnitId, payload.unitId]
    : [payload.unitId];
  const killerName = payload.killerUnitId
    ? getUnitName(battleState.units, payload.killerUnitId)
    : 'Unknown';
  const victimName = getUnitName(battleState.units, payload.unitId);

  return [
    createMoment(
      'first-blood',
      event,
      `First blood: ${killerName} destroyed ${victimName}`,
      relatedUnits,
      state,
    ),
  ];
}

function detectBvSwing(
  { event, state, createMoment, payload }: UnitDestroyedContext,
  currentAdvantage: number,
): IKeyMoment[] {
  const swing = Math.abs(currentAdvantage - state.previousBvAdvantage);
  const previousAdvantage = state.previousBvAdvantage;
  state.previousBvAdvantage = currentAdvantage;
  if (swing <= BV_SWING_THRESHOLD) return [];

  const swingPercent = Math.round(swing * 100);
  const prevPercent = Math.round(previousAdvantage * 100);
  const currPercent = Math.round(currentAdvantage * 100);
  return [
    createMoment(
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
  ];
}

interface BvRatios {
  readonly playerRatio: number;
  readonly opponentRatio: number;
}

function updateBvRatios(
  battleState: BattleState,
  state: DetectorTrackingState,
): BvRatios {
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
  return { playerRatio, opponentRatio };
}

function detectComebacks(
  context: UnitDestroyedContext,
  ratios: BvRatios,
): IKeyMoment[] {
  return [
    ...detectComebackForSide(context, GameSide.Player, ratios.playerRatio),
    ...detectComebackForSide(context, GameSide.Opponent, ratios.opponentRatio),
  ];
}

function detectComebackForSide(
  { event, battleState, state, createMoment }: UnitDestroyedContext,
  side: GameSide,
  currentRatio: number,
): IKeyMoment[] {
  const sideState = comebackSideState(state, side);
  if (
    sideState.detected ||
    sideState.minRatio >= COMEBACK_DISADVANTAGE_RATIO ||
    currentRatio <= 1.0
  ) {
    return [];
  }

  if (side === GameSide.Player) {
    state.comebackDetectedPlayer = true;
  } else {
    state.comebackDetectedOpponent = true;
  }

  const sideName = side === GameSide.Player ? 'Player' : 'Opponent';
  return [
    createMoment(
      'comeback',
      event,
      `${sideName} comeback from ${Math.round(sideState.minRatio * 100)}% BV disadvantage`,
      operationalUnitIds(battleState.units, state, side),
      state,
      {
        side,
        minRatio: sideState.minRatio,
        currentRatio,
      },
    ),
  ];
}

function comebackSideState(
  state: DetectorTrackingState,
  side: GameSide,
): { readonly detected: boolean; readonly minRatio: number } {
  return side === GameSide.Player
    ? {
        detected: state.comebackDetectedPlayer,
        minRatio: state.minPlayerBvRatio,
      }
    : {
        detected: state.comebackDetectedOpponent,
        minRatio: state.minOpponentBvRatio,
      };
}

function detectTeamWipe({
  event,
  battleState,
  state,
  createMoment,
}: UnitDestroyedContext): IKeyMoment[] {
  if (state.wipeDetected) return [];
  const destroyedSide = checkTeamWipe(battleState, state);
  if (destroyedSide === undefined) return [];

  state.wipeDetected = true;
  const sideName = destroyedSide === GameSide.Player ? 'Player' : 'Opponent';
  return [
    createMoment(
      'wipe',
      event,
      `${sideName} team eliminated`,
      unitIdsForSide(battleState.units, destroyedSide),
      state,
    ),
  ];
}

function detectLastStands(context: UnitDestroyedContext): IKeyMoment[] {
  const { battleState, state } = context;
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
  return [
    ...detectLastStandForSide(
      context,
      GameSide.Player,
      playerCount,
      opponentCount,
    ),
    ...detectLastStandForSide(
      context,
      GameSide.Opponent,
      opponentCount,
      playerCount,
    ),
  ];
}

function detectLastStandForSide(
  { event, battleState, state, createMoment }: UnitDestroyedContext,
  side: GameSide,
  sideCount: number,
  enemyCount: number,
): IKeyMoment[] {
  if (sideCount !== 1 || enemyCount < LAST_STAND_ENEMY_THRESHOLD) return [];

  const loneUnit = battleState.units.find(
    (u) => u.side === side && !state.destroyedUnits.has(u.id),
  );
  if (!loneUnit || state.lastStandDetected.has(loneUnit.id)) return [];

  state.lastStandDetected.add(loneUnit.id);
  const enemySide =
    side === GameSide.Player ? GameSide.Opponent : GameSide.Player;
  return [
    createMoment(
      'last-stand',
      event,
      `${loneUnit.name} last stand vs ${enemyCount} enemies`,
      [loneUnit.id, ...operationalUnitIds(battleState.units, state, enemySide)],
      state,
    ),
  ];
}

function detectAceKill({
  event,
  battleState,
  state,
  createMoment,
  payload,
}: UnitDestroyedContext): IKeyMoment[] {
  if (!payload.killerUnitId) return [];
  const kills = state.killsPerUnit.get(payload.killerUnitId) ?? [];
  if (
    kills.length < ACE_KILL_THRESHOLD ||
    state.aceKillDetected.has(payload.killerUnitId)
  ) {
    return [];
  }

  state.aceKillDetected.add(payload.killerUnitId);
  const aceName = getUnitName(battleState.units, payload.killerUnitId);
  return [
    createMoment(
      'ace-kill',
      event,
      `${aceName} achieves ace status with ${kills.length} kills`,
      [payload.killerUnitId, ...kills],
      state,
      { kills: kills.length },
    ),
  ];
}

function unitIdsForSide(
  units: readonly BattleUnit[],
  side: GameSide,
): string[] {
  return units.filter((u) => u.side === side).map((u) => u.id);
}

function operationalUnitIds(
  units: readonly BattleUnit[],
  state: DetectorTrackingState,
  side: GameSide,
): string[] {
  return units
    .filter((u) => u.side === side && !state.destroyedUnits.has(u.id))
    .map((u) => u.id);
}

function checkTeamWipe(
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
