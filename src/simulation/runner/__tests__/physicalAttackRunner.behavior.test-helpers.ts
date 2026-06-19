/**
 * Behavior-class coverage for runner physical attacks that are supported by
 * the shared physical-attack rules but historically skipped by the runner.
 */

import { ActuatorType } from '@/types/construction/MechConfigurationSystem';
import {
  Facing,
  GameEventType,
  GamePhase,
  GameSide,
  GameStatus,
  IGameEvent,
  IGameState,
  IHex,
  IHexGrid,
  IDamageAppliedPayload,
  ICriticalHitResolvedPayload,
  IMinefieldChangedPayload,
  IRepresentedMinefieldState,
  IPhysicalAttackDeclaredPayload,
  IMovementCapability,
  IPilotHitPayload,
  IPhysicalAttackResolvedPayload,
  IUnitDestroyedPayload,
  IUnitFellPayload,
  IUnitGameState,
  LockState,
  MovementType,
  PSRTrigger,
} from '@/types/gameplay';
import { TerrainType } from '@/types/gameplay/TerrainTypes';
import { GroundMotionType } from '@/types/unit/BaseUnitInterfaces';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import {
  buildCriticalSlotManifest,
  type CriticalSlotManifest,
} from '@/utils/gameplay/criticalHitResolution';
import {
  SUPPORTED_PHYSICAL_WEAPON_ATTACK_TYPES,
  type PhysicalAttackINarcPodSelection,
  type PhysicalAttackLimb,
  type PhysicalAttackType,
} from '@/utils/gameplay/physicalAttacks';
import { terrainStringFromFeatures } from '@/utils/gameplay/terrainEncoding';

import type {
  IAIPlayer,
  IAIUnitState,
  IAttackEvent,
  IMovementEvent,
  IPhysicalAttackEvent,
  IRetreatEvent,
} from '../../ai/IAIPlayer';
import type { IViolation } from '../../invariants/types';

import { SeededRandom } from '../../core/SeededRandom';
import { InvariantRunner } from '../../invariants/InvariantRunner';
import {
  DISPLACEMENT_DOMINO_SECONDARY_FALLOUT_UNSUPPORTED_IDS,
  PHYSICAL_LEGALITY_GATE_SUPPORT,
} from '../CombatPhysicalLegalityGateSupport';
import { runPhysicalAttackPhase } from '../phases/physicalAttack';
import { DEFAULT_COMPONENT_DAMAGE } from '../SimulationRunnerConstants';

export const EXPLICIT_UNSUPPORTED_MINEFIELD_VARIANT_TYPES = [
  'command-detonated',
  'vibrabomb',
  'active',
  'inferno',
] satisfies readonly Exclude<
  NonNullable<IRepresentedMinefieldState['type']>,
  'conventional'
>[];

export class DeclaresPhysicalAttackAI implements IAIPlayer {
  constructor(
    private readonly attackType: PhysicalAttackType,
    private readonly twoHandedZweihander: boolean = false,
    private readonly selectedINarcPod?: PhysicalAttackINarcPodSelection,
    private readonly limb?: PhysicalAttackLimb,
    private readonly blockerStepOutDecision?: IPhysicalAttackDeclaredPayload['blockerStepOutDecision'],
  ) {}

  evaluateRetreat(): IRetreatEvent | null {
    return null;
  }

  playMovementPhase(
    _unit: IAIUnitState,
    _grid: IHexGrid,
    _capability: IMovementCapability,
  ): IMovementEvent | null {
    return null;
  }

  playAttackPhase(_attacker: IAIUnitState): IAttackEvent | null {
    return null;
  }

  playPhysicalAttackPhase(attacker: IAIUnitState): IPhysicalAttackEvent | null {
    if (attacker.unitId !== 'player-1') return null;
    return {
      type: GameEventType.PhysicalAttackDeclared,
      payload: {
        attackerId: attacker.unitId,
        targetId: 'opponent-1',
        attackType: this.attackType,
        ...(this.limb !== undefined ? { limb: this.limb } : {}),
        ...(this.twoHandedZweihander ? { twoHandedZweihander: true } : {}),
        ...(this.selectedINarcPod !== undefined
          ? { selectedINarcPod: this.selectedINarcPod }
          : {}),
        ...(this.blockerStepOutDecision !== undefined
          ? { blockerStepOutDecision: this.blockerStepOutDecision }
          : {}),
      },
    };
  }
}

export class DeclaresMappedPhysicalAttackAI implements IAIPlayer {
  constructor(
    private readonly declarations: Record<
      string,
      { readonly targetId: string; readonly attackType: PhysicalAttackType }
    >,
  ) {}

  evaluateRetreat(): IRetreatEvent | null {
    return null;
  }

