import type {
  IAttackEvent,
  IPhysicalAttackEvent,
  IRetreatEvent,
} from '@/simulation/ai/AIPlayerEvents';
import type { IMovementEvent } from '@/simulation/ai/AIPlayerEvents';
import type { IAIPlayer, IAIUnitState } from '@/simulation/ai/IAIPlayer';
import type {
  IEnvironmentalConditions,
  IHexCoordinate,
  IHexGrid,
  IMovementCapability,
  LightCondition,
} from '@/types/gameplay';

import { ActuatorType } from '@/types/construction/MechConfigurationSystem';
import { MovementEnhancementType } from '@/types/construction/MovementEnhancement';
import {
  Facing,
  GameEventType,
  GamePhase,
  GameSide,
  GameStatus,
  MovementType,
  PSRTrigger,
  type IDamageAppliedPayload,
  type IGameState,
  type IMinefieldChangedPayload,
  type IMovementDeclaredPayload,
  type IMovementInvalidPayload,
  type IPSRResolvedPayload,
  type IPSRTriggeredPayload,
  type IRepresentedMinefieldState,
  type ISwarmDismountedPayload,
  type IUnitStoodPayload,
} from '@/types/gameplay';
import {
  TerrainType,
  type ITerrainFeature,
} from '@/types/gameplay/TerrainTypes';
import { UnitType } from '@/types/unit';
import { createEnvironmentalConditions } from '@/utils/gameplay/environmentalModifiers';
import { applyEvent } from '@/utils/gameplay/gameState';
import { coordToKey } from '@/utils/gameplay/hexMath';

import { SeededRandom } from '../../core/SeededRandom';
import { InvariantRunner } from '../../invariants/InvariantRunner';
import { COMBAT_COMMAND_ACTION_SUPPORT } from '../CombatActionSupport';
import { CANONICAL_SPA_COMBAT_SCOPE_SUPPORT } from '../CombatCanonicalSpaSupport';
import {
  QUIRK_COMBAT_SUPPORT,
  SPA_COMBAT_SUPPORT,
} from '../CombatFeatureSupport';
import { RUNNER_PSR_TRIGGER_COMBAT_SUPPORT } from '../CombatLifecycleSupport';
import { PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT } from '../CombatPilotModifierApplicationSupport';
import {
  MOVEMENT_ENHANCEMENT_COMBAT_SUPPORT,
  MOVEMENT_RULE_COMBAT_SUPPORT,
  TERRAIN_ENVIRONMENT_COMBAT_SUPPORT,
} from '../CombatRuleSupport';
import { TERRAIN_TYPE_PSR_COMBAT_SUPPORT } from '../CombatTerrainEnvironmentSupport';
import {
  applyRunnerMinefieldClearing,
  applyRunnerMinefieldCommandDetonation,
  applyRunnerMinefieldDetection,
  applyRunnerMinefieldManualDetonation,
  applyRunnerMinefieldReset,
} from '../phases/minefieldActions';
import { runMovementPhase } from '../phases/movement';
import { applyMovementMinefieldEffects } from '../phases/movementMines';
import { DEFAULT_COMPONENT_DAMAGE } from '../SimulationRunnerConstants';
import { resetTurnState } from '../SimulationRunnerState';
import {
  createMinimalGrid,
  createMinimalUnitState,
} from '../SimulationRunnerSupport';

export class ScriptedMovePlayer implements IAIPlayer {
  constructor(
    private readonly unitId: string,
    private readonly target: IHexCoordinate,
    private readonly movementType = MovementType.Walk,
    private readonly facing = Facing.North,
  ) {}

  evaluateRetreat(): IRetreatEvent | null {
    return null;
  }

  playMovementPhase(unit: IAIUnitState): IMovementEvent | null {
    if (unit.unitId !== this.unitId) return null;
    return {
      type: GameEventType.MovementDeclared,
      payload: {
        unitId: unit.unitId,
        from: unit.position,
        to: this.target,
        facing: this.facing,
        movementType: this.movementType,
        mpUsed: 1,
        heatGenerated: 0,
      },
    };
  }

  playAttackPhase(): IAttackEvent | null {
    return null;
  }

  playPhysicalAttackPhase(): IPhysicalAttackEvent | null {
    return null;
  }
}

export class ScriptedGoPronePlayer implements IAIPlayer {
  constructor(private readonly unitId: string) {}

  evaluateRetreat(): IRetreatEvent | null {
    return null;
  }

  playMovementPhase(unit: IAIUnitState): IMovementEvent | null {
    if (unit.unitId !== this.unitId) return null;
    return {
      type: GameEventType.MovementDeclared,
      payload: {
        unitId: unit.unitId,
        from: unit.position,
        to: unit.position,
        facing: unit.facing,
        movementType: MovementType.Stationary,
        mpUsed: 1,
        heatGenerated: 0,
        steps: [
          {
            kind: 'goProne',
            index: 0,
            at: { q: unit.position.q, r: unit.position.r },
            mpCost: 1,
          },
        ],
      },
    };
  }

  playAttackPhase(): IAttackEvent | null {
    return null;
  }

  playPhysicalAttackPhase(): IPhysicalAttackEvent | null {
    return null;
  }
}

export function fixedRandom(nextValue: number): SeededRandom {
  return { next: () => nextValue } as unknown as SeededRandom;
}

export function scriptedD6Roller(values: readonly number[]): () => number {
  let index = 0;
  return () => {
    if (index >= values.length) {
      throw new Error(`scripted d6 exhausted after ${values.length} rolls`);
    }
    return values[index++];
  };
}

