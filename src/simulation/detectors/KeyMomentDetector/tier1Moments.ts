/**
 * Tier 1 moment detection - Game-changing events
 * Detects: first-blood, bv-swing-major, comeback, wipe, last-stand, ace-kill
 */

import type { IKeyMoment } from '@/types/simulation-viewer/IKeyMoment';

import {
  GameEventType,
  GameSide,
  type IGameEvent,
  type IUnitDestroyedPayload,
} from '@/types/gameplay/GameSessionInterfaces';

import { getPayload } from '../utils/getPayload';
import {
  type BattleState,
  type BattleUnit,
  type DetectorTrackingState,
  ACE_KILL_THRESHOLD,
  COMEBACK_DISADVANTAGE_RATIO,
  LAST_STAND_ENEMY_THRESHOLD,
  BV_SWING_THRESHOLD,
  TIER_MAP,
  calculateBvAdvantage,
  calculateBvRatio,
  countOperationalUnits,
  getUnitName,
} from './types';

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
  createMoment: (
    type: string,
    event: IGameEvent,
    description: string,
    relatedUnitIds: string[],
    state: DetectorTrackingState,
    metadata?: Record<string, unknown>,
  ) => IKeyMoment,
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
      createMoment(
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
      createMoment(
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
        (u) => u.side === GameSide.Opponent && !state.destroyedUnits.has(u.id),
      )
      .map((u) => u.id);

    moments.push(
      createMoment(
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
    const destroyedSide = checkTeamWipe(battleState, state);
    if (destroyedSide !== undefined) {
      state.wipeDetected = true;
      const wipedUnits = battleState.units
        .filter((u) => u.side === destroyedSide)
        .map((u) => u.id);
      const sideName =
        destroyedSide === GameSide.Player ? 'Player' : 'Opponent';

      moments.push(
        createMoment(
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
        createMoment(
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
          (u) => u.side === GameSide.Player && !state.destroyedUnits.has(u.id),
        )
        .map((u) => u.id);

      moments.push(
        createMoment(
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
        createMoment(
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
