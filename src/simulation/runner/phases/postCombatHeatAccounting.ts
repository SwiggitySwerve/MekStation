import type { D6Roller } from '@/utils/gameplay/hitLocation';

import {
  GameEventType,
  GamePhase,
  type IComponentDamageState,
  type IEnvironmentalConditions,
  type IGameEvent,
  type IGameState,
  type IHexGrid,
  type IUnitGameState,
} from '@/types/gameplay';
import { calculateEnvironmentalHeatModifier } from '@/utils/gameplay/environmentalModifiers';
import { getGridTerrainHeatEffect } from '@/utils/gameplay/heat';
import { getHotDogHeatTargetNumberModifier } from '@/utils/gameplay/spaModifiers';

import type { IWeapon } from '../../ai/types';

import { SeededRandom } from '../../core/SeededRandom';
import {
  BASE_HEAT_SINKS,
  DEFAULT_COMPONENT_DAMAGE,
  ENGINE_HEAT_PER_CRITICAL,
} from '../SimulationRunnerConstants';
import {
  computeMovementHeat,
  computeWeaponHeat,
} from './heatPhaseCalculations';
import { emitHeatThresholdEvents } from './heatThresholdEvents';
import { createD6Roller, createGameEvent } from './utils';
import { EXTERNAL_HEAT_CAP_PER_TURN } from './weaponAttackPlasmaCannon';

export interface IHeatEmissionContext {
  readonly events: IGameEvent[];
  readonly gameId: string;
  readonly random: SeededRandom;
  readonly d6Roller: D6Roller;
}

export interface IHeatAccounting {
  readonly componentDamage: IComponentDamageState;
  readonly externalHeat: number;
  readonly externalHeatThisTurn: number;
  readonly generated: number;
  readonly previousHeat: number;
  readonly newHeat: number;
  readonly dissipation: number;
  readonly baseDissipation: number;
  readonly waterBonus: number;
  readonly environmentalModifier: number;
  readonly heatGenerationReduction: number;
  readonly hotDogTargetNumberModifier: number;
  readonly source:
    | 'external'
    | 'engine_hit'
    | 'environment'
    | 'firing'
    | 'movement';
  readonly unitAfterHeatAccounting: IUnitGameState;
}

export function createHeatEmissionContext(options: {
  readonly events?: IGameEvent[];
  readonly gameId?: string;
  readonly random?: SeededRandom;
}): IHeatEmissionContext | undefined {
  const { events, gameId, random } = options;
  if (events === undefined || gameId === undefined || random === undefined) {
    return undefined;
  }

  return {
    events,
    gameId,
    random,
    d6Roller: createD6Roller(random),
  };
}

function selectGeneratedHeatSource(options: {
  readonly externalHeat: number;
  readonly engineHeat: number;
  readonly environmentHeat: number;
  readonly weaponHeat: number;
  readonly movementHeat: number;
}): IHeatAccounting['source'] {
  const {
    engineHeat,
    environmentHeat,
    externalHeat,
    movementHeat,
    weaponHeat,
  } = options;
  if (externalHeat > 0) return 'external';
  if (engineHeat > 0) return 'engine_hit';
  if (environmentHeat > weaponHeat && environmentHeat > movementHeat) {
    return 'environment';
  }
  if (weaponHeat >= movementHeat) return 'firing';
  return 'movement';
}