  playMovementPhase(
    _unit: IAIUnitState,
    _grid: IHexGrid,
    _capability: IMovementCapability,
  ): IMovementEvent | null {
    return null;
  }

  playAttackPhase(_attacker: IAIUnitState): IAttackEvent | null {
    return null;
  }

  playPhysicalAttackPhase(attacker: IAIUnitState): IPhysicalAttackEvent | null {
    const declaration = this.declarations[attacker.unitId];
    if (!declaration) return null;
    return {
      type: GameEventType.PhysicalAttackDeclared,
      payload: {
        attackerId: attacker.unitId,
        targetId: declaration.targetId,
        attackType: declaration.attackType,
      },
    };
  }
}

export function createUnit(
  id: string,
  side: GameSide,
  position: { q: number; r: number },
  overrides: Partial<IUnitGameState> = {},
): IUnitGameState {
  return {
    id,
    side,
    position,
    facing: side === GameSide.Player ? Facing.South : Facing.North,
    heat: 0,
    movementThisTurn: MovementType.Stationary,
    hexesMovedThisTurn: 0,
    gunnery: 4,
    piloting: 5,
    armor: {
      head: 9,
      center_torso: 31,
      left_torso: 22,
      right_torso: 22,
      left_arm: 17,
      right_arm: 17,
      left_leg: 21,
      right_leg: 21,
    },
    structure: {
      head: 3,
      center_torso: 21,
      left_torso: 14,
      right_torso: 14,
      left_arm: 11,
      right_arm: 11,
      left_leg: 14,
      right_leg: 14,
    },
    destroyedLocations: [],
    destroyedEquipment: [],
    ammo: {},
    pilotWounds: 0,
    pilotConscious: true,
    destroyed: false,
    lockState: LockState.Pending,
    componentDamage: DEFAULT_COMPONENT_DAMAGE,
    prone: false,
    shutdown: false,
    pendingPSRs: [],
    damageThisPhase: 0,
    weaponsFiredThisTurn: [],
    ...overrides,
  };
}

export function createState(): IGameState {
  return {
    gameId: 'physical-runner-behavior',
    status: GameStatus.Active,
    turn: 1,
    phase: GamePhase.WeaponAttack,
    activationIndex: 0,
    units: {
      'player-1': createUnit('player-1', GameSide.Player, { q: 0, r: 0 }),
      'opponent-1': createUnit('opponent-1', GameSide.Opponent, {
        q: 1,
        r: 0,
      }),
    },
    turnEvents: [],
  };
}

export function scriptedD6Random(d6Rolls: readonly number[]): SeededRandom {
  let index = 0;
  return {
    next: () => {
      const roll = d6Rolls[index] ?? 1;
      index += 1;
      return (Math.max(1, Math.min(6, roll)) - 0.5) / 6;
    },
    nextInt: () => 0,
    nextRange: (min: number) => min,
    reset: () => {
      index = 0;
    },
  } as unknown as SeededRandom;
}

export function createPhysicalGrid(
  options: {
    targetElevation?: number;
    displacementElevation?: number;
    waterAttackerDepth?: number;
    waterTarget?: boolean;
    blockDfaDisplacement?: boolean;
    blockChargeDisplacement?: boolean;
    prohibitChargeDisplacement?: boolean;
    chargeDisplacementTerrain?: string;
  } = {},
): IHexGrid {
  const hexes = new Map();
  hexes.set('0,0', {
    coord: { q: 0, r: 0 },
    occupantId: 'player-1',
    terrain:
      options.waterAttackerDepth !== undefined
        ? `water:${options.waterAttackerDepth}`
        : TerrainType.Clear,
    elevation: 0,
  });
  hexes.set('1,0', {
    coord: { q: 1, r: 0 },
    occupantId: 'opponent-1',
    terrain: options.waterTarget ? 'water:1' : TerrainType.Clear,
    elevation: options.targetElevation ?? 0,
  });
  hexes.set('1,1', {
    coord: { q: 1, r: 1 },
    occupantId:
      options.blockDfaDisplacement || options.blockChargeDisplacement
        ? 'blocker-1'
        : null,
    terrain:
      options.chargeDisplacementTerrain ??
      (options.prohibitChargeDisplacement ? 'impassable' : TerrainType.Clear),
    elevation: options.displacementElevation ?? 0,
  });
  hexes.set('2,0', {
    coord: { q: 2, r: 0 },
    occupantId: options.blockDfaDisplacement ? 'blocker-2' : null,
    terrain: TerrainType.Clear,
    elevation: 0,
  });
  hexes.set('-1,1', {
    coord: { q: -1, r: 1 },
    occupantId: null,
    terrain: TerrainType.Clear,
    elevation: 0,
  });
  return { config: { radius: 2 }, hexes };
}

