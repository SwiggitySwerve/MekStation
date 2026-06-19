import { ENGINE_HIT_HEAT } from '@/constants/heat';
import {
  GameEventType,
  GamePhase,
  IAttackDeclaredPayload,
  IGameEvent,
  IMovementDeclaredPayload,
  IGameSession,
} from '@/types/gameplay';
import { logger } from '@/utils/logger';

import type {
  HeatPhaseUnit,
  HeatPhaseUnitContext,
  HeatPhaseUnitState,
} from './gameSessionHeat.types';

import { calculateEnvironmentalHeatModifier } from './environmentalModifiers';
import {
  createHeatDissipatedEvent,
  createHeatGeneratedEvent,
} from './gameEvents';
import { appendEvent } from './gameSessionCore';
import { getWaterCoolingBonus } from './heat';
import {
  getWeaponCoolingHeatModifier,
  getWeaponQuirks,
} from './quirkModifiers';

interface HeatSourceTotals {
  readonly heatFromMovement: number;
  readonly heatFromWeapons: number;
  readonly heatFromEngine: number;
  readonly heatFromEnvironment: number;
}

interface HeatDissipationBreakdown {
  readonly baseDissipation: number;
  readonly waterBonus: number;
  readonly environmentalModifier: number;
  readonly heatGenerationReduction: number;
  readonly totalDissipation: number;
}

function movementHeatForUnit(
  turnEvents: readonly IGameEvent[],
  unitId: string,
): number {
  const movementEvent = turnEvents.find(
    (event) =>
      event.type === GameEventType.MovementDeclared && event.actorId === unitId,
  );
  if (!movementEvent) {
    return 0;
  }

  return (movementEvent.payload as IMovementDeclaredPayload).heatGenerated;
}

function weaponAttackHeat(
  weaponAttack: NonNullable<IAttackDeclaredPayload['weaponAttacks']>[number],
  unitState: HeatPhaseUnitState,
  unit: HeatPhaseUnit,
): number {
  const quirks = [
    ...getWeaponQuirks(
      unitState.weaponQuirks ?? unit.weaponQuirks,
      weaponAttack.weaponId,
    ),
    ...getWeaponQuirks(
      unitState.weaponQuirks ?? unit.weaponQuirks,
      weaponAttack.weaponName,
    ),
  ];

  return Math.max(
    0,
    weaponAttack.heat + getWeaponCoolingHeatModifier(quirks, weaponAttack.heat),
  );
}

function firingHeatForUnit(
  turnEvents: readonly IGameEvent[],
  context: Pick<HeatPhaseUnitContext, 'unitId' | 'unit' | 'unitState'>,
): number {
  let heatFromWeapons = 0;
  const attackEvents = turnEvents.filter(
    (event) =>
      event.type === GameEventType.AttackDeclared &&
      event.actorId === context.unitId,
  );

  for (const attackEvent of attackEvents) {
    const payload = attackEvent.payload as IAttackDeclaredPayload;
    if (!payload.weaponAttacks || payload.weaponAttacks.length === 0) {
      if (payload.weapons.length > 0) {
        logger.warn(
          `[gameSessionHeat] AttackDeclared event for unit "${context.unitId}" has ${payload.weapons.length} weapon(s) but empty weaponAttacks - firing heat for this event accumulated as 0. Source: malformed legacy event.`,
        );
      }
      continue;
    }

    for (const weaponAttack of payload.weaponAttacks) {
      heatFromWeapons += weaponAttackHeat(
        weaponAttack,
        context.unitState,
        context.unit,
      );
    }
  }

  return heatFromWeapons;
}

function collectHeatSourceTotals(
  turnEvents: readonly IGameEvent[],
  context: HeatPhaseUnitContext,
): HeatSourceTotals {
  const componentDamage = context.unitState.componentDamage;
  const unitPosition = context.unitState.position;

  return {
    heatFromMovement: movementHeatForUnit(turnEvents, context.unitId),
    heatFromWeapons: firingHeatForUnit(turnEvents, context),
    heatFromEngine: (componentDamage?.engineHits ?? 0) * ENGINE_HIT_HEAT,
    heatFromEnvironment: Math.max(
      0,
      context.options?.getEnvironmentHeatEffect !== undefined
        ? context.options.getEnvironmentHeatEffect(context.unitId, unitPosition)
        : 0,
    ),
  };
}

