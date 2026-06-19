import {
  getAmmoExplosionTN,
  getMaxTechPilotHeatDamageAvoidTN,
  getPilotHeatDamage,
  getShutdownTN,
} from '@/constants/heat';
import {
  GamePhase,
  IAmmoSlotState,
  IGameEvent,
  IGameSession,
  PSRTrigger,
} from '@/types/gameplay';

import type {
  HeatCriticalContext,
  HeatPhaseUnitContext,
  HeatPhaseUnitState,
} from './gameSessionHeat.types';

import {
  PILOT_DEATH_WOUND_THRESHOLD,
  resolvePilotConsciousnessCheck,
} from './damage';
import {
  createPilotHitEvent,
  createPSRTriggeredEvent,
  createShutdownCheckEvent,
  createStartupAttemptEvent,
} from './gameEvents';
import { buildDefaultComponentDamageState } from './gameSessionAttackResolutionHelpers';
import { appendEvent } from './gameSessionCore';
import { appendHeatAmmoExplosionEvents } from './gameSessionHeat.ammoExplosion';
import { emitHeatCriticalEvents } from './gameSessionHeat.criticalEvents';
import { appendHeatSourcesAndDissipation } from './gameSessionHeat.sources';
import { resolveMaxTechHeatCriticalDamage } from './heatCriticalDamage';
import { hasSPA } from './spaModifiers';

function appendStartupAttemptIfEligible(
  session: IGameSession,
  context: HeatPhaseUnitContext,
  finalHeat: number,
): IGameSession {
  const stateAfterDissipation = session.currentState.units[context.unitId];
  if (!stateAfterDissipation.shutdown || finalHeat > 29) {
    return session;
  }

  const startupTN = getShutdownTN(
    finalHeat,
    context.hotDogTargetNumberModifier,
  );
  const autoRestart = startupTN === 0;
  const startupRoll = autoRestart ? null : context.diceRoller();
  const startupSuccess = autoRestart
    ? true
    : (startupRoll?.total ?? 0) >= startupTN;

  return appendEvent(
    session,
    createStartupAttemptEvent(
      session.id,
      session.events.length,
      context.turn,
      GamePhase.Heat,
      context.unitId,
      startupTN,
      startupRoll?.total ?? 0,
      startupSuccess,
    ),
  );
}

function appendReactorShutdownPsr(
  session: IGameSession,
  context: HeatPhaseUnitContext,
): IGameSession {
  return appendEvent(
    session,
    createPSRTriggeredEvent(
      session.id,
      session.events.length,
      context.turn,
      GamePhase.Heat,
      context.unitId,
      'Reactor shutdown',
      0,
      'heat_shutdown',
      context.unit.piloting,
      PSRTrigger.Shutdown,
    ),
  );
}

function appendShutdownCheckEvents(
  session: IGameSession,
  context: HeatPhaseUnitContext,
  finalHeat: number,
): IGameSession {
  if (finalHeat >= 30) {
    const shutdownSession = appendEvent(
      session,
      createShutdownCheckEvent(
        session.id,
        session.events.length,
        context.turn,
        GamePhase.Heat,
        context.unitId,
        finalHeat,
        Infinity,
        0,
        true,
      ),
    );
    return appendReactorShutdownPsr(shutdownSession, context);
  }

  const shutdownTN = getShutdownTN(
    finalHeat,
    context.hotDogTargetNumberModifier,
  );
  if (shutdownTN <= 0) {
    return session;
  }

  const shutdownRoll = context.diceRoller();
  const shutdownAvoided = shutdownRoll.total >= shutdownTN;
  const checkedSession = appendEvent(
    session,
    createShutdownCheckEvent(
      session.id,
      session.events.length,
      context.turn,
      GamePhase.Heat,
      context.unitId,
      finalHeat,
      shutdownTN,
      shutdownRoll.total,
      !shutdownAvoided,
    ),
  );

  return shutdownAvoided
    ? checkedSession
    : appendReactorShutdownPsr(checkedSession, context);
}

function firstExplosiveAmmoBin(
  ammoState: NonNullable<HeatPhaseUnitState['ammoState']>,
): IAmmoSlotState | undefined {
  return Object.values(ammoState).find(
    (bin) => bin.remainingRounds > 0 && bin.isExplosive,
  );
}

function appendHeatAmmoExplosionIfTriggered(
  session: IGameSession,
  context: HeatPhaseUnitContext,
  finalHeat: number,
): IGameSession {
  const ammoExplosionTN = getAmmoExplosionTN(
    finalHeat,
    context.hotDogTargetNumberModifier,
  );
  if (ammoExplosionTN <= 0) {
    return session;
  }

  const unitAmmoState = session.currentState.units[context.unitId].ammoState;
  if (!unitAmmoState) {
    return session;
  }

  const explosiveBin = firstExplosiveAmmoBin(unitAmmoState);
  if (!explosiveBin) {
    return session;
  }

  if (ammoExplosionTN === Infinity) {
    return appendHeatAmmoExplosionEvents(
      session,
      context.unitId,
      explosiveBin,
      context.diceRoller,
    );
  }

  const ammoRoll = context.diceRoller();
  if (ammoRoll.total >= ammoExplosionTN) {
    return session;
  }

  return appendHeatAmmoExplosionEvents(
    session,
    context.unitId,
    explosiveBin,
    context.diceRoller,
  );
}

