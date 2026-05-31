import type { IRuntimeMovementStateChangedPayload } from '@/types/gameplay/GameSessionMovementEvents';
import type {
  IComponentDamageState,
  IGameSession,
} from '@/types/gameplay/GameSessionStateTypes';

import type { D6Roller } from './diceTypes';

import { resolveFall } from './fallMechanics';
import {
  createPilotHitEvent,
  createPSRResolvedEvent,
  createPSRTriggeredEvent,
  createUnitFellEvent,
} from './gameEvents';
import { appendEvent } from './gameSessionCore';
import { defaultD6Roller } from './hitLocation';
import { createAirMekLandingPSR, resolvePSR } from './pilotingSkillRolls';

const DEFAULT_COMPONENT_DAMAGE: IComponentDamageState = {
  engineHits: 0,
  gyroHits: 0,
  sensorHits: 0,
  lifeSupport: 0,
  cockpitHit: false,
  actuators: {},
  weaponsDestroyed: [],
  heatSinksDestroyed: 0,
  jumpJetsDestroyed: 0,
};

const DEFAULT_AIRMEK_LANDING_TONNAGE = 50;

export function applyAirMekLandingControlPSR(
  session: IGameSession,
  unitId: string,
  patch: Omit<IRuntimeMovementStateChangedPayload, 'unitId'>,
  diceRoller: D6Roller = defaultD6Roller,
): IGameSession {
  if (patch.lamAirMekLandingControlRequired !== true) return session;

  const unitState = session.currentState.units[unitId];
  if (!unitState || unitState.destroyed || !unitState.pilotConscious) {
    return session;
  }

  const unit = session.units.find((entry) => entry.id === unitId);
  const psr = createAirMekLandingPSR(
    unitId,
    patch.lamAirMekLandingControlModifier ?? 0,
  );

  let currentSession = appendEvent(
    session,
    createPSRTriggeredEvent(
      session.id,
      session.events.length,
      session.currentState.turn,
      session.currentState.phase,
      unitId,
      psr.reason,
      psr.additionalModifier,
      psr.triggerSource,
      unit?.piloting,
      psr.reasonCode,
    ),
  );

  const componentDamage = unitState.componentDamage ?? DEFAULT_COMPONENT_DAMAGE;
  const result = resolvePSR(
    unit?.piloting ?? 5,
    psr,
    componentDamage,
    unitState.pilotWounds,
    diceRoller,
    {
      gyroType: unitState.gyroType ?? unit?.gyroType,
      optionalRules: session.config.optionalRules,
    },
  );

  currentSession = appendEvent(
    currentSession,
    createPSRResolvedEvent(
      currentSession.id,
      currentSession.events.length,
      currentSession.currentState.turn,
      currentSession.currentState.phase,
      unitId,
      result.targetNumber,
      result.roll,
      result.modifiers.reduce((sum, modifier) => sum + modifier.value, 0),
      result.passed,
      result.psr.reason,
      result.psr.reasonCode,
    ),
  );

  if (result.passed) {
    return currentSession;
  }

  const latestUnitState = currentSession.currentState.units[unitId];
  const fallHeight = landingFallHeight(patch);
  const fallResult = resolveFall(
    DEFAULT_AIRMEK_LANDING_TONNAGE,
    latestUnitState?.facing ?? unitState.facing,
    fallHeight,
    diceRoller,
  );

  currentSession = appendEvent(
    currentSession,
    createUnitFellEvent(
      currentSession.id,
      currentSession.events.length,
      currentSession.currentState.turn,
      currentSession.currentState.phase,
      unitId,
      fallResult.totalDamage,
      fallResult.newFacing,
      fallResult.pilotDamage,
      `${unitState.position.q},${unitState.position.r}`,
      psr.reason,
      psr.reasonCode,
    ),
  );

  const currentUnitState = currentSession.currentState.units[unitId];
  const totalWounds = currentUnitState.pilotWounds + 1;
  return appendEvent(
    currentSession,
    createPilotHitEvent(
      currentSession.id,
      currentSession.events.length,
      currentSession.currentState.turn,
      currentSession.currentState.phase,
      unitId,
      1,
      totalWounds,
      'head_hit',
      true,
      totalWounds < 6,
    ),
  );
}

function landingFallHeight(
  patch: Omit<IRuntimeMovementStateChangedPayload, 'unitId'>,
): number {
  const height = patch.lamAirMekLandingControlFallHeight;
  if (height === undefined || !Number.isFinite(height)) return 1;
  return Math.max(0, Math.floor(height));
}