function appendPositiveHeatGeneratedEvents(
  session: IGameSession,
  context: HeatPhaseUnitContext,
  totals: HeatSourceTotals,
): IGameSession {
  const sources = [
    {
      amount: totals.heatFromMovement,
      source: 'movement' as const,
      addsToRunningHeat: false,
    },
    {
      amount: totals.heatFromWeapons,
      source: 'firing' as const,
      addsToRunningHeat: true,
    },
    {
      amount: totals.heatFromEngine,
      source: 'engine_hit' as const,
      addsToRunningHeat: true,
    },
    {
      amount: totals.heatFromEnvironment,
      source: 'environment' as const,
      addsToRunningHeat: true,
    },
  ];

  let currentSession = session;
  let runningHeat = context.unitState.heat;

  for (const source of sources) {
    if (source.amount <= 0) {
      continue;
    }
    if (source.addsToRunningHeat) {
      runningHeat += source.amount;
    }

    currentSession = appendEvent(
      currentSession,
      createHeatGeneratedEvent(
        currentSession.id,
        currentSession.events.length,
        context.turn,
        GamePhase.Heat,
        context.unitId,
        source.amount,
        source.source,
        runningHeat,
      ),
    );
  }

  return currentSession;
}

function calculateHeatDissipation(
  context: HeatPhaseUnitContext,
): HeatDissipationBreakdown {
  const unitHeatSinks = context.unit.heatSinks ?? 10;
  const heatSinksDestroyed =
    context.unitState.componentDamage?.heatSinksDestroyed ?? 0;
  const heatSinkRating = context.unit.heatSinkType === 'double' ? 2 : 1;
  const baseDissipation = Math.max(
    0,
    (unitHeatSinks - heatSinksDestroyed) * heatSinkRating,
  );
  const waterDepth =
    context.options?.getWaterDepth !== undefined
      ? context.options.getWaterDepth(
          context.unitId,
          context.unitState.position,
        )
      : 0;
  const waterBonus = getWaterCoolingBonus(waterDepth);
  const environmentalModifier =
    context.options?.environmentalConditions !== undefined
      ? calculateEnvironmentalHeatModifier(
          context.options.environmentalConditions,
        )
      : 0;
  const heatGenerationReduction = 0;
  const totalDissipation = Math.max(
    0,
    baseDissipation +
      waterBonus +
      environmentalModifier +
      heatGenerationReduction,
  );

  return {
    baseDissipation,
    waterBonus,
    environmentalModifier,
    heatGenerationReduction,
    totalDissipation,
  };
}

export function appendHeatSourcesAndDissipation(
  session: IGameSession,
  context: HeatPhaseUnitContext,
  turnEvents: readonly IGameEvent[],
): IGameSession {
  const heatGeneratedSession = appendPositiveHeatGeneratedEvents(
    session,
    context,
    collectHeatSourceTotals(turnEvents, context),
  );
  const breakdown = calculateHeatDissipation(context);
  const currentHeatBeforeDissipation =
    heatGeneratedSession.currentState.units[context.unitId].heat;
  const newHeat = Math.max(
    0,
    currentHeatBeforeDissipation - breakdown.totalDissipation,
  );

  return appendEvent(
    heatGeneratedSession,
    createHeatDissipatedEvent(
      heatGeneratedSession.id,
      heatGeneratedSession.events.length,
      context.turn,
      context.unitId,
      breakdown.totalDissipation,
      newHeat,
      {
        baseDissipation: breakdown.baseDissipation,
        waterBonus: breakdown.waterBonus,
        environmentalModifier: breakdown.environmentalModifier,
        heatGenerationReduction: breakdown.heatGenerationReduction,
      },
    ),
  );
}