export function createSameHexPhysicalGrid(
  attackerTerrain: string = TerrainType.Clear,
): IHexGrid {
  const grid = createPhysicalGrid();
  const hexes = new Map(grid.hexes);
  const attackerHex = hexes.get('0,0');
  const targetHex = hexes.get('1,0');
  if (attackerHex) {
    hexes.set('0,0', { ...attackerHex, terrain: attackerTerrain });
  }
  if (targetHex) {
    hexes.set('1,0', { ...targetHex, occupantId: null });
  }
  return { ...grid, hexes };
}

export function createBreakGrapplePhysicalGrid(): IHexGrid {
  const grid = createSameHexPhysicalGrid();
  const hexes = new Map(grid.hexes);
  hexes.set('0,-1', {
    coord: { q: 0, r: -1 },
    occupantId: null,
    terrain: TerrainType.Clear,
    elevation: 0,
  });
  hexes.set('1,-1', {
    coord: { q: 1, r: -1 },
    occupantId: null,
    terrain: 'water:2',
    elevation: 0,
  });
  hexes.set('-1,0', {
    coord: { q: -1, r: 0 },
    occupantId: null,
    terrain: TerrainType.Clear,
    elevation: 0,
  });
  const dangerousHex = hexes.get('1,0');
  if (dangerousHex) {
    hexes.set('1,0', { ...dangerousHex, terrain: 'magma' });
  }
  return { ...grid, hexes };
}

export function createGroundedDropShipDfaGrid(): IHexGrid {
  const grid = createPhysicalGrid();
  const hexes = new Map(grid.hexes);
  hexes.set('1,2', {
    coord: { q: 1, r: 2 },
    occupantId: null,
    terrain: TerrainType.Clear,
    elevation: 0,
  });
  return { ...grid, hexes };
}

export function createSamePhaseDisplacementState(): IGameState {
  const state = createState();
  return {
    ...state,
    units: {
      'player-1': createUnit(
        'player-1',
        GameSide.Player,
        { q: 0, r: 0 },
        {
          facing: Facing.Southeast,
          piloting: 0,
        },
      ),
      'opponent-1': createUnit(
        'opponent-1',
        GameSide.Opponent,
        { q: 1, r: 0 },
        { pilotConscious: false },
      ),
      'player-2': createUnit(
        'player-2',
        GameSide.Player,
        { q: 0, r: 2 },
        {
          facing: Facing.Northeast,
          movementThisTurn: MovementType.Run,
          hexesMovedThisTurn: 5,
          piloting: 0,
        },
      ),
      'opponent-2': createUnit(
        'opponent-2',
        GameSide.Opponent,
        { q: 1, r: 1 },
        { pilotConscious: false },
      ),
    },
  };
}

export function createSamePhaseDisplacementGrid(): IHexGrid {
  const hexes = new Map<string, IHex>();
  const setHex = (q: number, r: number, occupantId: string | null): void => {
    hexes.set(`${q},${r}`, {
      coord: { q, r },
      occupantId,
      terrain: TerrainType.Clear,
      elevation: 0,
    });
  };

  setHex(0, 0, 'player-1');
  setHex(1, 0, 'opponent-1');
  setHex(2, 0, null);
  setHex(0, 2, 'player-2');
  setHex(1, 1, 'opponent-2');
  return { config: { radius: 3 }, hexes };
}

export function createDominoChargeGrid(): IHexGrid {
  const grid = createPhysicalGrid();
  const hexes = new Map(grid.hexes);
  const destination = hexes.get('1,1');
  if (destination) {
    hexes.set('1,1', { ...destination, occupantId: 'domino-blocker' });
  }
  hexes.set('1,2', {
    coord: { q: 1, r: 2 },
    occupantId: 'domino-tail',
    terrain: TerrainType.Clear,
    elevation: 0,
  });
  hexes.set('1,3', {
    coord: { q: 1, r: 3 },
    occupantId: null,
    terrain: TerrainType.Clear,
    elevation: 0,
  });
  return { ...grid, config: { radius: 3 }, hexes };
}

export function createBlockedDominoChargeGrid(): IHexGrid {
  const grid = createDominoChargeGrid();
  const hexes = new Map(grid.hexes);
  const terminalHex = hexes.get('1,3');
  if (terminalHex) {
    hexes.set('1,3', { ...terminalHex, terrain: 'impassable' });
  }
  return { ...grid, hexes };
}

export function createFriendlyDfaMissGrid(): IHexGrid {
  const grid = createPhysicalGrid();
  const hexes = new Map(grid.hexes);
  const destination = hexes.get('1,1');
  if (destination) {
    hexes.set('1,1', { ...destination, occupantId: 'opponent-friend' });
  }
  hexes.set('0,1', {
    coord: { q: 0, r: 1 },
    occupantId: null,
    terrain: TerrainType.Clear,
    elevation: 0,
  });
  hexes.set('1,2', {
    coord: { q: 1, r: 2 },
    occupantId: null,
    terrain: TerrainType.Clear,
    elevation: 0,
  });
  return { ...grid, hexes };
}

