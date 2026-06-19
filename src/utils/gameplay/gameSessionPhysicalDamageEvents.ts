import type { IPhysicalAttackDeclaredPayload } from '@/types/gameplay';

import { CombatLocation, IGameSession } from '@/types/gameplay';

import { resolveDamage as resolveDamagePipeline } from './damage';
import { type D6Roller } from './diceTypes';
import { createDamageAppliedEvent } from './gameEvents';
import { buildDamageStateFromUnit } from './gameSessionAttackResolutionHelpers';
import { appendEvent } from './gameSessionCore';
import {
  determinePhysicalHitLocation,
  type IPhysicalAttackResult,
  splitPhysicalDamageIntoClusters,
} from './physicalAttacks';

type SessionUnitState = IGameSession['currentState']['units'][string];

interface IAppendDamageAppliedEventsOptions {
  readonly session: IGameSession;
  readonly turn: number;
  readonly unitId: string;
  readonly damageResult: ReturnType<typeof resolveDamagePipeline>;
}

interface IAppendPhysicalAttackDamageEventsOptions {
  readonly session: IGameSession;
  readonly turn: number;
  readonly payload: IPhysicalAttackDeclaredPayload;
  readonly result: IPhysicalAttackResult;
  readonly attackerState: SessionUnitState;
  readonly targetState: SessionUnitState;
  readonly d6Roller: D6Roller;
}

function appendDamageAppliedEvents(
  options: IAppendDamageAppliedEventsOptions,
): IGameSession {
  let currentSession = options.session;

  for (const locationDamage of options.damageResult.result.locationDamages) {
    currentSession = appendEvent(
      currentSession,
      createDamageAppliedEvent({
        gameId: currentSession.id,
        sequence: currentSession.events.length,
        turn: options.turn,
        unitId: options.unitId,
        location: locationDamage.location,
        damage: locationDamage.damage,
        armorRemaining: locationDamage.armorRemaining,
        structureRemaining: locationDamage.structureRemaining,
        locationDestroyed: locationDamage.destroyed,
      }),
    );
  }

  return currentSession;
}

function appendTargetPhysicalDamageEvents(
  options: IAppendPhysicalAttackDamageEventsOptions,
): IGameSession {
  const { payload, result, targetState } = options;
  if (!result.hit || result.targetDamage <= 0 || !result.hitLocation) {
    return options.session;
  }

  const usesClusters =
    payload.attackType === 'charge' || payload.attackType === 'dfa';
  const clusters: readonly number[] = usesClusters
    ? splitPhysicalDamageIntoClusters(result.targetDamage)
    : [result.targetDamage];

  let currentSession = options.session;
  for (const clusterDamage of clusters) {
    const clusterIndex = clusters.indexOf(clusterDamage);
    const clusterHitLocation =
      clusterIndex === 0
        ? result.hitLocation
        : determinePhysicalHitLocation(
            payload.attackType === 'kick' ? 'kick' : 'punch',
            options.d6Roller,
          );

    currentSession = appendDamageAppliedEvents({
      session: currentSession,
      turn: options.turn,
      unitId: payload.targetId,
      damageResult: resolveDamagePipeline(
        buildDamageStateFromUnit(targetState),
        clusterHitLocation as CombatLocation,
        clusterDamage,
      ),
    });
  }

  return currentSession;
}

function appendBrushOffAttackerDamageEvents(
  options: IAppendPhysicalAttackDamageEventsOptions,
): IGameSession {
  const { payload, result } = options;
  if (
    result.hit ||
    payload.attackType !== 'brush-off' ||
    result.attackerDamage <= 0 ||
    !result.hitLocation
  ) {
    return options.session;
  }

  return appendDamageAppliedEvents({
    session: options.session,
    turn: options.turn,
    unitId: payload.attackerId,
    damageResult: resolveDamagePipeline(
      buildDamageStateFromUnit(options.attackerState),
      result.hitLocation,
      result.attackerDamage,
    ),
  });
}

function appendDfaAttackerLegDamageEvents(
  options: IAppendPhysicalAttackDamageEventsOptions,
): IGameSession {
  const { payload, result } = options;
  if (
    !result.hit ||
    payload.attackType !== 'dfa' ||
    result.attackerLegDamagePerLeg <= 0
  ) {
    return options.session;
  }

  let currentSession = options.session;
  let legIndex = 0;
  const legClusters = splitPhysicalDamageIntoClusters(
    result.attackerLegDamagePerLeg * 2,
  );

  for (const clusterDamage of legClusters) {
    const leg = legIndex % 2 === 0 ? 'left_leg' : 'right_leg';
    legIndex += 1;

    currentSession = appendDamageAppliedEvents({
      session: currentSession,
      turn: options.turn,
      unitId: payload.attackerId,
      damageResult: resolveDamagePipeline(
        buildDamageStateFromUnit(options.attackerState),
        leg as CombatLocation,
        clusterDamage,
      ),
    });
  }

  return currentSession;
}

function appendChargeAttackerDamageEvents(
  options: IAppendPhysicalAttackDamageEventsOptions,
): IGameSession {
  const { payload, result } = options;
  if (
    !result.hit ||
    payload.attackType !== 'charge' ||
    result.attackerDamage <= 0
  ) {
    return options.session;
  }

  let currentSession = options.session;
  const attackerClusters = splitPhysicalDamageIntoClusters(
    result.attackerDamage,
  );
  for (const clusterDamage of attackerClusters) {
    currentSession = appendDamageAppliedEvents({
      session: currentSession,
      turn: options.turn,
      unitId: payload.attackerId,
      damageResult: resolveDamagePipeline(
        buildDamageStateFromUnit(options.attackerState),
        determinePhysicalHitLocation(
          'punch',
          options.d6Roller,
        ) as CombatLocation,
        clusterDamage,
      ),
    });
  }

  return currentSession;
}

export function appendPhysicalAttackDamageEvents(
  options: IAppendPhysicalAttackDamageEventsOptions,
): IGameSession {
  let currentSession = appendTargetPhysicalDamageEvents(options);
  currentSession = appendBrushOffAttackerDamageEvents({
    ...options,
    session: currentSession,
  });
  currentSession = appendDfaAttackerLegDamageEvents({
    ...options,
    session: currentSession,
  });
  return appendChargeAttackerDamageEvents({
    ...options,
    session: currentSession,
  });
}
