import type { IWeapon } from '@/simulation/ai/types';
import type { IGameSession } from '@/types/gameplay/GameSessionInterfaces';

import { BotPlayer } from '@/simulation/ai/BotPlayer';
import { createRetreatTriggeredEvent } from '@/utils/gameplay/gameEvents';
import { appendEvent } from '@/utils/gameplay/gameSession';

import { toAIUnitState } from './GameEngine.helpers';
import { canUnitAct } from './GameEngine.phaseGuards';

/**
 * Per `wire-bot-ai-helpers-and-capstone`: invoke the bot's retreat
 * evaluator for each living unit and append any RetreatTriggered events.
 */
export function emitRetreatTriggers(
  session: IGameSession,
  botPlayer: BotPlayer,
  weaponsByUnit: Map<string, readonly IWeapon[]>,
  gunneryByUnit: Map<string, number>,
): IGameSession {
  let updated = session;
  for (const unitId of Object.keys(updated.currentState.units)) {
    const unit = updated.currentState.units[unitId];
    if (!canUnitAct(unit)) continue;
    const weapons = weaponsByUnit.get(unitId) ?? [];
    const gunnery = gunneryByUnit.get(unitId) ?? 4;
    const aiUnit = toAIUnitState(unit, weapons, gunnery);
    const evt = botPlayer.evaluateRetreat(aiUnit, updated);
    if (!evt) continue;
    const sequence = updated.events.length;
    const { turn, phase } = updated.currentState;
    updated = appendEvent(
      updated,
      createRetreatTriggeredEvent(
        updated.id,
        sequence,
        turn,
        phase,
        evt.payload.unitId,
        evt.payload.edge,
        evt.payload.reason,
      ),
    );
  }
  return updated;
}