export function setTerrain(
  grid: IHexGrid,
  coord: IHexCoordinate,
  terrain: TerrainType,
): IHexGrid {
  const key = `${coord.q},${coord.r}`;
  const existing = grid.hexes.get(key);
  if (!existing) throw new Error(`Missing hex ${key}`);

  const hexes = new Map(grid.hexes);
  hexes.set(key, { ...existing, terrain });
  return { ...grid, hexes };
}

export function setElevation(
  grid: IHexGrid,
  coord: IHexCoordinate,
  elevation: number,
): IHexGrid {
  const key = `${coord.q},${coord.r}`;
  const existing = grid.hexes.get(key);
  if (!existing) throw new Error(`Missing hex ${key}`);

  const hexes = new Map(grid.hexes);
  hexes.set(key, { ...existing, elevation });
  return { ...grid, hexes };
}

export function setTerrainFeatures(
  grid: IHexGrid,
  coord: IHexCoordinate,
  terrainFeatures: readonly ITerrainFeature[],
): IHexGrid {
  const key = `${coord.q},${coord.r}`;
  const existing = grid.hexes.get(key);
  if (!existing) throw new Error(`Missing hex ${key}`);

  const hexes = new Map(grid.hexes);
  hexes.set(key, { ...existing, terrain: JSON.stringify(terrainFeatures) });
  return { ...grid, hexes };
}

export function setOccupant(
  grid: IHexGrid,
  coord: IHexCoordinate,
  occupantId: string,
): IHexGrid {
  const key = `${coord.q},${coord.r}`;
  const existing = grid.hexes.get(key);
  if (!existing) throw new Error(`Missing hex ${key}`);

  const hexes = new Map(grid.hexes);
  hexes.set(key, { ...existing, occupantId });
  return { ...grid, hexes };
}

export function runScriptedMove(
  grid: IHexGrid,
  target: IHexCoordinate,
  unitOverrides: Partial<ReturnType<typeof createMinimalUnitState>> = {},
  options: {
    readonly movementType?: MovementType;
    readonly facing?: Facing;
    readonly capability?: IMovementCapability;
    readonly environmentalConditions?: IEnvironmentalConditions;
    readonly optionalRules?: readonly string[];
    readonly random?: SeededRandom;
  } = {},
) {
  const defaultFacing = facingFromOriginTo(target);
  const unit = {
    ...createMinimalUnitState('player-1', GameSide.Player, {
      q: 0,
      r: 0,
    }),
    facing: defaultFacing,
    secondaryFacing: defaultFacing,
    ...unitOverrides,
  };
  const state = {
    gameId: 'runner-movement-validation',
    status: GameStatus.Active,
    turn: 1,
    phase: GamePhase.Movement,
    activationIndex: 0,
    units: {
      'player-1': unit,
    },
    turnEvents: [],
  };
  const events: Parameters<typeof runMovementPhase>[0]['events'] = [];
  const violations: Parameters<typeof runMovementPhase>[0]['violations'] = [];

  const next = runMovementPhase({
    state,
    botPlayer: new ScriptedMovePlayer(
      'player-1',
      target,
      options.movementType,
      options.facing ?? unit.facing,
    ),
    grid,
    environmentalConditions: options.environmentalConditions,
    optionalRules: options.optionalRules,
    ...(options.capability
      ? {
          movementCapabilitiesByUnit: new Map([
            ['player-1', options.capability],
          ]),
        }
      : {}),
    invariantRunner: new InvariantRunner(),
    violations,
    events,
    gameId: state.gameId,
    random: options.random,
  });

  return { next, events };
}

export function facingFromOriginTo(target: IHexCoordinate): Facing {
  const distance = Math.max(
    Math.abs(target.q),
    Math.abs(target.r),
    Math.abs(target.q + target.r),
  );
  if (distance === 0) return Facing.North;

  const step = {
    q: target.q / distance,
    r: target.r / distance,
  };
  if (step.q === 0 && step.r === -1) return Facing.North;
  if (step.q === 1 && step.r === -1) return Facing.Northeast;
  if (step.q === 1 && step.r === 0) return Facing.Southeast;
  if (step.q === 0 && step.r === 1) return Facing.South;
  if (step.q === -1 && step.r === 1) return Facing.Southwest;
  if (step.q === -1 && step.r === 0) return Facing.Northwest;
  return Facing.North;
}

export function psrPayloads(
  events: readonly Parameters<typeof runMovementPhase>[0]['events'][number][],
): readonly IPSRTriggeredPayload[] {
  return events
    .filter((event) => event.type === GameEventType.PSRTriggered)
    .map((event) => event.payload as IPSRTriggeredPayload);
}

export function expectMovementEnhancementPsrBeforeMovementCommit(
  events: readonly Parameters<typeof runMovementPhase>[0]['events'][number][],
  reasonCode: PSRTrigger.MASCFailure | PSRTrigger.SuperchargerFailure,
): void {
  const psrIndex = events.findIndex(
    (event) =>
      event.type === GameEventType.PSRTriggered &&
      (event.payload as IPSRTriggeredPayload).reasonCode === reasonCode,
  );
  const movementIndex = events.findIndex(
    (event) => event.type === GameEventType.MovementDeclared,
  );

  expect(psrIndex).toBeGreaterThanOrEqual(0);
  expect(movementIndex).toBeGreaterThanOrEqual(0);
  expect(psrIndex).toBeLessThan(movementIndex);
}

export function expectSingleMovementInvalid(
  events: readonly Parameters<typeof runMovementPhase>[0]['events'][number][],
  reason: IMovementInvalidPayload['reason'],
): void {
  expect(events).toHaveLength(1);
  expect(events[0]).toMatchObject({
    type: GameEventType.MovementInvalid,
    payload: {
      unitId: 'player-1',
      reason,
    },
  });
}