export function runPhase(
  attackType: PhysicalAttackType,
  options: {
    attacker?: Partial<IUnitGameState>;
    target?: Partial<IUnitGameState>;
    grid?: IHexGrid;
    movementCapabilitiesByUnit?: ReadonlyMap<string, IMovementCapability>;
    optionalRules?: readonly string[];
    manifestsByUnit?: Map<string, CriticalSlotManifest>;
    random?: SeededRandom;
    twoHandedZweihander?: boolean;
    selectedINarcPod?: PhysicalAttackINarcPodSelection;
    limb?: PhysicalAttackLimb;
  } = {},
): {
  initialState: IGameState;
  result: IGameState;
  events: IGameEvent[];
} {
  const events: IGameEvent[] = [];
  const violations: IViolation[] = [];
  const baseState = createState();
  const state = {
    ...baseState,
    units: {
      ...baseState.units,
      'player-1': {
        ...baseState.units['player-1'],
        ...options.attacker,
      },
      'opponent-1': {
        ...baseState.units['opponent-1'],
        ...options.target,
      },
    },
  };

  const result = runPhysicalAttackPhase({
    state,
    botPlayer: new DeclaresPhysicalAttackAI(
      attackType,
      options.twoHandedZweihander,
      options.selectedINarcPod,
      options.limb,
    ),
    invariantRunner: new InvariantRunner(),
    violations,
    events,
    gameId: state.gameId,
    grid: options.grid,
    movementCapabilitiesByUnit: options.movementCapabilitiesByUnit,
    optionalRules: options.optionalRules,
    manifestsByUnit: options.manifestsByUnit,
    random: options.random ?? new SeededRandom(11),
  });

  return { initialState: state, result, events };
}

export function runPhaseWithState(
  attackType: PhysicalAttackType,
  state: IGameState,
  grid?: IHexGrid,
  options: {
    random?: SeededRandom;
    blockerStepOutDecision?: IPhysicalAttackDeclaredPayload['blockerStepOutDecision'];
  } = {},
): {
  result: IGameState;
  events: IGameEvent[];
} {
  const events: IGameEvent[] = [];
  const violations: IViolation[] = [];
  const result = runPhysicalAttackPhase({
    state,
    botPlayer: new DeclaresPhysicalAttackAI(
      attackType,
      false,
      undefined,
      undefined,
      options.blockerStepOutDecision,
    ),
    invariantRunner: new InvariantRunner(),
    violations,
    events,
    gameId: state.gameId,
    grid,
    random: options.random ?? new SeededRandom(11),
  });

  return { result, events };
}

export function runAutomaticPhase(
  options: {
    attacker?: Partial<IUnitGameState>;
    target?: Partial<IUnitGameState>;
    grid?: IHexGrid;
    movementCapabilitiesByUnit?: ReadonlyMap<string, IMovementCapability>;
  } = {},
): {
  initialState: IGameState;
  result: IGameState;
  events: IGameEvent[];
} {
  const events: IGameEvent[] = [];
  const violations: IViolation[] = [];
  const baseState = createState();
  const state = {
    ...baseState,
    units: {
      ...baseState.units,
      'player-1': {
        ...baseState.units['player-1'],
        ...options.attacker,
      },
      'opponent-1': {
        ...baseState.units['opponent-1'],
        ...options.target,
      },
    },
  };

  const result = runPhysicalAttackPhase({
    state,
    invariantRunner: new InvariantRunner(),
    violations,
    events,
    gameId: state.gameId,
    grid: options.grid,
    movementCapabilitiesByUnit: options.movementCapabilitiesByUnit,
    random: new SeededRandom(11),
  });

  return { initialState: state, result, events };
}

export function damageEventsFor(
  events: readonly IGameEvent[],
  unitId: string,
): IDamageAppliedPayload[] {
  return events
    .filter((event) => event.type === GameEventType.DamageApplied)
    .map((event) => event.payload as IDamageAppliedPayload)
    .filter((payload) => payload.unitId === unitId);
}

export function resolvedPayload(
  events: readonly IGameEvent[],
): IPhysicalAttackResolvedPayload {
  return events.find(
    (event) => event.type === GameEventType.PhysicalAttackResolved,
  )?.payload as IPhysicalAttackResolvedPayload;
}

export function expectPendingPSR(
  state: IGameState,
  unitId: string,
  reasonCode: PSRTrigger,
  expected?: Record<string, unknown>,
): void {
  expect(state.units[unitId].pendingPSRs ?? []).toContainEqual(
    expect.objectContaining({ reasonCode, ...expected }),
  );
}
