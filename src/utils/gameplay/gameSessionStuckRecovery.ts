import type { IGameSession, IHexGrid } from '@/types/gameplay';

import { GamePhase } from '@/types/gameplay';

import { type D6Roller, defaultD6Roller } from './diceTypes';
import { createPSRResolvedEvent, createPSRTriggeredEvent } from './gameEvents';
import { appendEvent } from './gameSessionEvents';
import { createDefaultComponentDamage } from './gameSessionPSRResolution';
import {
  createStuckRecoveryPSR,
  rollStuckRecoveryPSR,
  stuckUnitIdsForRecovery,
} from './movement/stuckRecovery';

/**
 * Session adapter for the shared movement-start recovery roll (MegaMek
 * 48fcb2f64 TWPhasePreparationManager L241, TWGameManager.doTryUnstuck
 * L31368-L31419). Call it right after the session advances into Movement,
 * before any unit moves. Each stuck unit that can act appends a `swamp_unstuck`
 * `PSRTriggered` and its `PSRResolved`; the reducer frees the unit on a pass
 * and leaves it stuck, with no fall, on a failure. With no stuck unit nothing
 * is appended and no die is drawn.
 */
export function rollSessionStuckRecovery(
  session: IGameSession,
  grid: IHexGrid | undefined,
  d6Roller: D6Roller = defaultD6Roller,
): IGameSession {
  let next = session;
  for (const unitId of stuckUnitIdsForRecovery(session.currentState.units)) {
    const gameUnit = next.units.find((entry) => entry.id === unitId);
    if (!gameUnit) continue;
    const unit = next.currentState.units[unitId];
    const { turn } = next.currentState;
    const psr = createStuckRecoveryPSR(grid, unitId, unit);

    next = appendEvent(
      next,
      createPSRTriggeredEvent(
        next.id,
        next.events.length,
        turn,
        GamePhase.Movement,
        unitId,
        psr.reason,
        psr.additionalModifier,
        psr.triggerSource,
        gameUnit.piloting,
        psr.reasonCode,
      ),
    );

    const result = rollStuckRecoveryPSR({
      unit,
      psr,
      piloting: gameUnit.piloting,
      componentDamage: unit.componentDamage ?? createDefaultComponentDamage(),
      d6Roller,
    });
    next = appendEvent(
      next,
      createPSRResolvedEvent(
        next.id,
        next.events.length,
        turn,
        GamePhase.Movement,
        unitId,
        result.targetNumber,
        result.roll,
        result.modifiers.reduce((total, modifier) => total + modifier.value, 0),
        result.passed,
        psr.reason,
        psr.reasonCode,
      ),
    );
  }
  return next;
}
