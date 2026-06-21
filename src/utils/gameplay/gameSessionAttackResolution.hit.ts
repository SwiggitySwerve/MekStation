import {
  CombatLocation,
  IAttackDeclaredPayload,
  IGameSession,
  IWeaponAttackData,
} from '@/types/gameplay';

import { resolveDamage as resolveDamagePipeline } from './damage';
import { type D6Roller, type DiceRoller } from './diceTypes';
import { calculateFiringArc } from './firingArc';
import { createAttackResolvedEvent } from './gameEvents';
import { resolveSelectedAMSCluster } from './gameSessionAttackResolution.ams';
import {
  emitDamageCriticalEvents,
  emitDamagePsrEvents,
  emitLocationDamageEvents,
  emitPilotAndDestructionEvents,
} from './gameSessionAttackResolution.damageEvents';
import {
  buildDamageStateFromUnit,
  firingArcToString,
} from './gameSessionAttackResolutionHelpers';
import { appendEvent } from './gameSessionCore';
import { tryResolveVehicleAttackHit } from './gameSessionVehicleAttackResolution';
import { determineHitLocationFromRoll } from './hitLocation';
import {
  applyLowProfileGlancingDamage,
  getLowProfileGlancingCriticalHitModifier,
  isLowProfileGlancingBlow,
} from './quirkModifiers';

export function resolveWeaponHit(input: {
  readonly session: IGameSession;
  readonly payload: IAttackDeclaredPayload;
  readonly attackerId: string;
  readonly targetId: string;
  readonly weaponId: string;
  readonly weaponName: string;
  readonly weaponData: IWeaponAttackData;
  readonly attackRollTotal: number;
  readonly weaponToHitNumber: number;
  readonly firingArc: ReturnType<typeof calculateFiringArc>;
  readonly arcString: ReturnType<typeof firingArcToString>;
  readonly ammoBinIdForResolved: string | null;
  readonly targetState: IGameSession['currentState']['units'][string];
  readonly turn: number;
  readonly diceRoller: DiceRoller;
  readonly criticalD6Roller?: D6Roller;
}): IGameSession {
  let currentSession = input.session;
  let resolvedWeaponData = input.weaponData;
  const selectedAMSResult = resolveSelectedAMSCluster({
    session: currentSession,
    payload: input.payload,
    weaponId: input.weaponId,
    weaponName: input.weaponName,
    damage: input.weaponData.damage,
    attackerId: input.attackerId,
    targetId: input.targetId,
    incomingArc: input.firingArc,
    diceRoller: input.diceRoller,
  });

  if (selectedAMSResult) {
    currentSession = selectedAMSResult.session;
    resolvedWeaponData = {
      ...input.weaponData,
      damage: selectedAMSResult.damage,
    };
  }

  const vehicleResolved = tryResolveVehicleAttackHit({
    session: currentSession,
    attackerId: input.attackerId,
    targetId: input.targetId,
    weaponId: input.weaponId,
    weaponData: resolvedWeaponData,
    attackRollTotal: input.attackRollTotal,
    toHitNumber: input.weaponToHitNumber,
    attackDirection: input.arcString,
    ammoBinId: input.ammoBinIdForResolved,
    targetState: input.targetState,
    diceRoller: input.diceRoller,
    d6Roller:
      input.criticalD6Roller ??
      (() => {
        const roll = input.diceRoller();
        return roll.dice[0] ?? 1;
      }),
  });
  if (vehicleResolved) return vehicleResolved;

  const locationRoll = input.diceRoller();
  const hitLocationResult = determineHitLocationFromRoll(
    input.firingArc,
    locationRoll,
    {
      edge: {
        edgePointsRemaining: input.targetState.edgePointsRemaining,
        pilotAbilities: input.targetState.abilities ?? [],
        turn: input.turn,
        unitId: input.targetId,
        reroll: input.diceRoller,
      },
    },
  );
  const location = hitLocationResult.location;
  let damage = resolvedWeaponData.damage;

  const lowProfileGlancingBlow = isLowProfileGlancingBlow(
    input.targetState.unitQuirks,
    input.attackRollTotal,
    input.weaponToHitNumber,
  );
  if (lowProfileGlancingBlow) {
    damage = applyLowProfileGlancingDamage(damage);
  }
  const lowProfileCriticalHitModifier =
    getLowProfileGlancingCriticalHitModifier(
      input.targetState.unitQuirks,
      input.attackRollTotal,
      input.weaponToHitNumber,
    );

  currentSession = appendEvent(
    currentSession,
    createAttackResolvedEvent(
      currentSession.id,
      currentSession.events.length,
      input.turn,
      input.attackerId,
      input.targetId,
      input.weaponId,
      input.attackRollTotal,
      input.weaponToHitNumber,
      true,
      location,
      damage,
      input.weaponData.heat,
      input.arcString,
      input.ammoBinIdForResolved,
      {
        edgeReroll: hitLocationResult.edgeReroll,
        edgeSuperseded: hitLocationResult.edgeSuperseded,
        edgeTrigger: hitLocationResult.edgeTrigger,
        edgePointsRemaining: hitLocationResult.edgePointsRemaining,
        edgeSupersededLocation: hitLocationResult.supersededLocation,
        edgeSupersededRoll: hitLocationResult.supersededRoll?.total,
      },
    ),
  );

  const preAttackDamageThisPhase =
    currentSession.currentState.units[input.targetId]?.damageThisPhase ?? 0;
  const targetStateForDamage =
    currentSession.currentState.units[input.targetId] ?? input.targetState;
  const buildTargetCriticalEdgeOptions = () => {
    const targetForCritical =
      currentSession.currentState.units[input.targetId] ?? targetStateForDamage;
    return {
      pilotAbilities: targetForCritical.abilities ?? [],
      edgePointsRemaining: targetForCritical.edgePointsRemaining,
      turn: input.turn,
      unitId: input.targetId,
      criticalHitModifier: lowProfileCriticalHitModifier,
      optionalRules: currentSession.config.optionalRules,
    };
  };
  const damageState = {
    ...buildDamageStateFromUnit(targetStateForDamage),
    turn: input.turn,
  };
  const d6Roller = () => {
    const roll = input.diceRoller();
    return roll.dice[0];
  };
  const damageResult = resolveDamagePipeline(
    damageState,
    location as CombatLocation,
    damage,
    d6Roller,
    { rollCriticalHits: false },
  );

  currentSession = emitLocationDamageEvents({
    session: currentSession,
    damageResult,
    previousDestroyedLocations: damageState.destroyedLocations,
    turn: input.turn,
    targetId: input.targetId,
  });
  currentSession = emitDamageCriticalEvents({
    session: currentSession,
    damageResult,
    targetStateForDamage,
    turn: input.turn,
    targetId: input.targetId,
    arcString: input.arcString,
    hitLocationRollTotal: hitLocationResult.roll.total,
    d6Roller,
    buildTargetCriticalEdgeOptions,
  });
  currentSession = emitDamagePsrEvents({
    session: currentSession,
    damageResult,
    preAttackDamageThisPhase,
    turn: input.turn,
    targetId: input.targetId,
  });
  return emitPilotAndDestructionEvents({
    session: currentSession,
    damageResult,
    turn: input.turn,
    targetId: input.targetId,
  });
}