function maxTechPilotHeatDamage(
  session: IGameSession,
  context: HeatPhaseUnitContext,
  finalHeat: number,
): number {
  if (
    !hasSPA(
      session.currentState.units[context.unitId].abilities ??
        context.unit.abilities ??
        [],
      'artificial_pain_shunt',
    )
  ) {
    const maxTechAvoidTN = getMaxTechPilotHeatDamageAvoidTN(
      finalHeat,
      context.hotDogTargetNumberModifier,
    );
    if (maxTechAvoidTN > 0) {
      const maxTechRoll = context.diceRoller();
      return maxTechRoll.total < maxTechAvoidTN ? 1 : 0;
    }
  }

  return 0;
}

function appendPilotHeatDamageIfNeeded(
  session: IGameSession,
  context: HeatPhaseUnitContext,
  finalHeat: number,
  maxTechHeatScale: boolean,
): IGameSession {
  const lifeSupportHits = context.unitState.componentDamage?.lifeSupport ?? 0;
  const defaultPilotDamage = getPilotHeatDamage(finalHeat, lifeSupportHits);
  const pilotDamage =
    defaultPilotDamage > 0 || !maxTechHeatScale
      ? defaultPilotDamage
      : maxTechPilotHeatDamage(session, context, finalHeat);

  if (pilotDamage <= 0) {
    return session;
  }

  const currentUnitState = session.currentState.units[context.unitId];
  const totalWounds = currentUnitState.pilotWounds + pilotDamage;
  const d6Roller = () => context.diceRoller().dice[0];
  const consciousnessCheck = resolvePilotConsciousnessCheck(
    totalWounds,
    pilotDamage,
    currentUnitState.abilities ?? context.unit.abilities ?? [],
    d6Roller,
    currentUnitState.pilotToughness,
    {
      edgePointsRemaining: currentUnitState.edgePointsRemaining,
      turn: context.turn,
      unitId: context.unitId,
    },
  );
  const consciousnessPassed =
    currentUnitState.pilotConscious &&
    (consciousnessCheck.conscious ?? true) &&
    totalWounds < PILOT_DEATH_WOUND_THRESHOLD;
  const edgeOutcome = {
    edgePointsRemaining: consciousnessCheck.edgePointsRemaining,
    edgeTrigger: consciousnessCheck.edgeTrigger,
    edgeSuperseded: consciousnessCheck.edgeSuperseded,
    edgeReroll: consciousnessCheck.edgeReroll,
  };

  return appendEvent(
    session,
    createPilotHitEvent(
      session.id,
      session.events.length,
      context.turn,
      GamePhase.Heat,
      context.unitId,
      pilotDamage,
      totalWounds,
      'heat',
      true,
      consciousnessPassed,
      edgeOutcome,
    ),
  );
}

function appendMaxTechHeatCriticalsIfNeeded(
  session: IGameSession,
  context: HeatPhaseUnitContext,
  heatCriticalContext: HeatCriticalContext,
  finalHeat: number,
): IGameSession {
  if (!heatCriticalContext.enabled) {
    return session;
  }

  const currentUnitState = session.currentState.units[context.unitId];
  const heatCriticalResult = resolveMaxTechHeatCriticalDamage({
    unitId: context.unitId,
    heat: finalHeat,
    manifest: heatCriticalContext.getOrSeedCriticalManifest(context.unitId),
    componentDamage:
      currentUnitState.componentDamage ?? buildDefaultComponentDamageState(),
    d6Roller: heatCriticalContext.heatCriticalD6Roller,
    locationIndexRoller: heatCriticalContext.maxTechCriticalLocationRoller,
    targetNumberModifier: context.hotDogTargetNumberModifier,
  });
  context.options?.criticalManifestsByUnit?.set(
    context.unitId,
    heatCriticalResult.updatedManifest,
  );

  return heatCriticalResult.applied
    ? emitHeatCriticalEvents(
        session,
        heatCriticalResult.events,
        context.turn,
        context.unitId,
      )
    : session;
}

export function resolveHeatForUnit(
  session: IGameSession,
  context: HeatPhaseUnitContext,
  turnEvents: readonly IGameEvent[],
  heatCriticalContext: HeatCriticalContext,
): IGameSession {
  let currentSession = appendHeatSourcesAndDissipation(
    session,
    context,
    turnEvents,
  );

  const finalHeat = currentSession.currentState.units[context.unitId].heat;
  currentSession = appendStartupAttemptIfEligible(
    currentSession,
    context,
    finalHeat,
  );
  currentSession = appendShutdownCheckEvents(
    currentSession,
    context,
    finalHeat,
  );
  currentSession = appendHeatAmmoExplosionIfTriggered(
    currentSession,
    context,
    finalHeat,
  );
  currentSession = appendPilotHeatDamageIfNeeded(
    currentSession,
    context,
    finalHeat,
    heatCriticalContext.enabled,
  );

  return appendMaxTechHeatCriticalsIfNeeded(
    currentSession,
    context,
    heatCriticalContext,
    finalHeat,
  );
}