export function computeHeatAccounting(options: {
  readonly unit: IUnitGameState;
  readonly unitId: string;
  readonly weaponsByUnit?: ReadonlyMap<string, readonly IWeapon[]>;
  readonly grid?: IHexGrid;
  readonly environmentalConditions?: IEnvironmentalConditions;
}): IHeatAccounting {
  const { environmentalConditions, grid, unit, unitId, weaponsByUnit } =
    options;
  const weaponsFired = unit.weaponsFiredThisTurn ?? [];
  const weaponHeat = computeWeaponHeat(
    weaponsFired,
    weaponsByUnit?.get(unitId),
    unit.weaponQuirks,
  );
  const movementHeat = computeMovementHeat(unit);

  const componentDamage = unit.componentDamage ?? DEFAULT_COMPONENT_DAMAGE;
  const engineHeat = componentDamage.engineHits * ENGINE_HEAT_PER_CRITICAL;
  const terrainHeatEffect = grid
    ? getGridTerrainHeatEffect(grid, unit.position)
    : 0;
  const environmentHeat = Math.max(0, terrainHeatEffect);
  const waterBonus = Math.max(0, -terrainHeatEffect);
  const environmentalModifier =
    environmentalConditions !== undefined
      ? calculateEnvironmentalHeatModifier(environmentalConditions)
      : 0;
  const heatGenerationReduction = 0;
  const hotDogTargetNumberModifier = getHotDogHeatTargetNumberModifier(
    unit.abilities ?? [],
  );
  const pendingExternalHeat = Math.max(0, unit.pendingExternalHeat ?? 0);
  const previousExternalHeat = Math.max(0, unit.externalHeatThisTurn ?? 0);
  const remainingExternalHeat = Math.max(
    0,
    EXTERNAL_HEAT_CAP_PER_TURN - previousExternalHeat,
  );
  const externalHeat = Math.min(pendingExternalHeat, remainingExternalHeat);
  const externalHeatThisTurn = Math.min(
    EXTERNAL_HEAT_CAP_PER_TURN,
    previousExternalHeat + externalHeat,
  );

  const heatSinkCount = unit.heatSinks ?? BASE_HEAT_SINKS;
  const heatSinkRating = unit.heatSinkType === 'double' ? 2 : 1;
  const heatSinksLost = componentDamage.heatSinksDestroyed ?? 0;
  const baseDissipation = Math.max(
    0,
    (heatSinkCount - heatSinksLost) * heatSinkRating,
  );
  const dissipation = Math.max(
    0,
    baseDissipation +
      waterBonus +
      environmentalModifier +
      heatGenerationReduction,
  );

  const generated =
    weaponHeat + movementHeat + engineHeat + environmentHeat + externalHeat;
  const previousHeat = unit.heat;
  const newHeat = Math.max(0, previousHeat + generated - dissipation);

  return {
    componentDamage,
    externalHeat,
    externalHeatThisTurn,
    generated,
    previousHeat,
    newHeat,
    dissipation,
    baseDissipation,
    waterBonus,
    environmentalModifier,
    heatGenerationReduction,
    hotDogTargetNumberModifier,
    source: selectGeneratedHeatSource({
      externalHeat,
      engineHeat,
      environmentHeat,
      weaponHeat,
      movementHeat,
    }),
    unitAfterHeatAccounting: {
      ...unit,
      externalHeatThisTurn,
      pendingExternalHeat: 0,
    },
  };
}

export function emitHeatAccountingEvents(options: {
  readonly emission: IHeatEmissionContext | undefined;
  readonly state: IGameState;
  readonly unitId: string;
  readonly accounting: IHeatAccounting;
}): void {
  const { accounting, emission, state, unitId } = options;
  if (!emission) return;

  emission.events.push(
    createGameEvent(
      emission.gameId,
      emission.events.length,
      GameEventType.HeatGenerated,
      state.turn,
      GamePhase.Heat,
      {
        unitId,
        amount: accounting.generated,
        source: accounting.source,
        newTotal: accounting.newHeat,
        previousTotal: accounting.previousHeat,
        ammoExplosionRisk: accounting.newHeat >= 19,
      },
      unitId,
    ),
  );

  emission.events.push(
    createGameEvent(
      emission.gameId,
      emission.events.length,
      GameEventType.HeatDissipated,
      state.turn,
      GamePhase.Heat,
      {
        unitId,
        amount: accounting.dissipation === 0 ? 0 : -accounting.dissipation,
        source: 'dissipation',
        newTotal: accounting.newHeat,
        previousTotal: accounting.previousHeat,
        breakdown: {
          baseDissipation: accounting.baseDissipation,
          waterBonus: accounting.waterBonus,
          environmentalModifier: accounting.environmentalModifier,
          heatGenerationReduction: accounting.heatGenerationReduction,
        },
      },
      unitId,
    ),
  );

  emitHeatThresholdEvents({
    unitId,
    heat: accounting.newHeat,
    turn: state.turn,
    events: emission.events,
    gameId: emission.gameId,
  });
}
