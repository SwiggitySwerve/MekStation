import { GamePhase, IGameSession } from '@/types/gameplay';

import {
  resolveBattleMechAmmoExplosionPilotDamage,
  type CASEProtectionLevel,
} from './ammoTracking';
import {
  PILOT_DEATH_WOUND_THRESHOLD,
  resolvePilotConsciousnessCheck,
} from './damage';
import { type DiceRoller } from './diceTypes';
import { createPilotHitEvent } from './gameEvents';
import { appendEvent } from './gameSessionCore';
import { createD6RollerFromDiceRoller } from './gameSessionHeat.helpers';

export function appendHeatAmmoExplosionPilotDamage(
  session: IGameSession,
  unitId: string,
  totalExplosionDamage: number,
  caseProtection: CASEProtectionLevel,
  diceRoller: DiceRoller,
): { readonly session: IGameSession; readonly pilotDestroyed: boolean } {
  const unit = session.currentState.units[unitId];
  if (!unit) {
    return { session, pilotDestroyed: false };
  }

  const pilotDamage = resolveBattleMechAmmoExplosionPilotDamage({
    totalDamage: totalExplosionDamage,
    caseProtection,
    pilotAbilities: unit.abilities,
  });
  if (pilotDamage <= 0) {
    return { session, pilotDestroyed: false };
  }

  const totalWounds = unit.pilotWounds + pilotDamage;
  const d6Roller = createD6RollerFromDiceRoller(diceRoller);
  const consciousnessCheck = resolvePilotConsciousnessCheck(
    totalWounds,
    pilotDamage,
    unit.abilities,
    d6Roller,
    unit.pilotToughness,
    {
      edgePointsRemaining: unit.edgePointsRemaining,
      turn: session.currentState.turn,
      unitId,
    },
  );
  const consciousnessPassed =
    unit.pilotConscious &&
    (consciousnessCheck.conscious ?? true) &&
    totalWounds < PILOT_DEATH_WOUND_THRESHOLD;
  const edgeOutcome = {
    edgePointsRemaining: consciousnessCheck.edgePointsRemaining,
    edgeTrigger: consciousnessCheck.edgeTrigger,
    edgeSuperseded: consciousnessCheck.edgeSuperseded,
    edgeReroll: consciousnessCheck.edgeReroll,
  };
  const currentSession = appendEvent(
    session,
    createPilotHitEvent(
      session.id,
      session.events.length,
      session.currentState.turn,
      GamePhase.Heat,
      unitId,
      pilotDamage,
      totalWounds,
      'ammo_explosion',
      consciousnessCheck.consciousnessCheckRequired,
      consciousnessPassed,
      edgeOutcome,
    ),
  );

  return {
    session: currentSession,
    pilotDestroyed: totalWounds >= PILOT_DEATH_WOUND_THRESHOLD,
  };
}
