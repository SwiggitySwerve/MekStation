import { GamePhase, IGameSession, PSRTrigger } from '@/types/gameplay';

import type { D6Roller } from './diceTypes';

import {
  PILOT_DEATH_WOUND_THRESHOLD,
  resolveDamage as resolveDamagePipeline,
  resolvePilotConsciousnessCheck,
} from './damage';
import {
  createDamageAppliedEvent,
  createPilotHitEvent,
  createUnitFellEvent,
} from './gameEvents';
import {
  appendUnitDestroyedEvent,
  buildDamageStateFromUnit,
} from './gameSessionAttackResolutionHelpers';
import { appendEvent } from './gameSessionCore';
import {
  resolveDfaMissFallDamage,
  resolveDfaMissFallPilotDamageAvoidance,
} from './physicalAttacks';

export function appendDfaMissFallDamage(
  session: IGameSession,
  options: {
    readonly turn: number;
    readonly attackerId: string;
    readonly attackerTonnage: number;
    readonly attackerPilotingSkill: number;
    readonly attackerPilotAbilities?: readonly string[];
    readonly attackerFacing: IGameSession['currentState']['units'][string]['facing'];
    readonly d6Roller: D6Roller;
  },
): IGameSession {
  const {
    attackerFacing,
    attackerId,
    attackerPilotingSkill,
    attackerPilotAbilities,
    attackerTonnage,
    d6Roller,
    turn,
  } = options;
  const fall = resolveDfaMissFallDamage(
    attackerTonnage,
    attackerFacing,
    d6Roller,
  );

  let currentSession = session;
  for (const cluster of fall.clusters) {
    const attacker = currentSession.currentState.units[attackerId];
    if (!attacker || attacker.destroyed) break;

    const damageState = buildDamageStateFromUnit(attacker);
    const damageResult = resolveDamagePipeline(
      damageState,
      cluster.location,
      cluster.damage,
    );
    for (const locationDamage of damageResult.result.locationDamages) {
      const damageSeq = currentSession.events.length;
      currentSession = appendEvent(
        currentSession,
        createDamageAppliedEvent(
          currentSession.id,
          damageSeq,
          turn,
          attackerId,
          locationDamage.location,
          locationDamage.damage,
          locationDamage.armorRemaining,
          locationDamage.structureRemaining,
          locationDamage.destroyed,
        ),
      );
    }
  }

  const fallSeq = currentSession.events.length;
  const attacker = currentSession.currentState.units[attackerId];
  const pilotAbilities = attackerPilotAbilities ?? attacker?.abilities ?? [];
  const pilotDamageAvoidance = resolveDfaMissFallPilotDamageAvoidance(
    attackerPilotingSkill,
    fall.fallHeight,
    d6Roller,
    pilotAbilities,
  );
  currentSession = appendEvent(
    currentSession,
    createUnitFellEvent(
      currentSession.id,
      fallSeq,
      turn,
      GamePhase.PhysicalAttack,
      attackerId,
      fall.fallDamage,
      fall.newFacing,
      pilotDamageAvoidance.pilotDamage,
      'dfa_miss',
      'Missed DFA',
      PSRTrigger.DFAMiss,
    ),
  );
  return appendDfaMissFallPilotDamage(currentSession, {
    turn,
    attackerId,
    pilotDamage: pilotDamageAvoidance.pilotDamage,
    pilotAbilities,
    d6Roller,
  });
}

function appendDfaMissFallPilotDamage(
  session: IGameSession,
  options: {
    readonly turn: number;
    readonly attackerId: string;
    readonly pilotDamage: number;
    readonly pilotAbilities: readonly string[];
    readonly d6Roller: D6Roller;
  },
): IGameSession {
  const { attackerId, d6Roller, pilotAbilities, pilotDamage, turn } = options;
  if (pilotDamage <= 0) {
    return session;
  }

  const attacker = session.currentState.units[attackerId];
  if (!attacker) {
    return session;
  }

  const totalWounds = attacker.pilotWounds + pilotDamage;
  const consciousnessCheck = resolvePilotConsciousnessCheck(
    totalWounds,
    pilotDamage,
    pilotAbilities,
    d6Roller,
    attacker.pilotToughness,
    {
      edgePointsRemaining: attacker.edgePointsRemaining,
      turn,
      unitId: attackerId,
    },
  );
  const consciousnessPassed =
    totalWounds < PILOT_DEATH_WOUND_THRESHOLD &&
    attacker.pilotConscious &&
    (consciousnessCheck.conscious ?? true);
  const pilotKilled =
    totalWounds >= PILOT_DEATH_WOUND_THRESHOLD && !attacker.destroyed;

  let currentSession = appendEvent(
    session,
    createPilotHitEvent(
      session.id,
      session.events.length,
      turn,
      GamePhase.PhysicalAttack,
      attackerId,
      pilotDamage,
      totalWounds,
      'fall',
      consciousnessCheck.consciousnessCheckRequired,
      consciousnessPassed,
      {
        edgeReroll: consciousnessCheck.edgeReroll,
        edgeSuperseded: consciousnessCheck.edgeSuperseded,
        edgeTrigger: consciousnessCheck.edgeTrigger,
        edgePointsRemaining: consciousnessCheck.edgePointsRemaining,
      },
    ),
  );

  if (pilotKilled) {
    currentSession = appendUnitDestroyedEvent(currentSession, {
      turn,
      phase: GamePhase.PhysicalAttack,
      unitId: attackerId,
      cause: 'pilot_death',
    });
  }

  return currentSession;
}
