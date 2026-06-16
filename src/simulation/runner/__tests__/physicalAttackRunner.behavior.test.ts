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

const EXPLICIT_UNSUPPORTED_MINEFIELD_VARIANT_TYPES = [
  'command-detonated',
  'vibrabomb',
  'active',
  'inferno',
] satisfies readonly Exclude<
  NonNullable<IRepresentedMinefieldState['type']>,
  'conventional'
>[];

class DeclaresPhysicalAttackAI implements IAIPlayer {
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

class DeclaresMappedPhysicalAttackAI implements IAIPlayer {
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

function createUnit(
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

function createState(): IGameState {
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

function scriptedD6Random(d6Rolls: readonly number[]): SeededRandom {
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

function createPhysicalGrid(
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

function createSameHexPhysicalGrid(
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

function createBreakGrapplePhysicalGrid(): IHexGrid {
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

function createGroundedDropShipDfaGrid(): IHexGrid {
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

function createSamePhaseDisplacementState(): IGameState {
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

function createSamePhaseDisplacementGrid(): IHexGrid {
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

function createDominoChargeGrid(): IHexGrid {
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

function createBlockedDominoChargeGrid(): IHexGrid {
  const grid = createDominoChargeGrid();
  const hexes = new Map(grid.hexes);
  const terminalHex = hexes.get('1,3');
  if (terminalHex) {
    hexes.set('1,3', { ...terminalHex, terrain: 'impassable' });
  }
  return { ...grid, hexes };
}

function createFriendlyDfaMissGrid(): IHexGrid {
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

function runPhase(
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

function runPhaseWithState(
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

function runAutomaticPhase(
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

function damageEventsFor(
  events: readonly IGameEvent[],
  unitId: string,
): IDamageAppliedPayload[] {
  return events
    .filter((event) => event.type === GameEventType.DamageApplied)
    .map((event) => event.payload as IDamageAppliedPayload)
    .filter((payload) => payload.unitId === unitId);
}

function resolvedPayload(
  events: readonly IGameEvent[],
): IPhysicalAttackResolvedPayload {
  return events.find(
    (event) => event.type === GameEventType.PhysicalAttackResolved,
  )?.payload as IPhysicalAttackResolvedPayload;
}

function expectPendingPSR(
  state: IGameState,
  unitId: string,
  reasonCode: PSRTrigger,
  expected?: Record<string, unknown>,
): void {
  expect(state.units[unitId].pendingPSRs ?? []).toContainEqual(
    expect.objectContaining({ reasonCode, ...expected }),
  );
}

describe('runPhysicalAttackPhase behavior validation lane', () => {
  it('resolves source-backed gun-emplacement physical targets as automatic hits', () => {
    const { events } = runPhase('kick', {
      target: { unitType: 'Gun Emplacement' },
    });

    const resolved = resolvedPayload(events);
    expect(resolved).toMatchObject({
      attackerId: 'player-1',
      targetId: 'opponent-1',
      attackType: 'kick',
      roll: 0,
      toHitNumber: 0,
      hit: true,
      damage: 13,
      automaticHit: true,
      automaticHitReason: 'Targeting adjacent gun emplacement.',
    });
    expect(damageEventsFor(events, 'opponent-1')).toHaveLength(1);
  });

  it('honors an injected push declaration and queues the pushed PSR', () => {
    const { events, result } = runPhase('push', {
      attacker: { facing: Facing.Southeast },
    });

    expect(events.map((event) => event.type)).toEqual([
      GameEventType.PhysicalAttackDeclared,
      GameEventType.PhysicalAttackResolved,
    ]);

    const resolved = events[1].payload as IPhysicalAttackResolvedPayload;
    expect(resolved).toMatchObject({
      attackerId: 'player-1',
      targetId: 'opponent-1',
      attackType: 'push',
      roll: 8,
      toHitNumber: 4,
      hit: true,
      damage: 0,
    });
    expect(result.units['opponent-1'].pendingPSRs).toEqual([
      expect.objectContaining({ reasonCode: PSRTrigger.Pushed }),
    ]);
  });

  it('honors an injected optional TacOps trip declaration and queues the tripped PSR', () => {
    const { events, result } = runPhase('trip', {
      attacker: { facing: Facing.Southeast },
      optionalRules: ['tacops_trip_attack'],
    });

    expect(events.map((event) => event.type)).toEqual([
      GameEventType.PhysicalAttackDeclared,
      GameEventType.PhysicalAttackResolved,
    ]);

    const resolved = events[1].payload as IPhysicalAttackResolvedPayload;
    expect(resolved).toMatchObject({
      attackerId: 'player-1',
      targetId: 'opponent-1',
      attackType: 'trip',
      roll: 8,
      toHitNumber: 4,
      hit: true,
      damage: 0,
    });
    expect(damageEventsFor(events, 'opponent-1')).toHaveLength(0);
    expect(result.units['opponent-1'].pendingPSRs).toEqual([
      expect.objectContaining({
        reason: 'Tripped',
        additionalModifier: 0,
        triggerSource: 'trip',
      }),
    ]);
  });

  it('honors an injected normal TacOps grapple declaration as zero-damage grapple state', () => {
    const { events, result } = runPhase('grapple', {
      attacker: {
        facing: Facing.Southeast,
        piloting: 1,
      },
      optionalRules: ['tacops_grappling'],
    });

    expect(events.map((event) => event.type)).toEqual([
      GameEventType.PhysicalAttackDeclared,
      GameEventType.PhysicalAttackResolved,
    ]);

    const resolved = events[1].payload as IPhysicalAttackResolvedPayload;
    expect(resolved).toMatchObject({
      attackerId: 'player-1',
      targetId: 'opponent-1',
      attackType: 'grapple',
      roll: 8,
      toHitNumber: 1,
      hit: true,
      damage: 0,
    });
    expect(damageEventsFor(events, 'opponent-1')).toHaveLength(0);
    expect(result.units['player-1']).toMatchObject({
      grappledUnitId: 'opponent-1',
      isGrappleAttacker: true,
      grappledThisRound: true,
      grappleSide: 'both',
      position: { q: 1, r: 0 },
    });
    expect(result.units['opponent-1']).toMatchObject({
      grappledUnitId: 'player-1',
      isGrappleAttacker: false,
      grappledThisRound: true,
      grappleSide: 'both',
      facing: Facing.Northwest,
    });
  });

  it('honors an injected break-grapple declaration as zero-damage state clearing', () => {
    const { events, result } = runPhase('break-grapple', {
      attacker: {
        position: { q: 0, r: 0 },
        facing: Facing.North,
        grappledUnitId: 'opponent-1',
        isGrappleAttacker: true,
        grappledThisRound: true,
        grappleSide: 'both',
      },
      target: {
        position: { q: 0, r: 0 },
        grappledUnitId: 'player-1',
        isGrappleAttacker: false,
        grappledThisRound: true,
        grappleSide: 'both',
      },
      grid: createBreakGrapplePhysicalGrid(),
      optionalRules: ['tacops_grappling'],
    });

    expect(events.map((event) => event.type)).toEqual([
      GameEventType.PhysicalAttackDeclared,
      GameEventType.PhysicalAttackResolved,
    ]);

    const resolved = events[1].payload as IPhysicalAttackResolvedPayload;
    expect(resolved).toMatchObject({
      attackerId: 'player-1',
      targetId: 'opponent-1',
      attackType: 'break-grapple',
      roll: 0,
      toHitNumber: 0,
      hit: true,
      damage: 0,
      automaticHit: true,
      automaticHitReason: 'original attacker',
      displacements: [
        {
          unitId: 'player-1',
          from: { q: 0, r: 0 },
          to: { q: 0, r: -1 },
          reason: 'break-grapple',
        },
      ],
    });
    expect(damageEventsFor(events, 'opponent-1')).toHaveLength(0);
    expect(result.units['player-1']).toMatchObject({
      position: { q: 0, r: -1 },
      grappledUnitId: undefined,
      isGrappleAttacker: undefined,
      grappledThisRound: false,
      grappleSide: undefined,
      facing: Facing.South,
    });
    expect(result.units['opponent-1']).toMatchObject({
      position: { q: 0, r: 0 },
      grappledUnitId: undefined,
      isGrappleAttacker: undefined,
      grappledThisRound: false,
      grappleSide: undefined,
    });
  });

  it('honors an injected source-backed thrash declaration as automatic infantry damage with attacker PSR', () => {
    const { events, result } = runPhase('thrash', {
      attacker: { prone: true },
      target: {
        position: { q: 0, r: 0 },
        unitType: UnitType.INFANTRY,
      },
      grid: createSameHexPhysicalGrid(),
    });

    expect(events.map((event) => event.type)).toEqual([
      GameEventType.PhysicalAttackDeclared,
      GameEventType.DamageApplied,
      GameEventType.PhysicalAttackResolved,
    ]);

    const resolved = resolvedPayload(events);
    expect(resolved).toMatchObject({
      attackerId: 'player-1',
      targetId: 'opponent-1',
      attackType: 'thrash',
      roll: 0,
      toHitNumber: 0,
      hit: true,
      damage: 22,
      automaticHit: true,
      automaticHitReason: 'Thrash attacks always hit.',
    });
    expect(damageEventsFor(events, 'opponent-1')).toEqual([
      expect.objectContaining({
        unitId: 'opponent-1',
        damage: 22,
        sourceUnitId: 'player-1',
      }),
    ]);
    expect(result.units['player-1'].pendingPSRs).toEqual([
      expect.objectContaining({
        reason: 'Thrashing attack',
        additionalModifier: 0,
        triggerSource: 'thrash_attacker_hit',
      }),
    ]);
    expect(result.units['opponent-1'].pendingPSRs).toHaveLength(0);
  });

  it('honors an injected source-backed jump jet attack declaration as selected-leg damage without PSR side effects', () => {
    const { events, result } = runPhase('jump-jet-attack', {
      attacker: { facing: Facing.Southeast },
      movementCapabilitiesByUnit: new Map([
        ['player-1', { walkMP: 4, runMP: 6, jumpMP: 2 }],
      ]),
      optionalRules: ['tacops_jump_jet_attack'],
    });

    expect(events.map((event) => event.type)).toEqual([
      GameEventType.PhysicalAttackDeclared,
      GameEventType.DamageApplied,
      GameEventType.PhysicalAttackResolved,
    ]);

    const resolved = resolvedPayload(events);
    expect(resolved).toMatchObject({
      attackerId: 'player-1',
      targetId: 'opponent-1',
      attackType: 'jump-jet-attack',
      toHitNumber: 7,
      hit: true,
      damage: 6,
    });
    expect(damageEventsFor(events, 'opponent-1')).toEqual([
      expect.objectContaining({
        unitId: 'opponent-1',
        damage: 6,
        sourceUnitId: 'player-1',
      }),
    ]);
    expect(result.units['player-1'].pendingPSRs).toHaveLength(0);
    expect(result.units['opponent-1'].pendingPSRs).toHaveLength(0);
  });

  it('honors an injected source-backed brush-off declaration as swarmer damage and dislodgement', () => {
    const { events, result } = runPhase('brush-off', {
      attacker: { piloting: 1 },
      target: {
        isSwarming: true,
        unitType: UnitType.INFANTRY,
      },
    });

    expect(events.map((event) => event.type)).toEqual([
      GameEventType.PhysicalAttackDeclared,
      GameEventType.DamageApplied,
      GameEventType.PhysicalAttackResolved,
    ]);

    const resolved = resolvedPayload(events);
    expect(resolved).toMatchObject({
      attackerId: 'player-1',
      targetId: 'opponent-1',
      attackType: 'brush-off',
      toHitNumber: 5,
      hit: true,
      damage: 7,
    });
    expect(damageEventsFor(events, 'opponent-1')).toEqual([
      expect.objectContaining({
        unitId: 'opponent-1',
        damage: 7,
        sourceUnitId: 'player-1',
      }),
    ]);
    expect(result.units['opponent-1'].isSwarming).toBe(false);
  });

  it('removes exactly one attached iNARC pod on a successful brush-off', () => {
    const iNarcPods = [
      { teamId: GameSide.Player, podType: 'homing' as const },
      { teamId: GameSide.Player, podType: 'ecm' as const },
    ];
    const { events, result } = runPhase('brush-off', {
      attacker: { piloting: 1 },
      target: { iNarcPods },
    });

    expect(resolvedPayload(events)).toMatchObject({
      attackerId: 'player-1',
      targetId: 'opponent-1',
      attackType: 'brush-off',
      toHitNumber: 5,
      hit: true,
    });
    expect(result.units['opponent-1'].iNarcPods).toEqual([iNarcPods[1]]);
  });

  it('removes the selected attached iNARC pod on a successful brush-off', () => {
    const selectedINarcPod = {
      teamId: GameSide.Player,
      podType: 'ecm' as const,
      location: 'left_torso',
    };
    const iNarcPods = [
      { teamId: GameSide.Player, podType: 'homing' as const },
      selectedINarcPod,
      { teamId: GameSide.Opponent, podType: 'ecm' as const },
    ];
    const { events, result } = runPhase('brush-off', {
      attacker: { piloting: 1 },
      target: { iNarcPods },
      selectedINarcPod,
    });

    const declared = events.find(
      (event) => event.type === GameEventType.PhysicalAttackDeclared,
    )?.payload as IPhysicalAttackDeclaredPayload | undefined;
    expect(declared).toMatchObject({
      attackType: 'brush-off',
      selectedINarcPod,
    });
    expect(resolvedPayload(events)).toMatchObject({
      attackType: 'brush-off',
      hit: true,
      selectedINarcPod,
    });
    expect(result.units['opponent-1'].iNarcPods).toEqual([
      iNarcPods[0],
      iNarcPods[2],
    ]);
  });

  it('honors an injected source-backed brush-off miss as attacker self-damage', () => {
    const { events, result } = runPhase('brush-off', {
      target: {
        isSwarming: true,
        unitType: UnitType.INFANTRY,
      },
    });

    expect(events.map((event) => event.type)).toEqual([
      GameEventType.PhysicalAttackDeclared,
      GameEventType.DamageApplied,
      GameEventType.PhysicalAttackResolved,
    ]);

    const resolved = resolvedPayload(events);
    expect(resolved).toMatchObject({
      attackerId: 'player-1',
      targetId: 'opponent-1',
      attackType: 'brush-off',
      toHitNumber: 9,
      hit: false,
      damage: 0,
    });
    expect(damageEventsFor(events, 'player-1')).toEqual([
      expect.objectContaining({
        unitId: 'player-1',
        damage: 7,
        sourceUnitId: 'player-1',
      }),
    ]);
    expect(result.units['opponent-1'].isSwarming).toBe(true);
  });

  it('preserves attached iNARC pods on a missed brush-off', () => {
    const iNarcPods = [
      { teamId: GameSide.Player, podType: 'haywire' as const },
      { teamId: GameSide.Player, podType: 'nemesis' as const },
    ];
    const { events, result } = runPhase('brush-off', {
      target: { iNarcPods },
    });

    expect(resolvedPayload(events)).toMatchObject({
      attackerId: 'player-1',
      targetId: 'opponent-1',
      attackType: 'brush-off',
      toHitNumber: 9,
      hit: false,
    });
    expect(result.units['opponent-1'].iNarcPods).toEqual(iNarcPods);
  });

  it('automatically selects brush-off against attached iNARC pods when it is the best legal attack', () => {
    const iNarcPods = [{ teamId: GameSide.Player, podType: 'homing' as const }];
    const { events, result } = runAutomaticPhase({
      attacker: {
        piloting: 1,
        componentDamage: {
          ...DEFAULT_COMPONENT_DAMAGE,
          actuators: { [ActuatorType.HIP]: true },
        },
      },
      target: { iNarcPods },
    });

    const declared = events.find(
      (event) =>
        event.type === GameEventType.PhysicalAttackDeclared &&
        (event.payload as IPhysicalAttackDeclaredPayload).attackerId ===
          'player-1',
    )?.payload as IPhysicalAttackDeclaredPayload | undefined;

    expect(declared).toMatchObject({
      attackerId: 'player-1',
      targetId: 'opponent-1',
      attackType: 'brush-off',
      selectedINarcPod: iNarcPods[0],
    });
    expect(resolvedPayload(events)).toMatchObject({
      attackType: 'brush-off',
      hit: true,
      selectedINarcPod: iNarcPods[0],
    });
    expect(result.units['opponent-1'].iNarcPods).toEqual([]);
  });

  it('rejects injected jump jet attacks without the TacOps option before side effects', () => {
    const { events, result } = runPhase('jump-jet-attack', {
      attacker: { facing: Facing.Southeast },
      movementCapabilitiesByUnit: new Map([
        ['player-1', { walkMP: 4, runMP: 6, jumpMP: 2 }],
      ]),
    });

    expect(resolvedPayload(events)).toMatchObject({
      attackType: 'jump-jet-attack',
      roll: 0,
      toHitNumber: Infinity,
      hit: false,
      damage: 0,
      location: 'TacOpsJumpJetAttackDisabled',
    });
    expect(damageEventsFor(events, 'opponent-1')).toHaveLength(0);
    expect(result.units['player-1'].pendingPSRs).toHaveLength(0);
    expect(result.units['opponent-1'].pendingPSRs).toHaveLength(0);
  });

  it('rejects injected thrash declarations in non-clear same-hex terrain before side effects', () => {
    const { events, result } = runPhase('thrash', {
      attacker: { prone: true },
      target: {
        position: { q: 0, r: 0 },
        unitType: UnitType.INFANTRY,
      },
      grid: createSameHexPhysicalGrid(TerrainType.LightWoods),
    });

    expect(resolvedPayload(events)).toMatchObject({
      attackType: 'thrash',
      roll: 0,
      toHitNumber: Infinity,
      hit: false,
      damage: 0,
      location: 'TerrainNotClearOrPavement',
    });
    expect(damageEventsFor(events, 'opponent-1')).toHaveLength(0);
    expect(result.units['player-1'].pendingPSRs).toHaveLength(0);
    expect(result.units['opponent-1'].pendingPSRs).toHaveLength(0);
  });

  it('rejects injected physical declarations against passenger targets before side effects', () => {
    const { events, result } = runPhase('kick', {
      target: { isPassenger: true },
    });

    expect(resolvedPayload(events)).toMatchObject({
      attackType: 'kick',
      roll: 0,
      toHitNumber: Infinity,
      hit: false,
      damage: 0,
      location: 'TargetPassenger',
    });
    expect(damageEventsFor(events, 'opponent-1')).toHaveLength(0);
    expect(result.units['opponent-1'].pendingPSRs).toHaveLength(0);
    expect(result.units['opponent-1'].position).toEqual({ q: 1, r: 0 });
    expect(result.units['player-1'].position).toEqual({ q: 0, r: 0 });
  });

  it('removes ejected units from runner physical target selection', () => {
    const { events, result } = runPhase('kick', {
      target: { hasEjected: true },
    });

    expect(events).toHaveLength(0);
    expect(damageEventsFor(events, 'opponent-1')).toHaveLength(0);
    expect(result.units['opponent-1'].pendingPSRs).toHaveLength(0);
    expect(result.units['opponent-1'].position).toEqual({ q: 1, r: 0 });
    expect(result.units['player-1'].position).toEqual({ q: 0, r: 0 });
  });

  it('removes retreated units from runner physical target selection', () => {
    const { events, result } = runPhase('kick', {
      target: { hasRetreated: true },
    });

    expect(events).toHaveLength(0);
    expect(damageEventsFor(events, 'opponent-1')).toHaveLength(0);
    expect(result.units['opponent-1'].pendingPSRs).toHaveLength(0);
    expect(result.units['opponent-1'].position).toEqual({ q: 1, r: 0 });
    expect(result.units['player-1'].position).toEqual({ q: 0, r: 0 });
  });

  it('rejects injected physical declarations against swarming targets before side effects', () => {
    const { events, result } = runPhase('kick', {
      target: { isSwarming: true },
    });

    expect(resolvedPayload(events)).toMatchObject({
      attackType: 'kick',
      roll: 0,
      toHitNumber: Infinity,
      hit: false,
      damage: 0,
      location: 'TargetSwarming',
    });
    expect(damageEventsFor(events, 'opponent-1')).toHaveLength(0);
    expect(result.units['opponent-1'].pendingPSRs).toHaveLength(0);
    expect(result.units['opponent-1'].position).toEqual({ q: 1, r: 0 });
    expect(result.units['player-1'].position).toEqual({ q: 0, r: 0 });
  });

  it('rejects injected physical declarations against targets making DFA before side effects', () => {
    const { events, result } = runPhase('kick', {
      target: { isMakingDFA: true },
    });

    expect(resolvedPayload(events)).toMatchObject({
      attackType: 'kick',
      roll: 0,
      toHitNumber: Infinity,
      hit: false,
      damage: 0,
      location: 'TargetMakingDFA',
    });
    expect(damageEventsFor(events, 'opponent-1')).toHaveLength(0);
    expect(result.units['opponent-1'].pendingPSRs).toHaveLength(0);
    expect(result.units['opponent-1'].position).toEqual({ q: 1, r: 0 });
    expect(result.units['player-1'].position).toEqual({ q: 0, r: 0 });
  });

  it('rejects injected charge declarations against targets making displacement attacks before side effects', () => {
    const { events, result } = runPhase('charge', {
      attacker: {
        movementThisTurn: MovementType.Run,
        hexesMovedThisTurn: 5,
      },
      target: { isMakingDisplacementAttack: true },
    });

    expect(resolvedPayload(events)).toMatchObject({
      attackType: 'charge',
      roll: 0,
      toHitNumber: Infinity,
      hit: false,
      damage: 0,
      location: 'TargetMakingDisplacementAttack',
    });
    expect(damageEventsFor(events, 'opponent-1')).toHaveLength(0);
    expect(damageEventsFor(events, 'player-1')).toHaveLength(0);
    expect(result.units['opponent-1'].pendingPSRs).toHaveLength(0);
    expect(result.units['player-1'].pendingPSRs).toHaveLength(0);
    expect(result.units['opponent-1'].position).toEqual({ q: 1, r: 0 });
    expect(result.units['player-1'].position).toEqual({ q: 0, r: 0 });
  });

  it('rejects injected push declarations against targets pushing another unit before side effects', () => {
    const { events, result } = runPhase('push', {
      attacker: { facing: Facing.Southeast },
      target: {
        isMakingDisplacementAttack: true,
        isPushing: true,
        displacementAttackTargetId: 'third-unit',
      },
    });

    expect(resolvedPayload(events)).toMatchObject({
      attackType: 'push',
      roll: 0,
      toHitNumber: Infinity,
      hit: false,
      damage: 0,
      location: 'TargetPushingAnotherMek',
    });
    expect(damageEventsFor(events, 'opponent-1')).toHaveLength(0);
    expect(damageEventsFor(events, 'player-1')).toHaveLength(0);
    expect(result.units['opponent-1'].pendingPSRs).toHaveLength(0);
    expect(result.units['player-1'].pendingPSRs).toHaveLength(0);
    expect(result.units['opponent-1'].position).toEqual({ q: 1, r: 0 });
    expect(result.units['player-1'].position).toEqual({ q: 0, r: 0 });
  });

  it('rejects injected physical declarations against targets inside another building before side effects', () => {
    const { events, result } = runPhase('kick', {
      target: { occupiedBuildingId: 'building-east' },
    });

    expect(resolvedPayload(events)).toMatchObject({
      attackType: 'kick',
      roll: 0,
      toHitNumber: Infinity,
      hit: false,
      damage: 0,
      location: 'TargetInsideBuilding',
    });
    expect(damageEventsFor(events, 'opponent-1')).toHaveLength(0);
    expect(result.units['opponent-1'].pendingPSRs).toHaveLength(0);
    expect(result.units['opponent-1'].position).toEqual({ q: 1, r: 0 });
    expect(result.units['player-1'].position).toEqual({ q: 0, r: 0 });
  });

  it('rejects injected physical declarations against airborne targets before side effects', () => {
    const { events, result } = runPhase('kick', {
      target: { isAirborne: true },
    });

    expect(resolvedPayload(events)).toMatchObject({
      attackType: 'kick',
      roll: 0,
      toHitNumber: Infinity,
      hit: false,
      damage: 0,
      location: 'TargetAirborne',
    });
    expect(damageEventsFor(events, 'opponent-1')).toHaveLength(0);
    expect(result.units['opponent-1'].pendingPSRs).toHaveLength(0);
    expect(result.units['opponent-1'].position).toEqual({ q: 1, r: 0 });
    expect(result.units['player-1'].position).toEqual({ q: 0, r: 0 });
  });

  it('hydrates runner jump MP for DFA reach against airborne VTOL targets', () => {
    const reachable = runPhase('dfa', {
      attacker: {
        movementThisTurn: MovementType.Jump,
        hexesMovedThisTurn: 4,
        piloting: 0,
      },
      target: { isAirborne: true, unitType: UnitType.VTOL },
      grid: createPhysicalGrid({ targetElevation: 5 }),
      movementCapabilitiesByUnit: new Map([
        ['player-1', { walkMP: 4, runMP: 6, jumpMP: 4 }],
      ]),
    });
    const reachablePayload = resolvedPayload(reachable.events);

    expect(reachablePayload.attackType).toBe('dfa');
    expect(Number.isFinite(reachablePayload.toHitNumber)).toBe(true);
    expect(reachablePayload.location).not.toBe('TargetAirborne');
    expect(reachablePayload.location).not.toBe('ElevationMismatch');

    const unreachable = runPhase('dfa', {
      attacker: {
        movementThisTurn: MovementType.Jump,
        hexesMovedThisTurn: 4,
      },
      target: { isAirborne: true, unitType: UnitType.VTOL },
      grid: createPhysicalGrid({ targetElevation: 5 }),
      movementCapabilitiesByUnit: new Map([
        ['player-1', { walkMP: 4, runMP: 6, jumpMP: 3 }],
      ]),
    });

    expect(resolvedPayload(unreachable.events)).toMatchObject({
      attackType: 'dfa',
      roll: 0,
      toHitNumber: Infinity,
      hit: false,
      damage: 0,
      location: 'ElevationMismatch',
    });
    expect(damageEventsFor(unreachable.events, 'opponent-1')).toHaveLength(0);
    expect(damageEventsFor(unreachable.events, 'player-1')).toHaveLength(0);
    expect(unreachable.result.units['opponent-1'].pendingPSRs).toHaveLength(0);
    expect(unreachable.result.units['player-1'].pendingPSRs).toHaveLength(0);
  });

  it('uses target motion type for runner DFA reach against airborne WIGE vehicles', () => {
    const unreachable = runPhase('dfa', {
      attacker: {
        movementThisTurn: MovementType.Jump,
        hexesMovedThisTurn: 4,
      },
      target: {
        isAirborne: true,
        unitType: UnitType.VEHICLE,
        motionType: GroundMotionType.WIGE,
      },
      grid: createPhysicalGrid({ targetElevation: 5 }),
      movementCapabilitiesByUnit: new Map([
        ['player-1', { walkMP: 4, runMP: 6, jumpMP: 3 }],
      ]),
    });

    expect(resolvedPayload(unreachable.events)).toMatchObject({
      attackType: 'dfa',
      roll: 0,
      toHitNumber: Infinity,
      hit: false,
      damage: 0,
      location: 'ElevationMismatch',
    });
  });

  it('rejects injected physical declarations by evading attackers before side effects', () => {
    const { events, result } = runPhase('kick', {
      attacker: { isEvading: true },
    });

    expect(resolvedPayload(events)).toMatchObject({
      attackType: 'kick',
      roll: 0,
      toHitNumber: Infinity,
      hit: false,
      damage: 0,
      location: 'AttackerEvading',
    });
    expect(damageEventsFor(events, 'opponent-1')).toHaveLength(0);
    expect(result.units['opponent-1'].pendingPSRs).toHaveLength(0);
    expect(result.units['opponent-1'].position).toEqual({ q: 1, r: 0 });
    expect(result.units['player-1'].position).toEqual({ q: 0, r: 0 });
  });

  it('rejects injected physical declarations by cargo-interacting attackers before side effects', () => {
    const { events, result } = runPhase('kick', {
      attacker: { isLoadingOrUnloadingCargo: true },
    });

    expect(resolvedPayload(events)).toMatchObject({
      attackType: 'kick',
      roll: 0,
      toHitNumber: Infinity,
      hit: false,
      damage: 0,
      location: 'AttackerCargoInteraction',
    });
    expect(damageEventsFor(events, 'opponent-1')).toHaveLength(0);
    expect(result.units['opponent-1'].pendingPSRs).toHaveLength(0);
    expect(result.units['opponent-1'].position).toEqual({ q: 1, r: 0 });
    expect(result.units['player-1'].position).toEqual({ q: 0, r: 0 });
  });

  it('rejects injected physical declarations against different-board targets before side effects', () => {
    const { events, result } = runPhase('kick', {
      attacker: { boardId: 'board-alpha' },
      target: { boardId: 'board-beta' },
    });

    expect(resolvedPayload(events)).toMatchObject({
      attackType: 'kick',
      roll: 0,
      toHitNumber: Infinity,
      hit: false,
      damage: 0,
      location: 'DifferentBoard',
    });
    expect(damageEventsFor(events, 'opponent-1')).toHaveLength(0);
    expect(result.units['opponent-1'].pendingPSRs).toHaveLength(0);
    expect(result.units['opponent-1'].position).toEqual({ q: 1, r: 0 });
    expect(result.units['player-1'].position).toEqual({ q: 0, r: 0 });
  });

  it('rejects source-backed push legality gates before displacement side effects', () => {
    const { events, result } = runPhase('push', {
      target: { prone: true },
    });

    const resolved = resolvedPayload(events);
    expect(resolved).toMatchObject({
      attackType: 'push',
      roll: 0,
      toHitNumber: Infinity,
      hit: false,
      damage: 0,
    });
    expect(resolved.displacements).toBeUndefined();
    expect(result.units['opponent-1'].pendingPSRs).toHaveLength(0);
    expect(result.units['opponent-1'].position).toEqual({ q: 1, r: 0 });
    expect(result.units['player-1'].position).toEqual({ q: 0, r: 0 });
  });

  it('keeps injected push declarations conservative when fired weapon locations are unknown', () => {
    const { events, result } = runPhase('push', {
      attacker: {
        facing: Facing.Southeast,
        weaponsFiredThisTurn: ['right-arm-medium-laser'],
      },
    });

    const resolved = resolvedPayload(events);
    expect(resolved).toMatchObject({
      attackType: 'push',
      roll: 0,
      toHitNumber: Infinity,
      hit: false,
      damage: 0,
      location: 'WeaponFiredThisTurn',
    });
    expect(resolved.displacements).toBeUndefined();
    expect(result.units['opponent-1'].pendingPSRs).toHaveLength(0);
    expect(result.units['opponent-1'].position).toEqual({ q: 1, r: 0 });
    expect(result.units['player-1'].position).toEqual({ q: 0, r: 0 });
  });

  it('rejects injected push declarations after hydrated arm-mounted weapon fire', () => {
    const { events, result } = runPhase('push', {
      attacker: {
        facing: Facing.Southeast,
        weaponsFiredThisTurn: ['right-arm-medium-laser'],
        weaponLocationById: {
          'right-arm-medium-laser': 'RIGHT_ARM',
        },
      },
    });

    const resolved = resolvedPayload(events);
    expect(resolved).toMatchObject({
      attackType: 'push',
      roll: 0,
      toHitNumber: Infinity,
      hit: false,
      damage: 0,
      location: 'WeaponFiredThisTurn',
    });
    expect(resolved.displacements).toBeUndefined();
    expect(result.units['opponent-1'].pendingPSRs).toHaveLength(0);
    expect(result.units['opponent-1'].position).toEqual({ q: 1, r: 0 });
    expect(result.units['player-1'].position).toEqual({ q: 0, r: 0 });
  });

  it('allows injected push declarations after hydrated torso-mounted weapon fire', () => {
    const { events, result } = runPhase('push', {
      attacker: {
        facing: Facing.Southeast,
        weaponsFiredThisTurn: ['center-torso-laser'],
        weaponLocationById: {
          'center-torso-laser': 'CENTER_TORSO',
        },
      },
    });

    const resolved = resolvedPayload(events);
    expect(resolved).toMatchObject({
      attackType: 'push',
      roll: 8,
      toHitNumber: 4,
      hit: true,
      damage: 0,
    });
    expect(result.units['opponent-1'].pendingPSRs).toEqual([
      expect.objectContaining({ reasonCode: PSRTrigger.Pushed }),
    ]);
  });

  it('rejects injected push declarations when either attacker arm is missing', () => {
    const { events, result } = runPhase('push', {
      attacker: {
        facing: Facing.Southeast,
        destroyedLocations: ['left_arm'],
      },
    });

    const resolved = resolvedPayload(events);
    expect(resolved).toMatchObject({
      attackType: 'push',
      roll: 0,
      toHitNumber: Infinity,
      hit: false,
      damage: 0,
      location: 'LimbMissing',
    });
    expect(resolved.displacements).toBeUndefined();
    expect(result.units['opponent-1'].pendingPSRs).toHaveLength(0);
    expect(result.units['opponent-1'].position).toEqual({ q: 1, r: 0 });
    expect(result.units['player-1'].position).toEqual({ q: 0, r: 0 });
  });

  it('rejects injected punch and kick declarations when source-required limbs are missing', () => {
    const missingPunchArm = runPhase('punch', {
      attacker: {
        destroyedLocations: ['right_arm'],
      },
    });

    expect(resolvedPayload(missingPunchArm.events)).toMatchObject({
      attackType: 'punch',
      roll: 0,
      toHitNumber: Infinity,
      hit: false,
      damage: 0,
      location: 'LimbMissing',
    });
    expect(damageEventsFor(missingPunchArm.events, 'opponent-1')).toHaveLength(
      0,
    );

    const missingKickLeg = runPhase('kick', {
      attacker: {
        destroyedLocations: ['left_leg'],
      },
    });

    expect(resolvedPayload(missingKickLeg.events)).toMatchObject({
      attackType: 'kick',
      roll: 0,
      toHitNumber: Infinity,
      hit: false,
      damage: 0,
      location: 'LimbMissing',
    });
    expect(damageEventsFor(missingKickLeg.events, 'opponent-1')).toHaveLength(
      0,
    );
    expect(missingKickLeg.result.units['player-1'].pendingPSRs).toHaveLength(0);
  });

  it('rejects injected push declarations for explicit non-Mek attackers or targets', () => {
    const nonMekAttacker = runPhase('push', {
      attacker: {
        facing: Facing.Southeast,
        unitType: UnitType.VEHICLE,
      },
    });

    expect(resolvedPayload(nonMekAttacker.events)).toMatchObject({
      attackType: 'push',
      roll: 0,
      toHitNumber: Infinity,
      hit: false,
      damage: 0,
      location: 'AttackerNotMek',
    });
    expect(nonMekAttacker.result.units['opponent-1'].pendingPSRs).toHaveLength(
      0,
    );
    expect(nonMekAttacker.result.units['opponent-1'].position).toEqual({
      q: 1,
      r: 0,
    });
    expect(nonMekAttacker.result.units['player-1'].position).toEqual({
      q: 0,
      r: 0,
    });

    const nonMekTarget = runPhase('push', {
      attacker: { facing: Facing.Southeast },
      target: { unitType: UnitType.BATTLE_ARMOR },
    });

    expect(resolvedPayload(nonMekTarget.events)).toMatchObject({
      attackType: 'push',
      roll: 0,
      toHitNumber: Infinity,
      hit: false,
      damage: 0,
      location: 'TargetNotMek',
    });
    expect(nonMekTarget.result.units['opponent-1'].pendingPSRs).toHaveLength(0);
    expect(nonMekTarget.result.units['opponent-1'].position).toEqual({
      q: 1,
      r: 0,
    });
    expect(nonMekTarget.result.units['player-1'].position).toEqual({
      q: 0,
      r: 0,
    });
  });

  it('rejects injected push declarations from quad BattleMechs before side effects', () => {
    const quadAttacker = runPhase('push', {
      attacker: {
        facing: Facing.Southeast,
        isQuad: true,
      },
    });

    expect(resolvedPayload(quadAttacker.events)).toMatchObject({
      attackType: 'push',
      roll: 0,
      toHitNumber: Infinity,
      hit: false,
      damage: 0,
      location: 'AttackerQuad',
    });
    expect(quadAttacker.result.units['opponent-1'].pendingPSRs).toHaveLength(0);
    expect(quadAttacker.result.units['opponent-1'].position).toEqual({
      q: 1,
      r: 0,
    });
    expect(quadAttacker.result.units['player-1'].position).toEqual({
      q: 0,
      r: 0,
    });
  });

  it('rejects injected push declarations from airborne attackers before side effects', () => {
    const airborneAttacker = runPhase('push', {
      attacker: {
        facing: Facing.Southeast,
        isAirborne: true,
      },
    });

    expect(resolvedPayload(airborneAttacker.events)).toMatchObject({
      attackType: 'push',
      roll: 0,
      toHitNumber: Infinity,
      hit: false,
      damage: 0,
      location: 'AttackerAirborne',
    });
    expect(
      airborneAttacker.result.units['opponent-1'].pendingPSRs,
    ).toHaveLength(0);
    expect(airborneAttacker.result.units['opponent-1'].position).toEqual({
      q: 1,
      r: 0,
    });
    expect(airborneAttacker.result.units['player-1'].position).toEqual({
      q: 0,
      r: 0,
    });
  });

  it('rejects injected push declarations with rear-flipped arms before side effects', () => {
    const flippedArms = runPhase('push', {
      attacker: {
        facing: Facing.Southeast,
        armsFlipped: true,
      },
    });

    expect(resolvedPayload(flippedArms.events)).toMatchObject({
      attackType: 'push',
      roll: 0,
      toHitNumber: Infinity,
      hit: false,
      damage: 0,
      location: 'ArmsFlipped',
    });
    expect(flippedArms.result.units['opponent-1'].pendingPSRs).toHaveLength(0);
    expect(flippedArms.result.units['opponent-1'].position).toEqual({
      q: 1,
      r: 0,
    });
    expect(flippedArms.result.units['player-1'].position).toEqual({
      q: 0,
      r: 0,
    });
  });

  it('rejects injected charge declarations against non-Mek or prone targets before side effects', () => {
    const nonMekTarget = runPhase('charge', {
      attacker: {
        movementThisTurn: MovementType.Run,
        hexesMovedThisTurn: 5,
      },
      target: { unitType: UnitType.BATTLE_ARMOR },
    });

    expect(resolvedPayload(nonMekTarget.events)).toMatchObject({
      attackType: 'charge',
      roll: 0,
      toHitNumber: Infinity,
      hit: false,
      damage: 0,
      location: 'TargetNotMek',
    });
    expect(damageEventsFor(nonMekTarget.events, 'opponent-1')).toHaveLength(0);
    expect(damageEventsFor(nonMekTarget.events, 'player-1')).toHaveLength(0);
    expect(nonMekTarget.result.units['opponent-1'].pendingPSRs).toHaveLength(0);
    expect(nonMekTarget.result.units['player-1'].pendingPSRs).toHaveLength(0);
    expect(nonMekTarget.result.units['opponent-1'].position).toEqual({
      q: 1,
      r: 0,
    });
    expect(nonMekTarget.result.units['player-1'].position).toEqual({
      q: 0,
      r: 0,
    });

    const gunEmplacementTarget = runPhase('charge', {
      attacker: {
        movementThisTurn: MovementType.Run,
        hexesMovedThisTurn: 5,
      },
      target: { unitType: 'Gun Emplacement' },
    });
    const gunEmplacementResolved = resolvedPayload(gunEmplacementTarget.events);

    expect(gunEmplacementResolved).toMatchObject({
      attackType: 'charge',
      roll: 0,
      toHitNumber: Infinity,
      hit: false,
      damage: 0,
      location: 'TargetNotMek',
    });
    expect(gunEmplacementResolved.automaticHit).toBeUndefined();
    expect(
      damageEventsFor(gunEmplacementTarget.events, 'opponent-1'),
    ).toHaveLength(0);
    expect(
      damageEventsFor(gunEmplacementTarget.events, 'player-1'),
    ).toHaveLength(0);
    expect(
      gunEmplacementTarget.result.units['opponent-1'].pendingPSRs,
    ).toHaveLength(0);
    expect(
      gunEmplacementTarget.result.units['player-1'].pendingPSRs,
    ).toHaveLength(0);
    expect(gunEmplacementTarget.result.units['opponent-1'].position).toEqual({
      q: 1,
      r: 0,
    });
    expect(gunEmplacementTarget.result.units['player-1'].position).toEqual({
      q: 0,
      r: 0,
    });

    const proneTarget = runPhase('charge', {
      attacker: {
        movementThisTurn: MovementType.Run,
        hexesMovedThisTurn: 5,
      },
      target: { prone: true },
    });

    expect(resolvedPayload(proneTarget.events)).toMatchObject({
      attackType: 'charge',
      roll: 0,
      toHitNumber: Infinity,
      hit: false,
      damage: 0,
      location: 'TargetProne',
    });
    expect(damageEventsFor(proneTarget.events, 'opponent-1')).toHaveLength(0);
    expect(damageEventsFor(proneTarget.events, 'player-1')).toHaveLength(0);
    expect(proneTarget.result.units['opponent-1'].pendingPSRs).toHaveLength(0);
    expect(proneTarget.result.units['player-1'].pendingPSRs).toHaveLength(0);
    expect(proneTarget.result.units['opponent-1'].position).toEqual({
      q: 1,
      r: 0,
    });
    expect(proneTarget.result.units['player-1'].position).toEqual({
      q: 0,
      r: 0,
    });
  });

  it('skips prone charge attackers before injected physical declarations', () => {
    const proneAttacker = runPhase('charge', {
      attacker: {
        movementThisTurn: MovementType.Run,
        hexesMovedThisTurn: 5,
        prone: true,
      },
    });

    expect(proneAttacker.events).toEqual([]);
    expect(damageEventsFor(proneAttacker.events, 'opponent-1')).toHaveLength(0);
    expect(damageEventsFor(proneAttacker.events, 'player-1')).toHaveLength(0);
    expect(proneAttacker.result.units['opponent-1'].pendingPSRs).toHaveLength(
      0,
    );
    expect(proneAttacker.result.units['player-1'].pendingPSRs).toHaveLength(0);
    expect(proneAttacker.result.units['opponent-1'].position).toEqual({
      q: 1,
      r: 0,
    });
    expect(proneAttacker.result.units['player-1'].position).toEqual({
      q: 0,
      r: 0,
    });
  });

  it('rejects injected DFA declarations after mechanical jump booster movement before side effects', () => {
    const mechanicalJumpDfa = runPhase('dfa', {
      attacker: {
        movementThisTurn: MovementType.Jump,
        hexesMovedThisTurn: 4,
        usedMechanicalJumpBoosterThisTurn: true,
      },
    });

    expect(resolvedPayload(mechanicalJumpDfa.events)).toMatchObject({
      attackType: 'dfa',
      roll: 0,
      toHitNumber: Infinity,
      hit: false,
      damage: 0,
      location: 'MechanicalJumpBooster',
    });
    expect(
      damageEventsFor(mechanicalJumpDfa.events, 'opponent-1'),
    ).toHaveLength(0);
    expect(damageEventsFor(mechanicalJumpDfa.events, 'player-1')).toHaveLength(
      0,
    );
    expect(
      mechanicalJumpDfa.result.units['opponent-1'].pendingPSRs,
    ).toHaveLength(0);
    expect(mechanicalJumpDfa.result.units['player-1'].pendingPSRs).toHaveLength(
      0,
    );
  });

  it('rejects injected charge declarations after backward movement before side effects', () => {
    const backwardCharge = runPhase('charge', {
      attacker: {
        movementThisTurn: MovementType.Run,
        hexesMovedThisTurn: 5,
        movedBackwardThisTurn: true,
      },
    });

    expect(resolvedPayload(backwardCharge.events)).toMatchObject({
      attackType: 'charge',
      roll: 0,
      toHitNumber: Infinity,
      hit: false,
      damage: 0,
      location: 'ChargeBackwardMovement',
    });
    expect(damageEventsFor(backwardCharge.events, 'opponent-1')).toHaveLength(
      0,
    );
    expect(damageEventsFor(backwardCharge.events, 'player-1')).toHaveLength(0);
    expect(backwardCharge.result.units['opponent-1'].pendingPSRs).toHaveLength(
      0,
    );
    expect(backwardCharge.result.units['player-1'].pendingPSRs).toHaveLength(0);
    expect(backwardCharge.result.units['opponent-1'].position).toEqual({
      q: 1,
      r: 0,
    });
    expect(backwardCharge.result.units['player-1'].position).toEqual({
      q: 0,
      r: 0,
    });
  });

  it('rejects injected charge declarations after jump movement before side effects', () => {
    const jumpCharge = runPhase('charge', {
      attacker: {
        movementThisTurn: MovementType.Jump,
        hexesMovedThisTurn: 5,
      },
    });

    expect(resolvedPayload(jumpCharge.events)).toMatchObject({
      attackType: 'charge',
      roll: 0,
      toHitNumber: Infinity,
      hit: false,
      damage: 0,
      location: 'ChargeJumpMovement',
    });
    expect(damageEventsFor(jumpCharge.events, 'opponent-1')).toHaveLength(0);
    expect(damageEventsFor(jumpCharge.events, 'player-1')).toHaveLength(0);
    expect(jumpCharge.result.units['opponent-1'].pendingPSRs).toHaveLength(0);
    expect(jumpCharge.result.units['player-1'].pendingPSRs).toHaveLength(0);
    expect(jumpCharge.result.units['opponent-1'].position).toEqual({
      q: 1,
      r: 0,
    });
    expect(jumpCharge.result.units['player-1'].position).toEqual({
      q: 0,
      r: 0,
    });
  });

  it('rejects injected charge declarations when target elevation does not overlap the attacker', () => {
    const elevatedTarget = runPhase('charge', {
      attacker: {
        movementThisTurn: MovementType.Run,
        hexesMovedThisTurn: 5,
      },
      grid: createPhysicalGrid({ targetElevation: 2 }),
    });

    expect(resolvedPayload(elevatedTarget.events)).toMatchObject({
      attackType: 'charge',
      roll: 0,
      toHitNumber: Infinity,
      hit: false,
      damage: 0,
      location: 'ElevationMismatch',
    });
    expect(damageEventsFor(elevatedTarget.events, 'opponent-1')).toHaveLength(
      0,
    );
    expect(damageEventsFor(elevatedTarget.events, 'player-1')).toHaveLength(0);
    expect(elevatedTarget.result.units['opponent-1'].pendingPSRs).toHaveLength(
      0,
    );
    expect(elevatedTarget.result.units['player-1'].pendingPSRs).toHaveLength(0);
    expect(elevatedTarget.result.units['opponent-1'].position).toEqual({
      q: 1,
      r: 0,
    });
    expect(elevatedTarget.result.units['player-1'].position).toEqual({
      q: 0,
      r: 0,
    });
  });

  it('rejects injected non-Mek charge declarations against infantry or ProtoMech targets', () => {
    const protoTarget = runPhase('charge', {
      attacker: {
        movementThisTurn: MovementType.Run,
        hexesMovedThisTurn: 5,
        unitType: UnitType.VEHICLE,
      },
      target: { unitType: UnitType.PROTOMECH },
    });

    expect(resolvedPayload(protoTarget.events)).toMatchObject({
      attackType: 'charge',
      roll: 0,
      toHitNumber: Infinity,
      hit: false,
      damage: 0,
      location: 'TargetInfantryOrProtoMek',
    });
    expect(damageEventsFor(protoTarget.events, 'opponent-1')).toHaveLength(0);
    expect(damageEventsFor(protoTarget.events, 'player-1')).toHaveLength(0);
    expect(protoTarget.result.units['opponent-1'].pendingPSRs).toHaveLength(0);
    expect(protoTarget.result.units['player-1'].pendingPSRs).toHaveLength(0);
    expect(protoTarget.result.units['opponent-1'].position).toEqual({
      q: 1,
      r: 0,
    });
    expect(protoTarget.result.units['player-1'].position).toEqual({
      q: 0,
      r: 0,
    });
  });

  it('rejects injected DFA declarations by infantry-family attackers before side effects', () => {
    const infantryAttacker = runPhase('dfa', {
      attacker: {
        movementThisTurn: MovementType.Jump,
        hexesMovedThisTurn: 4,
        unitType: UnitType.INFANTRY,
      },
    });

    expect(resolvedPayload(infantryAttacker.events)).toMatchObject({
      attackType: 'dfa',
      roll: 0,
      toHitNumber: Infinity,
      hit: false,
      damage: 0,
      location: 'AttackerInfantry',
    });
    expect(damageEventsFor(infantryAttacker.events, 'opponent-1')).toHaveLength(
      0,
    );
    expect(damageEventsFor(infantryAttacker.events, 'player-1')).toHaveLength(
      0,
    );
    expect(
      infantryAttacker.result.units['opponent-1'].pendingPSRs,
    ).toHaveLength(0);
    expect(infantryAttacker.result.units['player-1'].pendingPSRs).toHaveLength(
      0,
    );
    expect(infantryAttacker.result.units['opponent-1'].position).toEqual({
      q: 1,
      r: 0,
    });
    expect(infantryAttacker.result.units['player-1'].position).toEqual({
      q: 0,
      r: 0,
    });
  });

  it('rejects injected DFA declarations against DropShip targets before side effects', () => {
    const dropshipTarget = runPhase('dfa', {
      attacker: {
        movementThisTurn: MovementType.Jump,
        hexesMovedThisTurn: 4,
      },
      target: { unitType: UnitType.DROPSHIP },
    });

    expect(resolvedPayload(dropshipTarget.events)).toMatchObject({
      attackType: 'dfa',
      roll: 0,
      toHitNumber: Infinity,
      hit: false,
      damage: 0,
      location: 'TargetDropShip',
    });
    expect(damageEventsFor(dropshipTarget.events, 'opponent-1')).toHaveLength(
      0,
    );
    expect(damageEventsFor(dropshipTarget.events, 'player-1')).toHaveLength(0);
    expect(dropshipTarget.result.units['opponent-1'].pendingPSRs).toHaveLength(
      0,
    );
    expect(dropshipTarget.result.units['player-1'].pendingPSRs).toHaveLength(0);
    expect(dropshipTarget.result.units['opponent-1'].position).toEqual({
      q: 1,
      r: 0,
    });
    expect(dropshipTarget.result.units['player-1'].position).toEqual({
      q: 0,
      r: 0,
    });
  });

  it('rejects side-adjacent push targets that are not directly ahead', () => {
    const { events, result } = runPhase('push');

    const resolved = resolvedPayload(events);
    expect(resolved).toMatchObject({
      attackType: 'push',
      roll: 0,
      toHitNumber: Infinity,
      hit: false,
      damage: 0,
    });
    expect(resolved.displacements).toBeUndefined();
    expect(result.units['opponent-1'].position).toEqual({ q: 1, r: 0 });
    expect(result.units['player-1'].position).toEqual({ q: 0, r: 0 });
  });

  it('does not schedule injected physical attacks against non-adjacent targets', () => {
    const { events, result } = runPhase('kick', {
      target: { position: { q: 2, r: 0 } },
    });

    expect(
      events.filter(
        (event) =>
          event.type === GameEventType.PhysicalAttackDeclared ||
          event.type === GameEventType.PhysicalAttackResolved,
      ),
    ).toEqual([]);
    expect(result.units['opponent-1'].position).toEqual({ q: 2, r: 0 });
    expect(result.units['player-1'].position).toEqual({ q: 0, r: 0 });
  });

  it('does not schedule injected physical attacks against friendly targets', () => {
    const { events, result } = runPhase('kick', {
      target: { side: GameSide.Player },
    });

    expect(
      events.filter(
        (event) =>
          event.type === GameEventType.PhysicalAttackDeclared ||
          event.type === GameEventType.PhysicalAttackResolved,
      ),
    ).toEqual([]);
    expect(result.units['opponent-1'].side).toBe(GameSide.Player);
    expect(result.units['opponent-1'].position).toEqual({ q: 1, r: 0 });
    expect(result.units['player-1'].position).toEqual({ q: 0, r: 0 });
  });

  it('does not schedule injected physical attacks against destroyed targets', () => {
    const { events, result } = runPhase('kick', {
      target: { destroyed: true },
    });

    expect(
      events.filter(
        (event) =>
          event.type === GameEventType.PhysicalAttackDeclared ||
          event.type === GameEventType.PhysicalAttackResolved,
      ),
    ).toEqual([]);
    expect(result.units['opponent-1'].destroyed).toBe(true);
    expect(result.units['opponent-1'].position).toEqual({ q: 1, r: 0 });
    expect(result.units['player-1'].position).toEqual({ q: 0, r: 0 });
  });

  it('applies source-backed push displacement when the target hex is valid', () => {
    const { events, result } = runPhase('push', {
      attacker: { facing: Facing.Southeast },
      grid: createPhysicalGrid(),
    });

    const resolved = resolvedPayload(events);
    expect(resolved.displacements).toEqual([
      {
        unitId: 'opponent-1',
        from: { q: 1, r: 0 },
        to: { q: 2, r: 0 },
        reason: 'push',
      },
      {
        unitId: 'player-1',
        from: { q: 0, r: 0 },
        to: { q: 1, r: 0 },
        reason: 'push',
      },
    ]);
    expect(result.units['opponent-1'].position).toEqual({ q: 2, r: 0 });
    expect(result.units['player-1'].position).toEqual({ q: 1, r: 0 });
  });

  it('honors an injected melee weapon declaration and applies damage', () => {
    const { events, result } = runPhase('sword');

    const resolved = resolvedPayload(events);
    expect(resolved).toMatchObject({
      attackerId: 'player-1',
      targetId: 'opponent-1',
      attackType: 'sword',
      roll: 8,
      toHitNumber: 3,
      hit: true,
      damage: 8,
    });
    expect(
      events.some((event) => event.type === GameEventType.DamageApplied),
    ).toBe(true);
    expect(result.units['opponent-1'].armor.right_torso).toBeLessThan(22);
  });

  it('honors selected-arm melee weapon declarations in runner legality and events', () => {
    const { events } = runPhase('sword', {
      attacker: {
        componentDamage: {
          ...DEFAULT_COMPONENT_DAMAGE,
          actuatorsByLocation: {
            right_arm: { [ActuatorType.LOWER_ARM]: true },
          },
        },
      },
      limb: 'leftArm',
    });

    const declared = events.find(
      (event) => event.type === GameEventType.PhysicalAttackDeclared,
    )?.payload as IPhysicalAttackDeclaredPayload | undefined;
    const resolved = resolvedPayload(events);

    expect(declared).toMatchObject({
      attackType: 'sword',
      limb: 'leftArm',
    });
    expect(resolved).toMatchObject({
      attackType: 'sword',
      hit: true,
      damage: 8,
    });
  });

  it('threads target movement modifier into physical to-hit resolution', () => {
    const { events } = runPhase('kick', {
      target: {
        movementThisTurn: MovementType.Run,
        hexesMovedThisTurn: 5,
      },
    });

    expect(resolvedPayload(events)).toMatchObject({
      attackType: 'kick',
      roll: 8,
      toHitNumber: 5,
      hit: true,
    });
  });

  it('threads explicit target evasion into physical to-hit resolution', () => {
    const { events } = runPhase('kick', {
      target: { isEvading: true },
    });

    expect(resolvedPayload(events)).toMatchObject({
      attackType: 'kick',
      roll: 8,
      toHitNumber: 4,
      hit: true,
    });
  });

  it('threads explicit Skilled Evasion target bonuses into physical to-hit resolution', () => {
    const { events } = runPhase('kick', {
      target: { isEvading: true, evasionBonus: 3 },
    });

    expect(resolvedPayload(events)).toMatchObject({
      attackType: 'kick',
      roll: 8,
      toHitNumber: 6,
      hit: true,
    });
  });

  it('applies pilot physical SPAs to runner to-hit and damage math', () => {
    const { events } = runPhase('kick', {
      attacker: {
        abilities: ['melee-specialist'],
      },
    });

    expect(resolvedPayload(events)).toMatchObject({
      attackType: 'kick',
      roll: 8,
      toHitNumber: 2,
      hit: true,
      damage: 14,
    });
  });

  it('does not apply Melee Master as a flat runner physical damage bonus', () => {
    const { events } = runPhase('kick', {
      attacker: {
        abilities: ['melee-master'],
      },
    });

    expect(resolvedPayload(events)).toMatchObject({
      attackType: 'kick',
      roll: 8,
      toHitNumber: 3,
      hit: true,
      damage: 13,
    });
  });

  it('hydrates source-backed Frogman depth-2 water to runner physical to-hit', () => {
    const { events } = runPhase('kick', {
      attacker: {
        abilities: ['tm_frogman'],
      },
      grid: createPhysicalGrid({ waterAttackerDepth: 2 }),
    });

    expect(resolvedPayload(events)).toMatchObject({
      attackType: 'kick',
      roll: 8,
      toHitNumber: 2,
      hit: true,
    });
  });

  it('does not apply Frogman from shallow or target-only water', () => {
    const shallow = runPhase('kick', {
      attacker: {
        abilities: ['tm_frogman'],
      },
      grid: createPhysicalGrid({ waterAttackerDepth: 1 }),
    });
    const targetOnly = runPhase('kick', {
      attacker: {
        abilities: ['tm_frogman'],
      },
      grid: createPhysicalGrid({ waterTarget: true }),
    });

    expect(resolvedPayload(shallow.events)).toMatchObject({
      attackType: 'kick',
      toHitNumber: 3,
    });
    expect(resolvedPayload(targetOnly.events)).toMatchObject({
      attackType: 'kick',
      toHitNumber: 3,
    });
  });

  it('applies physical unit quirks to runner punch restrictions and to-hit', () => {
    const noArms = runPhase('punch', {
      attacker: {
        unitQuirks: ['no_arms'],
      },
    });
    expect(resolvedPayload(noArms.events)).toMatchObject({
      attackType: 'punch',
      roll: 0,
      toHitNumber: Infinity,
      hit: false,
      damage: 0,
    });

    const baselinePunch = resolvedPayload(runPhase('punch').events);
    const battleFist = runPhase('punch', {
      attacker: {
        unitQuirks: ['battle_fists_ra'],
      },
    });

    expect(baselinePunch).toMatchObject({
      attackType: 'punch',
      toHitNumber: 5,
      damage: 7,
    });
    expect(resolvedPayload(battleFist.events)).toMatchObject({
      attackType: 'punch',
      roll: 8,
      toHitNumber: 4,
      hit: true,
      damage: baselinePunch.damage,
    });
  });

  it('applies active TSM to runner physical damage', () => {
    const { events } = runPhase('kick', {
      attacker: {
        heat: 9,
        hasTSM: true,
      },
    });

    expect(resolvedPayload(events)).toMatchObject({
      attackType: 'kick',
      roll: 8,
      toHitNumber: 3,
      hit: true,
      damage: 26,
    });
  });

  it('derives underwater physical damage from water terrain', () => {
    const { events } = runPhase('kick', {
      grid: createPhysicalGrid({ waterTarget: true }),
    });

    expect(resolvedPayload(events)).toMatchObject({
      attackType: 'kick',
      roll: 8,
      toHitNumber: 3,
      hit: true,
      damage: 6,
    });
  });

  it('automatically selects charge after a running approach', () => {
    const { events } = runAutomaticPhase({
      attacker: {
        movementThisTurn: MovementType.Run,
        hexesMovedThisTurn: 5,
      },
    });

    const declared = events.find(
      (event) =>
        event.type === GameEventType.PhysicalAttackDeclared &&
        (event.payload as IPhysicalAttackDeclaredPayload).attackerId ===
          'player-1',
    )?.payload as IPhysicalAttackDeclaredPayload | undefined;

    expect(declared).toMatchObject({
      attackerId: 'player-1',
      targetId: 'opponent-1',
      attackType: 'charge',
    });
  });

  it('does not automatically select charge after a backward running approach', () => {
    const { events } = runAutomaticPhase({
      attacker: {
        movementThisTurn: MovementType.Run,
        hexesMovedThisTurn: 5,
        movedBackwardThisTurn: true,
      },
    });

    const declared = events.find(
      (event) =>
        event.type === GameEventType.PhysicalAttackDeclared &&
        (event.payload as IPhysicalAttackDeclaredPayload).attackerId ===
          'player-1',
    )?.payload as IPhysicalAttackDeclaredPayload | undefined;

    expect(declared).toMatchObject({
      attackerId: 'player-1',
      targetId: 'opponent-1',
      attackType: 'kick',
    });
  });

  it('automatically selects death from above after a jumping approach', () => {
    const { events } = runAutomaticPhase({
      attacker: {
        movementThisTurn: MovementType.Jump,
        hexesMovedThisTurn: 4,
      },
    });

    const declared = events.find(
      (event) =>
        event.type === GameEventType.PhysicalAttackDeclared &&
        (event.payload as IPhysicalAttackDeclaredPayload).attackerId ===
          'player-1',
    )?.payload as IPhysicalAttackDeclaredPayload | undefined;

    expect(declared).toMatchObject({
      attackerId: 'player-1',
      targetId: 'opponent-1',
      attackType: 'dfa',
    });
  });

  it('does not automatically select DFA when hydrated jump MP cannot reach an airborne VTOL target', () => {
    const { events } = runAutomaticPhase({
      attacker: {
        movementThisTurn: MovementType.Jump,
        hexesMovedThisTurn: 4,
      },
      target: { isAirborne: true, unitType: UnitType.VTOL },
      grid: createPhysicalGrid({ targetElevation: 5 }),
      movementCapabilitiesByUnit: new Map([
        ['player-1', { walkMP: 4, runMP: 6, jumpMP: 3 }],
      ]),
    });

    expect(
      events.filter(
        (event) =>
          event.actorId === 'player-1' &&
          (event.type === GameEventType.PhysicalAttackDeclared ||
            event.type === GameEventType.PhysicalAttackResolved),
      ),
    ).toEqual([]);
  });

  it('does not automatically select death from above after mechanical jump booster movement', () => {
    const { events } = runAutomaticPhase({
      attacker: {
        movementThisTurn: MovementType.Jump,
        hexesMovedThisTurn: 4,
        usedMechanicalJumpBoosterThisTurn: true,
      },
    });

    const declared = events.find(
      (event) =>
        event.type === GameEventType.PhysicalAttackDeclared &&
        (event.payload as IPhysicalAttackDeclaredPayload).attackerId ===
          'player-1',
    )?.payload as IPhysicalAttackDeclaredPayload | undefined;

    expect(declared).toMatchObject({
      attackerId: 'player-1',
      targetId: 'opponent-1',
      attackType: 'kick',
    });
  });

  it('does not automatically select physical attacks for evading units', () => {
    const { events } = runAutomaticPhase({
      attacker: {
        isEvading: true,
        movementThisTurn: MovementType.Run,
        hexesMovedThisTurn: 5,
      },
    });

    expect(
      events.filter(
        (event) =>
          event.actorId === 'player-1' &&
          (event.type === GameEventType.PhysicalAttackDeclared ||
            event.type === GameEventType.PhysicalAttackResolved),
      ),
    ).toEqual([]);
  });

  it('does not automatically select physical attacks for cargo-interacting units', () => {
    const { events } = runAutomaticPhase({
      attacker: {
        isLoadingOrUnloadingCargo: true,
        movementThisTurn: MovementType.Run,
        hexesMovedThisTurn: 5,
      },
    });

    expect(
      events.filter(
        (event) =>
          event.actorId === 'player-1' &&
          (event.type === GameEventType.PhysicalAttackDeclared ||
            event.type === GameEventType.PhysicalAttackResolved),
      ),
    ).toEqual([]);
  });

  it('does not automatically select physical attacks against different-board targets', () => {
    const { events } = runAutomaticPhase({
      attacker: {
        boardId: 'board-alpha',
        movementThisTurn: MovementType.Run,
        hexesMovedThisTurn: 5,
      },
      target: {
        boardId: 'board-beta',
      },
    });

    expect(
      events.filter(
        (event) =>
          event.actorId === 'player-1' &&
          (event.type === GameEventType.PhysicalAttackDeclared ||
            event.type === GameEventType.PhysicalAttackResolved),
      ),
    ).toEqual([]);
  });

  it('does not automatically select charge against targets making displacement attacks', () => {
    const { events } = runAutomaticPhase({
      attacker: {
        movementThisTurn: MovementType.Run,
        hexesMovedThisTurn: 5,
      },
      target: {
        isMakingDisplacementAttack: true,
      },
    });

    const declared = events.find(
      (event) =>
        event.type === GameEventType.PhysicalAttackDeclared &&
        (event.payload as IPhysicalAttackDeclaredPayload).attackerId ===
          'player-1',
    )?.payload as IPhysicalAttackDeclaredPayload | undefined;

    expect(declared).toMatchObject({
      attackerId: 'player-1',
      targetId: 'opponent-1',
      attackType: 'kick',
    });
  });

  it.each([
    ['hatchet', 4, 13],
    ['sword', 3, 8],
    ['mace', 6, 17],
    ['lance', 6, 13],
    ['retractable-blade', 3, 7],
    ['flail', 5, 9],
    ['wrecking-ball', 6, 8],
  ] satisfies Array<[PhysicalAttackType, number, number]>)(
    'honors supported melee weapon %s through runner resolution',
    (attackType, toHitNumber, damage) => {
      expect(SUPPORTED_PHYSICAL_WEAPON_ATTACK_TYPES).toContain(attackType);

      const { events } = runPhase(attackType);
      const declared = events.find(
        (event) => event.type === GameEventType.PhysicalAttackDeclared,
      );
      const resolved = resolvedPayload(events);

      expect(declared?.payload).toMatchObject({
        attackerId: 'player-1',
        targetId: 'opponent-1',
        attackType,
      });
      expect(resolved).toMatchObject({
        attackerId: 'player-1',
        targetId: 'opponent-1',
        attackType,
        roll: 8,
        toHitNumber,
        hit: true,
        damage,
      });
      expect(damageEventsFor(events, 'opponent-1')).toHaveLength(1);
    },
  );

  it('threads talon state into runner kick damage resolution', () => {
    const { events } = runPhase('kick', {
      attacker: {
        leftLegHasTalons: true,
      },
    });

    expect(resolvedPayload(events)).toMatchObject({
      attackerId: 'player-1',
      targetId: 'opponent-1',
      attackType: 'kick',
      hit: true,
      damage: 20,
    });
  });

  it('threads quad arm-location talon state into runner kick damage resolution', () => {
    const { events } = runPhase('kick', {
      attacker: {
        isQuad: true,
        rightArmHasTalons: true,
      },
    });

    expect(resolvedPayload(events)).toMatchObject({
      attackerId: 'player-1',
      targetId: 'opponent-1',
      attackType: 'kick',
      hit: true,
      damage: 20,
    });
  });

  it('threads claw state into runner punch damage and to-hit resolution', () => {
    const { events } = runPhase('punch', {
      attacker: {
        rightArmHasClaw: true,
      },
    });

    expect(resolvedPayload(events)).toMatchObject({
      attackerId: 'player-1',
      targetId: 'opponent-1',
      attackType: 'punch',
      roll: 8,
      toHitNumber: 6,
      hit: true,
      damage: 10,
    });
  });

  it('threads PLAYTEST_3 claw to-hit relief without removing runner claw damage', () => {
    const { events } = runPhase('punch', {
      attacker: {
        rightArmHasClaw: true,
      },
      optionalRules: ['PLAYTEST_3'],
    });

    expect(resolvedPayload(events)).toMatchObject({
      attackerId: 'player-1',
      targetId: 'opponent-1',
      attackType: 'punch',
      roll: 8,
      toHitNumber: 5,
      hit: true,
      damage: 10,
    });
  });

  it('threads explicit two-handed Zweihander declaration into runner punch damage', () => {
    const { events, result } = runPhase('punch', {
      attacker: {
        abilities: ['zweihander'],
      },
      twoHandedZweihander: true,
    });

    const declared = events.find(
      (event) => event.type === GameEventType.PhysicalAttackDeclared,
    )?.payload as IPhysicalAttackDeclaredPayload;
    expect(declared.twoHandedZweihander).toBe(true);
    expect(resolvedPayload(events)).toMatchObject({
      attackerId: 'player-1',
      targetId: 'opponent-1',
      attackType: 'punch',
      roll: 8,
      toHitNumber: 5,
      hit: true,
      damage: 13,
    });
    expect(result.units['player-1'].pendingPSRs).toHaveLength(0);
  });

  it('emits represented Zweihander self-critical events for two-handed punch hits', () => {
    const manifestsByUnit = new Map<string, CriticalSlotManifest>([
      [
        'player-1',
        buildCriticalSlotManifest({
          right_arm: [
            {
              slotIndex: 0,
              componentType: 'actuator',
              componentName: ActuatorType.UPPER_ARM,
              destroyed: false,
              actuatorType: ActuatorType.UPPER_ARM,
            },
          ],
          left_arm: [
            {
              slotIndex: 0,
              componentType: 'actuator',
              componentName: ActuatorType.LOWER_ARM,
              destroyed: false,
              actuatorType: ActuatorType.LOWER_ARM,
            },
          ],
        }),
      ],
    ]);

    const { events, result } = runPhase('punch', {
      attacker: {
        abilities: ['zweihander'],
      },
      twoHandedZweihander: true,
      manifestsByUnit,
      random: scriptedD6Random([6, 6, 5, 1, 1]),
    });

    const selfCriticals = events.filter(
      (event) =>
        event.type === GameEventType.CriticalHitResolved &&
        (event.payload as ICriticalHitResolvedPayload).unitId === 'player-1',
    );

    expect(selfCriticals.map((event) => event.phase)).toEqual([
      GamePhase.PhysicalAttack,
      GamePhase.PhysicalAttack,
    ]);
    expect(selfCriticals.map((event) => event.payload)).toEqual([
      expect.objectContaining({
        unitId: 'player-1',
        location: 'right_arm',
        componentType: 'actuator',
        componentName: ActuatorType.UPPER_ARM,
        destroyed: true,
      }),
      expect.objectContaining({
        unitId: 'player-1',
        location: 'left_arm',
        componentType: 'actuator',
        componentName: ActuatorType.LOWER_ARM,
        destroyed: true,
      }),
    ]);
    expect(
      result.units['player-1'].componentDamage?.actuatorsByLocation
        ?.right_arm?.[ActuatorType.UPPER_ARM],
    ).toBe(true);
    expect(
      result.units['player-1'].componentDamage?.actuatorsByLocation?.left_arm?.[
        ActuatorType.LOWER_ARM
      ],
    ).toBe(true);
    expect(manifestsByUnit.get('player-1')?.right_arm?.[0].destroyed).toBe(
      true,
    );
    expect(manifestsByUnit.get('player-1')?.left_arm?.[0].destroyed).toBe(true);
  });

  it('emits represented Zweihander self-critical events alongside the miss PSR', () => {
    const manifestsByUnit = new Map<string, CriticalSlotManifest>([
      [
        'player-1',
        buildCriticalSlotManifest({
          right_arm: [
            {
              slotIndex: 0,
              componentType: 'actuator',
              componentName: ActuatorType.SHOULDER,
              destroyed: false,
              actuatorType: ActuatorType.SHOULDER,
            },
          ],
          left_arm: [
            {
              slotIndex: 0,
              componentType: 'actuator',
              componentName: ActuatorType.HAND,
              destroyed: false,
              actuatorType: ActuatorType.HAND,
            },
          ],
        }),
      ],
    ]);

    const { events, result } = runPhase('punch', {
      attacker: {
        abilities: ['zweihander'],
      },
      twoHandedZweihander: true,
      manifestsByUnit,
      random: scriptedD6Random([1, 1, 1, 1]),
    });

    expect(resolvedPayload(events)).toMatchObject({
      attackType: 'punch',
      hit: false,
      damage: 0,
    });
    expect(
      events.filter(
        (event) =>
          event.type === GameEventType.CriticalHitResolved &&
          (event.payload as ICriticalHitResolvedPayload).unitId === 'player-1',
      ),
    ).toHaveLength(2);
    expect(result.units['player-1'].pendingPSRs).toContainEqual(
      expect.objectContaining({
        reason: 'punch missed',
        triggerSource: 'punch_miss',
      }),
    );
  });

  it('rejects invalid runner two-handed Zweihander declarations before damage or miss PSR', () => {
    const { events, result } = runPhase('punch', {
      attacker: {
        abilities: ['zweihander'],
        destroyedLocations: ['left_arm'],
      },
      twoHandedZweihander: true,
    });

    const declared = events.find(
      (event) => event.type === GameEventType.PhysicalAttackDeclared,
    )?.payload as IPhysicalAttackDeclaredPayload;
    expect(declared).toMatchObject({
      attackerId: 'player-1',
      targetId: 'opponent-1',
      attackType: 'punch',
      twoHandedZweihander: true,
      toHitNumber: Infinity,
    });
    expect(resolvedPayload(events)).toMatchObject({
      attackerId: 'player-1',
      targetId: 'opponent-1',
      attackType: 'punch',
      roll: 0,
      toHitNumber: Infinity,
      hit: false,
      damage: 0,
      location: 'LimbMissing',
    });
    expect(damageEventsFor(events, 'opponent-1')).toHaveLength(0);
    expect(result.units['player-1'].pendingPSRs).toHaveLength(0);
    expect(result.units['opponent-1'].damageThisPhase).toBe(0);
  });

  it('does not consume Zweihander in runner punch damage without explicit declaration state', () => {
    const { events } = runPhase('punch', {
      attacker: {
        abilities: ['zweihander'],
      },
    });

    expect(resolvedPayload(events)).toMatchObject({
      attackType: 'punch',
      hit: true,
      damage: 7,
    });
  });

  it('emits physical-phase claw equipment criticals and removes the hit claw modifier', () => {
    const manifestsByUnit = new Map<string, CriticalSlotManifest>([
      [
        'opponent-1',
        buildCriticalSlotManifest({
          right_arm: [
            {
              slotIndex: 0,
              componentType: 'equipment',
              componentName: 'Claw',
              destroyed: false,
            },
          ],
        }),
      ],
    ]);
    const { events, result } = runPhase('punch', {
      target: {
        armor: {
          ...createState().units['opponent-1'].armor,
          right_arm: 0,
        },
        rightArmHasClaw: true,
      },
      manifestsByUnit,
      // to-hit 6+6, punch location 5 = RA, crit trigger 4+4,
      // slot selection 1 = the Claw equipment slot.
      random: scriptedD6Random([6, 6, 5, 4, 4, 1]),
    });

    const critical = events.find(
      (event) =>
        event.type === GameEventType.CriticalHitResolved &&
        (event.payload as ICriticalHitResolvedPayload).componentName === 'Claw',
    );

    expect(critical?.phase).toBe(GamePhase.PhysicalAttack);
    expect(critical?.payload).toMatchObject({
      unitId: 'opponent-1',
      location: 'right_arm',
      componentType: 'equipment',
      componentName: 'Claw',
      destroyed: true,
    });
    expect(result.units['opponent-1'].rightArmHasClaw).toBe(false);
  });

  it('emits source-missing claw lifecycle events and removes the represented claw modifier', () => {
    const manifestsByUnit = new Map<string, CriticalSlotManifest>([
      [
        'opponent-1',
        buildCriticalSlotManifest({
          right_arm: [
            {
              slotIndex: 0,
              componentType: 'equipment',
              componentName: 'Claw',
              destroyed: false,
              missing: true,
            },
          ],
        }),
      ],
    ]);
    const { events, result } = runPhase('punch', {
      target: {
        rightArmHasClaw: true,
      },
      manifestsByUnit,
      random: scriptedD6Random([6, 6, 5]),
    });

    const critical = events.find(
      (event) =>
        event.type === GameEventType.CriticalHitResolved &&
        (event.payload as ICriticalHitResolvedPayload).componentName === 'Claw',
    );
    const componentDestroyed = events.find(
      (event) =>
        event.type === GameEventType.ComponentDestroyed &&
        (event.payload as ICriticalHitResolvedPayload).componentName === 'Claw',
    );

    expect(critical?.phase).toBe(GamePhase.PhysicalAttack);
    expect(critical?.payload).toMatchObject({
      unitId: 'opponent-1',
      location: 'right_arm',
      componentType: 'equipment',
      componentName: 'Claw',
      destroyed: false,
      missing: true,
    });
    expect(componentDestroyed).toBeUndefined();
    expect(result.units['opponent-1'].rightArmHasClaw).toBe(false);
    expect(manifestsByUnit.get('opponent-1')?.right_arm?.[0]).toMatchObject({
      destroyed: false,
      missing: true,
    });
  });

  it('emits source-breached claw lifecycle events and removes the represented claw modifier', () => {
    const manifestsByUnit = new Map<string, CriticalSlotManifest>([
      [
        'opponent-1',
        buildCriticalSlotManifest({
          right_arm: [
            {
              slotIndex: 0,
              componentType: 'equipment',
              componentName: 'Claw',
              destroyed: false,
              breached: true,
            },
          ],
        }),
      ],
    ]);
    const { events, result } = runPhase('punch', {
      target: {
        rightArmHasClaw: true,
      },
      manifestsByUnit,
      random: scriptedD6Random([6, 6, 5]),
    });

    const critical = events.find(
      (event) =>
        event.type === GameEventType.CriticalHitResolved &&
        (event.payload as ICriticalHitResolvedPayload).componentName === 'Claw',
    );
    const componentDestroyed = events.find(
      (event) =>
        event.type === GameEventType.ComponentDestroyed &&
        (event.payload as ICriticalHitResolvedPayload).componentName === 'Claw',
    );

    expect(critical?.phase).toBe(GamePhase.PhysicalAttack);
    expect(critical?.payload).toMatchObject({
      unitId: 'opponent-1',
      location: 'right_arm',
      componentType: 'equipment',
      componentName: 'Claw',
      destroyed: false,
      breached: true,
    });
    expect(componentDestroyed).toBeUndefined();
    expect(result.units['opponent-1'].rightArmHasClaw).toBe(false);
    expect(manifestsByUnit.get('opponent-1')?.right_arm?.[0]).toMatchObject({
      destroyed: false,
      breached: true,
    });
  });

  it('emits physical-phase talon equipment criticals and removes the hit talon modifier', () => {
    const manifestsByUnit = new Map<string, CriticalSlotManifest>([
      [
        'opponent-1',
        buildCriticalSlotManifest({
          right_leg: [
            {
              slotIndex: 0,
              componentType: 'equipment',
              componentName: 'Talons',
              destroyed: false,
            },
          ],
        }),
      ],
    ]);
    const { events, result } = runPhase('kick', {
      target: {
        armor: {
          ...createState().units['opponent-1'].armor,
          right_leg: 0,
        },
        rightLegHasTalons: true,
      },
      manifestsByUnit,
      // to-hit 6+6, kick location 1 = RL, crit trigger 4+4,
      // slot selection 1 = the Talons equipment slot.
      random: scriptedD6Random([6, 6, 1, 4, 4, 1]),
    });

    const critical = events.find(
      (event) =>
        event.type === GameEventType.CriticalHitResolved &&
        (event.payload as ICriticalHitResolvedPayload).componentName ===
          'Talons',
    );

    expect(critical?.phase).toBe(GamePhase.PhysicalAttack);
    expect(critical?.payload).toMatchObject({
      unitId: 'opponent-1',
      location: 'right_leg',
      componentType: 'equipment',
      componentName: 'Talons',
      destroyed: true,
    });
    expect(result.units['opponent-1'].rightLegHasTalons).toBe(false);
  });

  it('emits source-missing talon lifecycle events and removes the represented talon modifier', () => {
    const manifestsByUnit = new Map<string, CriticalSlotManifest>([
      [
        'opponent-1',
        buildCriticalSlotManifest({
          right_leg: [
            {
              slotIndex: 0,
              componentType: 'equipment',
              componentName: 'Talons',
              destroyed: false,
              missing: true,
            },
          ],
        }),
      ],
    ]);
    const { events, result } = runPhase('kick', {
      target: {
        rightLegHasTalons: true,
      },
      manifestsByUnit,
      random: scriptedD6Random([6, 6, 1]),
    });

    const critical = events.find(
      (event) =>
        event.type === GameEventType.CriticalHitResolved &&
        (event.payload as ICriticalHitResolvedPayload).componentName ===
          'Talons',
    );
    const componentDestroyed = events.find(
      (event) =>
        event.type === GameEventType.ComponentDestroyed &&
        (event.payload as ICriticalHitResolvedPayload).componentName ===
          'Talons',
    );

    expect(critical?.phase).toBe(GamePhase.PhysicalAttack);
    expect(critical?.payload).toMatchObject({
      unitId: 'opponent-1',
      location: 'right_leg',
      componentType: 'equipment',
      componentName: 'Talons',
      destroyed: false,
      missing: true,
    });
    expect(componentDestroyed).toBeUndefined();
    expect(result.units['opponent-1'].rightLegHasTalons).toBe(false);
    expect(manifestsByUnit.get('opponent-1')?.right_leg?.[0]).toMatchObject({
      destroyed: false,
      missing: true,
    });
  });

  it('emits source-breached talon lifecycle events and removes the represented talon modifier', () => {
    const manifestsByUnit = new Map<string, CriticalSlotManifest>([
      [
        'opponent-1',
        buildCriticalSlotManifest({
          right_leg: [
            {
              slotIndex: 0,
              componentType: 'equipment',
              componentName: 'Talons',
              destroyed: false,
              breached: true,
            },
          ],
        }),
      ],
    ]);
    const { events, result } = runPhase('kick', {
      target: {
        rightLegHasTalons: true,
      },
      manifestsByUnit,
      random: scriptedD6Random([6, 6, 1]),
    });

    const critical = events.find(
      (event) =>
        event.type === GameEventType.CriticalHitResolved &&
        (event.payload as ICriticalHitResolvedPayload).componentName ===
          'Talons',
    );
    const componentDestroyed = events.find(
      (event) =>
        event.type === GameEventType.ComponentDestroyed &&
        (event.payload as ICriticalHitResolvedPayload).componentName ===
          'Talons',
    );

    expect(critical?.phase).toBe(GamePhase.PhysicalAttack);
    expect(critical?.payload).toMatchObject({
      unitId: 'opponent-1',
      location: 'right_leg',
      componentType: 'equipment',
      componentName: 'Talons',
      destroyed: false,
      breached: true,
    });
    expect(componentDestroyed).toBeUndefined();
    expect(result.units['opponent-1'].rightLegHasTalons).toBe(false);
    expect(manifestsByUnit.get('opponent-1')?.right_leg?.[0]).toMatchObject({
      destroyed: false,
      breached: true,
    });
  });

  it('applies charge target clusters, attacker self-damage, and both PSRs', () => {
    const { events, result } = runPhase('charge', {
      attacker: {
        movementThisTurn: MovementType.Run,
        hexesMovedThisTurn: 5,
      },
    });

    expect(resolvedPayload(events)).toMatchObject({
      attackType: 'charge',
      roll: 8,
      toHitNumber: 7,
      hit: true,
      damage: 28,
    });
    expect(damageEventsFor(events, 'opponent-1')).toHaveLength(6);
    expect(damageEventsFor(events, 'player-1').length).toBeGreaterThan(0);
    expectPendingPSR(result, 'opponent-1', PSRTrigger.Charged, {
      additionalModifier: 2,
    });
    expectPendingPSR(result, 'player-1', PSRTrigger.Charged, {
      additionalModifier: 2,
    });
  });

  it('applies source-backed charge displacement after a successful charge', () => {
    const { events, result } = runPhase('charge', {
      attacker: {
        movementThisTurn: MovementType.Run,
        hexesMovedThisTurn: 5,
      },
      grid: createPhysicalGrid(),
    });

    expect(resolvedPayload(events).displacements).toEqual([
      {
        unitId: 'opponent-1',
        from: { q: 1, r: 0 },
        to: { q: 1, r: 1 },
        reason: 'charge',
      },
      {
        unitId: 'player-1',
        from: { q: 0, r: 0 },
        to: { q: 1, r: 0 },
        reason: 'charge',
      },
    ]);
    expect(result.units['opponent-1'].position).toEqual({ q: 1, r: 1 });
    expect(result.units['player-1'].position).toEqual({ q: 1, r: 0 });
  });

  it('splits represented domino-chain behavior from secondary fallout accounting', () => {
    const positionalChain =
      PHYSICAL_LEGALITY_GATE_SUPPORT[
        'shared.displacement-domino-positional-chain'
      ];
    const representedChain =
      PHYSICAL_LEGALITY_GATE_SUPPORT['shared.displacement-domino-chain'];
    const secondaryFallout =
      PHYSICAL_LEGALITY_GATE_SUPPORT[
        'shared.displacement-domino-secondary-fallout'
      ];

    expect(positionalChain).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining(
        'represented push/charge/DFA/charge-miss target-displacement helpers',
      ),
    });
    expect(representedChain).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining(
        'source-backed recursive occupied-hex domino chain',
      ),
    });
    expect(secondaryFallout).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining(
        'Broad domino secondary-fallout accounting is split',
      ),
    });
    expect(secondaryFallout.evidence).toContain(
      'voluntary blocker step-out branch are integrated sibling rows',
    );
    expect(secondaryFallout.gap).toBeUndefined();
    expect(
      PHYSICAL_LEGALITY_GATE_SUPPORT[
        'shared.displacement-domino-terrain-building-environment-fallout'
      ],
    ).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining(
        'represented destination terrain/building PSR fallout',
      ),
    });
    expect(DISPLACEMENT_DOMINO_SECONDARY_FALLOUT_UNSUPPORTED_IDS).toEqual([]);
    expect(
      PHYSICAL_LEGALITY_GATE_SUPPORT['shared.displacement-domino-step-out-cfr'],
    ).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('blockerStepOutDecision'),
      sourceRefs: [
        expect.objectContaining({
          citation: expect.stringContaining('CFR_DOMINO_EFFECT'),
          url: expect.stringContaining('L9190-L9280'),
        }),
      ],
    });
    expect(
      PHYSICAL_LEGALITY_GATE_SUPPORT['shared.displacement-domino-step-out-cfr']
        .gap,
    ).toBeUndefined();
  });

  it('cascades source-backed charge displacement through occupied destinations', () => {
    const baseState = createState();
    const state: IGameState = {
      ...baseState,
      units: {
        ...baseState.units,
        'player-1': {
          ...baseState.units['player-1'],
          facing: Facing.South,
          movementThisTurn: MovementType.Run,
          hexesMovedThisTurn: 5,
          piloting: 0,
        },
        'domino-blocker': createUnit(
          'domino-blocker',
          GameSide.Opponent,
          { q: 1, r: 1 },
          { pilotConscious: false },
        ),
        'domino-tail': createUnit(
          'domino-tail',
          GameSide.Opponent,
          { q: 1, r: 2 },
          { pilotConscious: false },
        ),
      },
    };
    const { events, result } = runPhaseWithState(
      'charge',
      state,
      createDominoChargeGrid(),
    );

    expect(resolvedPayload(events).displacements).toEqual([
      {
        unitId: 'opponent-1',
        from: { q: 1, r: 0 },
        to: { q: 1, r: 1 },
        reason: 'charge',
      },
      {
        unitId: 'domino-blocker',
        from: { q: 1, r: 1 },
        to: { q: 1, r: 2 },
        reason: 'domino',
      },
      {
        unitId: 'domino-tail',
        from: { q: 1, r: 2 },
        to: { q: 1, r: 3 },
        reason: 'domino',
      },
      {
        unitId: 'player-1',
        from: { q: 0, r: 0 },
        to: { q: 1, r: 0 },
        reason: 'charge',
      },
    ]);
    expect(result.units['domino-blocker'].position).toEqual({ q: 1, r: 2 });
    expect(result.units['domino-tail'].position).toEqual({ q: 1, r: 3 });
    expect(result.units['opponent-1'].position).toEqual({ q: 1, r: 1 });
    expect(result.units['player-1'].position).toEqual({ q: 1, r: 0 });
    expectPendingPSR(result, 'domino-blocker', PSRTrigger.DominoEffect, {
      reason: 'Domino effect',
      additionalModifier: 0,
    });
    expectPendingPSR(result, 'domino-tail', PSRTrigger.DominoEffect, {
      reason: 'Domino effect',
      additionalModifier: 0,
    });
  });

  it('applies represented domino step-out CFR decisions before forced fallback in runner physical displacement', () => {
    const baseState = createState();
    const state: IGameState = {
      ...baseState,
      units: {
        ...baseState.units,
        'player-1': {
          ...baseState.units['player-1'],
          facing: Facing.South,
          movementThisTurn: MovementType.Run,
          hexesMovedThisTurn: 5,
          piloting: 0,
        },
        'domino-blocker': createUnit(
          'domino-blocker',
          GameSide.Opponent,
          { q: 1, r: 1 },
          {
            facing: Facing.Northeast,
            movementThisTurn: MovementType.Walk,
            pilotConscious: false,
          },
        ),
        'domino-tail': createUnit(
          'domino-tail',
          GameSide.Opponent,
          { q: 1, r: 2 },
          { pilotConscious: false },
        ),
      },
    };
    const { events, result } = runPhaseWithState(
      'charge',
      state,
      createDominoChargeGrid(),
      {
        blockerStepOutDecision: {
          blockerUnitId: 'domino-blocker',
          from: { q: 1, r: 1 },
          response: 'move',
          psrPassed: true,
          context: {
            sideEntered: true,
            blockerJumped: false,
            legalStepOptions: [
              { kind: 'forward', to: { q: 2, r: 0 } },
              { kind: 'backward', to: { q: 0, r: 2 } },
            ],
          },
          path: [{ q: 2, r: 0 }],
        },
      },
    );

    expect(resolvedPayload(events).displacements).toEqual([
      {
        unitId: 'domino-blocker',
        from: { q: 1, r: 1 },
        to: { q: 2, r: 0 },
        reason: 'domino_step_out',
      },
      {
        unitId: 'opponent-1',
        from: { q: 1, r: 0 },
        to: { q: 1, r: 1 },
        reason: 'charge',
      },
      {
        unitId: 'player-1',
        from: { q: 0, r: 0 },
        to: { q: 1, r: 0 },
        reason: 'charge',
      },
    ]);
    expect(result.units['domino-blocker'].position).toEqual({ q: 2, r: 0 });
    expect(result.units['domino-tail'].position).toEqual({ q: 1, r: 2 });
    expect(result.units['opponent-1'].position).toEqual({ q: 1, r: 1 });
    expect(result.units['player-1'].position).toEqual({ q: 1, r: 0 });
    expect(result.units['domino-blocker'].pendingPSRs).not.toContainEqual(
      expect.objectContaining({ reasonCode: PSRTrigger.DominoEffect }),
    );
    expect(result.units['domino-tail'].pendingPSRs).toEqual([]);
  });

  it('applies represented minefield fallout when domino displacement enters mined terrain', () => {
    const baseState = createState();
    const state: IGameState = {
      ...baseState,
      units: {
        ...baseState.units,
        'player-1': {
          ...baseState.units['player-1'],
          facing: Facing.South,
          movementThisTurn: MovementType.Run,
          hexesMovedThisTurn: 5,
          piloting: 0,
        },
        'domino-blocker': createUnit(
          'domino-blocker',
          GameSide.Opponent,
          { q: 1, r: 1 },
          { pilotConscious: false },
        ),
        'domino-tail': createUnit(
          'domino-tail',
          GameSide.Opponent,
          { q: 1, r: 2 },
          { pilotConscious: false },
        ),
      },
    };
    const grid = createDominoChargeGrid();
    const minedHex = grid.hexes.get('1,3');
    const minedHexes = new Map(grid.hexes);
    if (minedHex) {
      minedHexes.set('1,3', { ...minedHex, terrain: TerrainType.Mines });
    }

    const { events, result } = runPhaseWithState(
      'charge',
      state,
      {
        ...grid,
        hexes: minedHexes,
      },
      {
        random: scriptedD6Random(Array.from({ length: 24 }, () => 6)),
      },
    );
    const dominoTailDamageEvents = events.filter(
      (event) =>
        event.type === GameEventType.DamageApplied &&
        (event.payload as IDamageAppliedPayload).unitId === 'domino-tail',
    );
    const minePsrEvent = events.find((event) => {
      const payload = event.payload as {
        unitId?: string;
        reasonCode?: PSRTrigger;
      };
      return (
        event.type === GameEventType.PSRTriggered &&
        payload.unitId === 'domino-tail' &&
        payload.reasonCode === PSRTrigger.PhaseDamage20Plus
      );
    });

    expect(resolvedPayload(events).displacements).toEqual([
      {
        unitId: 'opponent-1',
        from: { q: 1, r: 0 },
        to: { q: 1, r: 1 },
        reason: 'charge',
      },
      {
        unitId: 'domino-blocker',
        from: { q: 1, r: 1 },
        to: { q: 1, r: 2 },
        reason: 'domino',
      },
      {
        unitId: 'domino-tail',
        from: { q: 1, r: 2 },
        to: { q: 1, r: 3 },
        reason: 'domino',
      },
      {
        unitId: 'player-1',
        from: { q: 0, r: 0 },
        to: { q: 1, r: 0 },
        reason: 'charge',
      },
    ]);
    expect(result.units['domino-tail']).toMatchObject({
      position: { q: 1, r: 3 },
      damageThisPhase: 20,
      armor: {
        left_leg: 11,
        right_leg: 11,
      },
    });
    expect(dominoTailDamageEvents.map((event) => event.phase)).toEqual([
      GamePhase.PhysicalAttack,
      GamePhase.PhysicalAttack,
    ]);
    expect(dominoTailDamageEvents.map((event) => event.payload)).toEqual([
      expect.objectContaining({
        unitId: 'domino-tail',
        location: 'left_leg',
        damage: 10,
        armorRemaining: 11,
        structureRemaining: 14,
      }),
      expect.objectContaining({
        unitId: 'domino-tail',
        location: 'right_leg',
        damage: 10,
        armorRemaining: 11,
        structureRemaining: 14,
      }),
    ]);
    expectPendingPSR(result, 'domino-tail', PSRTrigger.DominoEffect, {
      reason: 'Domino effect',
      additionalModifier: 0,
    });
    expectPendingPSR(result, 'domino-tail', PSRTrigger.PhaseDamage20Plus, {
      triggerSource: PSRTrigger.PhaseDamage20Plus,
    });
    expect(minePsrEvent?.phase).toBe(GamePhase.PhysicalAttack);
  });

  it('queues represented terrain and building PSR fallout for domino displacement destinations', () => {
    const baseState = createState();
    const state: IGameState = {
      ...baseState,
      units: {
        ...baseState.units,
        'player-1': {
          ...baseState.units['player-1'],
          facing: Facing.South,
          movementThisTurn: MovementType.Run,
          hexesMovedThisTurn: 5,
          piloting: 0,
        },
        'domino-blocker': createUnit(
          'domino-blocker',
          GameSide.Opponent,
          { q: 1, r: 1 },
          { pilotConscious: false },
        ),
        'domino-tail': createUnit(
          'domino-tail',
          GameSide.Opponent,
          { q: 1, r: 2 },
          { pilotConscious: false, tonnage: 55 },
        ),
      },
    };
    const grid = createDominoChargeGrid();
    const hexes = new Map(grid.hexes);
    const rubbleHex = hexes.get('1,2');
    const buildingHex = hexes.get('1,3');
    if (rubbleHex) {
      hexes.set('1,2', { ...rubbleHex, terrain: TerrainType.Rubble });
    }
    if (buildingHex) {
      hexes.set('1,3', {
        ...buildingHex,
        terrain: terrainStringFromFeatures([
          { type: TerrainType.Building, level: 2, constructionFactor: 40 },
        ]),
      });
    }

    const { events, result } = runPhaseWithState(
      'charge',
      state,
      { ...grid, hexes },
      {
        random: scriptedD6Random(Array.from({ length: 24 }, () => 6)),
      },
    );
    const physicalPsrPayloads = events
      .filter(
        (event) =>
          event.type === GameEventType.PSRTriggered &&
          event.phase === GamePhase.PhysicalAttack,
      )
      .map((event) => event.payload);

    expect(resolvedPayload(events).displacements).toEqual([
      {
        unitId: 'opponent-1',
        from: { q: 1, r: 0 },
        to: { q: 1, r: 1 },
        reason: 'charge',
      },
      {
        unitId: 'domino-blocker',
        from: { q: 1, r: 1 },
        to: { q: 1, r: 2 },
        reason: 'domino',
      },
      {
        unitId: 'domino-tail',
        from: { q: 1, r: 2 },
        to: { q: 1, r: 3 },
        reason: 'domino',
      },
      {
        unitId: 'player-1',
        from: { q: 0, r: 0 },
        to: { q: 1, r: 0 },
        reason: 'charge',
      },
    ]);
    expectPendingPSR(result, 'domino-blocker', PSRTrigger.EnteringRubble, {
      reason: 'Entering rubble',
      triggerSource: PSRTrigger.EnteringRubble,
    });
    expectPendingPSR(result, 'domino-tail', PSRTrigger.BuildingCollapse, {
      reason: 'Building collapse',
      triggerSource: PSRTrigger.BuildingCollapse,
    });
    expectPendingPSR(result, 'domino-blocker', PSRTrigger.DominoEffect);
    expectPendingPSR(result, 'domino-tail', PSRTrigger.DominoEffect);
    expect(physicalPsrPayloads).toContainEqual(
      expect.objectContaining({
        unitId: 'domino-blocker',
        reasonCode: PSRTrigger.EnteringRubble,
        triggerSource: PSRTrigger.EnteringRubble,
      }),
    );
    expect(physicalPsrPayloads).toContainEqual(
      expect.objectContaining({
        unitId: 'domino-tail',
        reasonCode: PSRTrigger.BuildingCollapse,
        triggerSource: PSRTrigger.BuildingCollapse,
      }),
    );
    expect(physicalPsrPayloads).not.toContainEqual(
      expect.objectContaining({
        unitId: 'opponent-1',
        reasonCode: PSRTrigger.EnteringRubble,
      }),
    );
  });

  it('applies represented coordinate minefield fallout when domino displacement enters a state minefield', () => {
    const baseState = createState();
    const mineCoord = { q: 1, r: 3 };
    const state: IGameState = {
      ...baseState,
      minefields: {
        '1,3': {
          type: 'conventional',
          damagePerLeg: 5,
          density: 20,
          source: 'scenario',
        },
      },
      units: {
        ...baseState.units,
        'player-1': {
          ...baseState.units['player-1'],
          facing: Facing.South,
          movementThisTurn: MovementType.Run,
          hexesMovedThisTurn: 5,
          piloting: 0,
        },
        'domino-blocker': createUnit(
          'domino-blocker',
          GameSide.Opponent,
          { q: 1, r: 1 },
          { pilotConscious: false },
        ),
        'domino-tail': createUnit(
          'domino-tail',
          GameSide.Opponent,
          { q: 1, r: 2 },
          { pilotConscious: false },
        ),
      },
    };
    const { events, result } = runPhaseWithState(
      'charge',
      state,
      createDominoChargeGrid(),
      {
        random: scriptedD6Random(Array.from({ length: 28 }, () => 6)),
      },
    );
    const minefieldChanged = events.find(
      (event) => event.type === GameEventType.MinefieldChanged,
    );
    const minefieldPayload = minefieldChanged?.payload as
      | IMinefieldChangedPayload
      | undefined;

    expect(resolvedPayload(events).displacements).toContainEqual({
      unitId: 'domino-tail',
      from: { q: 1, r: 2 },
      to: mineCoord,
      reason: 'domino',
    });
    expect(result.units['domino-tail']).toMatchObject({
      position: mineCoord,
      damageThisPhase: 10,
      armor: {
        left_leg: 16,
        right_leg: 16,
      },
    });
    expect(damageEventsFor(events, 'domino-tail')).toEqual([
      expect.objectContaining({
        unitId: 'domino-tail',
        location: 'left_leg',
        damage: 5,
        armorRemaining: 16,
      }),
      expect.objectContaining({
        unitId: 'domino-tail',
        location: 'right_leg',
        damage: 5,
        armorRemaining: 16,
      }),
    ]);
    expect(minefieldChanged?.phase).toBe(GamePhase.PhysicalAttack);
    expect(minefieldPayload).toMatchObject({
      operation: 'set',
      hex: mineCoord,
      reason: 'movement_detonation',
      sourceUnitId: 'domino-tail',
      minefield: {
        type: 'conventional',
        damagePerLeg: 5,
        density: 15,
        detonated: false,
        source: 'event',
      },
    });
    expect(result.minefields?.['1,3']).toEqual({
      type: 'conventional',
      damagePerLeg: 5,
      density: 15,
      detonated: false,
      source: 'event',
    });
    expectPendingPSR(result, 'domino-tail', PSRTrigger.DominoEffect, {
      reason: 'Domino effect',
      additionalModifier: 0,
    });
  });

  it('queues represented inferno coordinate minefield heat when domino displacement enters it', () => {
    const baseState = createState();
    const mineCoord = { q: 1, r: 3 };
    const state: IGameState = {
      ...baseState,
      minefields: {
        '1,3': {
          type: 'inferno',
          damagePerLeg: 10,
          density: 10,
          source: 'scenario',
        },
      },
      units: {
        ...baseState.units,
        'player-1': {
          ...baseState.units['player-1'],
          facing: Facing.South,
          movementThisTurn: MovementType.Run,
          hexesMovedThisTurn: 5,
          piloting: 0,
        },
        'domino-blocker': createUnit(
          'domino-blocker',
          GameSide.Opponent,
          { q: 1, r: 1 },
          { pilotConscious: false },
        ),
        'domino-tail': createUnit(
          'domino-tail',
          GameSide.Opponent,
          { q: 1, r: 2 },
          { pilotConscious: false },
        ),
      },
    };
    const { events, result } = runPhaseWithState(
      'charge',
      state,
      createDominoChargeGrid(),
      {
        random: scriptedD6Random(Array.from({ length: 28 }, () => 6)),
      },
    );
    const minefieldChanged = events.find(
      (event) => event.type === GameEventType.MinefieldChanged,
    );
    const minefieldPayload = minefieldChanged?.payload as
      | IMinefieldChangedPayload
      | undefined;

    expect(resolvedPayload(events).displacements).toContainEqual({
      unitId: 'domino-tail',
      from: { q: 1, r: 2 },
      to: mineCoord,
      reason: 'domino',
    });
    expect(result.units['domino-tail']).toMatchObject({
      position: mineCoord,
      damageThisPhase: 0,
      armor: state.units['domino-tail'].armor,
      pendingExternalHeat: 10,
      infernoBurning: true,
    });
    expect(damageEventsFor(events, 'domino-tail')).toEqual([]);
    expect(minefieldChanged?.phase).toBe(GamePhase.PhysicalAttack);
    expect(minefieldPayload).toMatchObject({
      operation: 'set',
      hex: mineCoord,
      reason: 'movement_detonation',
      sourceUnitId: 'domino-tail',
      minefield: {
        type: 'inferno',
        damagePerLeg: 10,
        density: 5,
        detonated: false,
        source: 'event',
      },
    });
    expectPendingPSR(result, 'domino-tail', PSRTrigger.DominoEffect, {
      reason: 'Domino effect',
      additionalModifier: 0,
    });
  });

  it('suppresses represented coordinate minefield fallout for detonated state during domino displacement', () => {
    const baseState = createState();
    const mineCoord = { q: 1, r: 3 };
    const state: IGameState = {
      ...baseState,
      minefields: {
        '1,3': {
          type: 'conventional',
          damagePerLeg: 5,
          detonated: true,
          source: 'event',
        },
      },
      units: {
        ...baseState.units,
        'player-1': {
          ...baseState.units['player-1'],
          facing: Facing.South,
          movementThisTurn: MovementType.Run,
          hexesMovedThisTurn: 5,
          piloting: 0,
        },
        'domino-blocker': createUnit(
          'domino-blocker',
          GameSide.Opponent,
          { q: 1, r: 1 },
          { pilotConscious: false },
        ),
        'domino-tail': createUnit(
          'domino-tail',
          GameSide.Opponent,
          { q: 1, r: 2 },
          { pilotConscious: false },
        ),
      },
    };
    const { events, result } = runPhaseWithState(
      'charge',
      state,
      createDominoChargeGrid(),
      {
        random: scriptedD6Random(Array.from({ length: 28 }, () => 6)),
      },
    );

    expect(resolvedPayload(events).displacements).toContainEqual({
      unitId: 'domino-tail',
      from: { q: 1, r: 2 },
      to: mineCoord,
      reason: 'domino',
    });
    expect(result.units['domino-tail']).toMatchObject({
      position: mineCoord,
      damageThisPhase: 0,
      armor: state.units['domino-tail'].armor,
    });
    expect(damageEventsFor(events, 'domino-tail')).toEqual([]);
    expect(
      events.filter((event) => event.type === GameEventType.MinefieldChanged),
    ).toEqual([]);
    expect(result.minefields?.['1,3']).toEqual({
      type: 'conventional',
      damagePerLeg: 5,
      detonated: true,
      source: 'event',
    });
    expectPendingPSR(result, 'domino-tail', PSRTrigger.DominoEffect, {
      reason: 'Domino effect',
      additionalModifier: 0,
    });
  });

  it.each(EXPLICIT_UNSUPPORTED_MINEFIELD_VARIANT_TYPES)(
    'does not treat %s coordinate minefield variants as represented domino fallout',
    (variantType) => {
      const baseState = createState();
      const mineCoord = { q: 1, r: 3 };
      const nonConventionalMinefield: IRepresentedMinefieldState = {
        type: variantType,
        damagePerLeg: 5,
        source: 'scenario',
      };
      const state: IGameState = {
        ...baseState,
        minefields: {
          '1,3': nonConventionalMinefield,
        },
        units: {
          ...baseState.units,
          'player-1': {
            ...baseState.units['player-1'],
            facing: Facing.South,
            movementThisTurn: MovementType.Run,
            hexesMovedThisTurn: 5,
            piloting: 0,
          },
          'domino-blocker': createUnit(
            'domino-blocker',
            GameSide.Opponent,
            { q: 1, r: 1 },
            { pilotConscious: false },
          ),
          'domino-tail': createUnit(
            'domino-tail',
            GameSide.Opponent,
            { q: 1, r: 2 },
            { pilotConscious: false },
          ),
        },
      };
      const { events, result } = runPhaseWithState(
        'charge',
        state,
        createDominoChargeGrid(),
        {
          random: scriptedD6Random(Array.from({ length: 28 }, () => 6)),
        },
      );

      expect(resolvedPayload(events).displacements).toContainEqual({
        unitId: 'domino-tail',
        from: { q: 1, r: 2 },
        to: mineCoord,
        reason: 'domino',
      });
      expect(result.units['domino-tail']).toMatchObject({
        position: mineCoord,
        damageThisPhase: 0,
        armor: state.units['domino-tail'].armor,
      });
      expect(damageEventsFor(events, 'domino-tail')).toEqual([]);
      expect(
        events.filter((event) => event.type === GameEventType.MinefieldChanged),
      ).toEqual([]);
      expect(result.minefields?.['1,3']).toEqual(nonConventionalMinefield);
      expectPendingPSR(result, 'domino-tail', PSRTrigger.DominoEffect, {
        reason: 'Domino effect',
        additionalModifier: 0,
      });
    },
  );

  it('applies represented emp coordinate minefield effects during domino fallout without conventional damage', () => {
    const baseState = createState();
    const mineCoord = { q: 1, r: 3 };
    const empMinefield: IRepresentedMinefieldState = {
      type: 'emp',
      damagePerLeg: 5,
      source: 'scenario',
    };
    const state: IGameState = {
      ...baseState,
      minefields: {
        '1,3': empMinefield,
      },
      units: {
        ...baseState.units,
        'player-1': {
          ...baseState.units['player-1'],
          facing: Facing.South,
          movementThisTurn: MovementType.Run,
          hexesMovedThisTurn: 5,
          piloting: 0,
        },
        'domino-blocker': createUnit(
          'domino-blocker',
          GameSide.Opponent,
          { q: 1, r: 1 },
          { pilotConscious: false },
        ),
        'domino-tail': createUnit(
          'domino-tail',
          GameSide.Opponent,
          { q: 1, r: 2 },
          { pilotConscious: false },
        ),
      },
    };
    const { events, result } = runPhaseWithState(
      'charge',
      state,
      createDominoChargeGrid(),
      {
        random: scriptedD6Random(Array.from({ length: 28 }, () => 6)),
      },
    );

    expect(resolvedPayload(events).displacements).toContainEqual({
      unitId: 'domino-tail',
      from: { q: 1, r: 2 },
      to: mineCoord,
      reason: 'domino',
    });
    expect(result.units['domino-tail']).toMatchObject({
      position: mineCoord,
      damageThisPhase: 0,
      armor: state.units['domino-tail'].armor,
      shutdown: true,
      empShutdownTurns: expect.any(Number),
    });
    expect(damageEventsFor(events, 'domino-tail')).toEqual([]);
    expect(
      events.find(
        (event) => event.type === GameEventType.EmpMinefieldEffectApplied,
      )?.payload,
    ).toMatchObject({
      unitId: 'domino-tail',
      hex: mineCoord,
      effect: 'shutdown',
      source: 'minefield',
    });
    expect(
      events.find((event) => event.type === GameEventType.MinefieldChanged)
        ?.payload,
    ).toMatchObject({
      hex: mineCoord,
      minefield: {
        ...empMinefield,
        detonated: true,
      },
      operation: 'detonate',
      reason: 'movement_detonation',
    });
    expect(result.minefields?.['1,3']).toEqual({
      ...empMinefield,
      detonated: true,
    });
    expectPendingPSR(result, 'domino-tail', PSRTrigger.DominoEffect, {
      reason: 'Domino effect',
      additionalModifier: 0,
    });
  });

  it('does not emit partial charge domino displacement when the downstream chain is blocked', () => {
    const baseState = createState();
    const state: IGameState = {
      ...baseState,
      units: {
        ...baseState.units,
        'player-1': {
          ...baseState.units['player-1'],
          facing: Facing.South,
          movementThisTurn: MovementType.Run,
          hexesMovedThisTurn: 5,
          piloting: 0,
        },
        'domino-blocker': createUnit(
          'domino-blocker',
          GameSide.Opponent,
          { q: 1, r: 1 },
          { pilotConscious: false },
        ),
        'domino-tail': createUnit(
          'domino-tail',
          GameSide.Opponent,
          { q: 1, r: 2 },
          { pilotConscious: false },
        ),
      },
    };
    const { events, result } = runPhaseWithState(
      'charge',
      state,
      createBlockedDominoChargeGrid(),
    );

    expect(resolvedPayload(events)).toMatchObject({
      attackType: 'charge',
      hit: true,
      damage: 28,
    });
    expect(resolvedPayload(events).displacements).toBeUndefined();
    expect(result.units['opponent-1'].position).toEqual({ q: 1, r: 0 });
    expect(result.units['domino-blocker'].position).toEqual({ q: 1, r: 1 });
    expect(result.units['domino-tail'].position).toEqual({ q: 1, r: 2 });
    expect(result.units['player-1'].position).toEqual({ q: 0, r: 0 });
    expect(result.units['domino-blocker'].pendingPSRs).not.toContainEqual(
      expect.objectContaining({ reasonCode: PSRTrigger.DominoEffect }),
    );
    expect(result.units['domino-tail'].pendingPSRs).not.toContainEqual(
      expect.objectContaining({ reasonCode: PSRTrigger.DominoEffect }),
    );
    expect(result.units['opponent-1'].pendingPSRs).not.toContainEqual(
      expect.objectContaining({ reasonCode: PSRTrigger.Charged }),
    );
    expect(result.units['player-1'].pendingPSRs).not.toContainEqual(
      expect.objectContaining({ reasonCode: PSRTrigger.Charged }),
    );
  });

  it('keeps a successful charge in place when target displacement is blocked', () => {
    const { events, result } = runPhase('charge', {
      attacker: {
        movementThisTurn: MovementType.Run,
        hexesMovedThisTurn: 5,
      },
      grid: createPhysicalGrid({ blockChargeDisplacement: true }),
    });
    const destroyed = events.find(
      (event) =>
        event.type === GameEventType.UnitDestroyed &&
        (event.payload as IUnitDestroyedPayload).cause ===
          'impossible_displacement',
    );

    expect(resolvedPayload(events)).toMatchObject({
      attackType: 'charge',
      hit: true,
      damage: 28,
    });
    expect(resolvedPayload(events).displacements).toBeUndefined();
    expect(damageEventsFor(events, 'opponent-1')).toHaveLength(6);
    expect(damageEventsFor(events, 'player-1').length).toBeGreaterThan(0);
    expect(destroyed).toBeUndefined();
    expect(result.units['opponent-1'].position).toEqual({ q: 1, r: 0 });
    expect(result.units['player-1'].position).toEqual({ q: 0, r: 0 });
    expect(result.units['opponent-1'].pendingPSRs).not.toContainEqual(
      expect.objectContaining({ reasonCode: PSRTrigger.Charged }),
    );
    expect(result.units['player-1'].pendingPSRs).not.toContainEqual(
      expect.objectContaining({ reasonCode: PSRTrigger.Charged }),
    );
  });

  it('keeps a successful charge in place when displacement would climb too high', () => {
    const { events, result } = runPhase('charge', {
      attacker: {
        movementThisTurn: MovementType.Run,
        hexesMovedThisTurn: 5,
      },
      grid: createPhysicalGrid({ displacementElevation: 3 }),
    });

    expect(resolvedPayload(events)).toMatchObject({
      attackType: 'charge',
      hit: true,
      damage: 28,
    });
    expect(resolvedPayload(events).displacements).toBeUndefined();
    expect(result.units['opponent-1'].position).toEqual({ q: 1, r: 0 });
    expect(result.units['player-1'].position).toEqual({ q: 0, r: 0 });
    expect(result.units['opponent-1'].pendingPSRs).not.toContainEqual(
      expect.objectContaining({ reasonCode: PSRTrigger.Charged }),
    );
    expect(result.units['player-1'].pendingPSRs).not.toContainEqual(
      expect.objectContaining({ reasonCode: PSRTrigger.Charged }),
    );
  });

  it.each([
    ['impassable terrain', 'impassable'],
    [
      'overgrown woods terrain',
      JSON.stringify([{ type: TerrainType.HeavyWoods, level: 3 }]),
    ],
  ])(
    'keeps a successful charge in place when displacement destination is %s',
    (_label, chargeDisplacementTerrain) => {
      const { events, result } = runPhase('charge', {
        attacker: {
          movementThisTurn: MovementType.Run,
          hexesMovedThisTurn: 5,
        },
        grid: createPhysicalGrid({ chargeDisplacementTerrain }),
      });

      expect(resolvedPayload(events)).toMatchObject({
        attackType: 'charge',
        hit: true,
        damage: 28,
      });
      expect(resolvedPayload(events).displacements).toBeUndefined();
      expect(result.units['opponent-1'].position).toEqual({ q: 1, r: 0 });
      expect(result.units['player-1'].position).toEqual({ q: 0, r: 0 });
      expect(result.units['opponent-1'].pendingPSRs).not.toContainEqual(
        expect.objectContaining({ reasonCode: PSRTrigger.Charged }),
      );
      expect(result.units['player-1'].pendingPSRs).not.toContainEqual(
        expect.objectContaining({ reasonCode: PSRTrigger.Charged }),
      );
    },
  );

  it('refreshes runner grid occupancy after displacement before later same-phase attacks', () => {
    const events: IGameEvent[] = [];
    const violations: IViolation[] = [];
    const state = createSamePhaseDisplacementState();

    const result = runPhysicalAttackPhase({
      state,
      botPlayer: new DeclaresMappedPhysicalAttackAI({
        'player-1': { targetId: 'opponent-1', attackType: 'push' },
        'player-2': { targetId: 'opponent-2', attackType: 'charge' },
      }),
      invariantRunner: new InvariantRunner(),
      violations,
      events,
      gameId: state.gameId,
      grid: createSamePhaseDisplacementGrid(),
      random: new SeededRandom(11),
    });
    const resolved = events
      .filter((event) => event.type === GameEventType.PhysicalAttackResolved)
      .map((event) => event.payload as IPhysicalAttackResolvedPayload);

    expect(resolved).toHaveLength(2);
    expect(resolved[0]).toMatchObject({
      attackerId: 'player-1',
      targetId: 'opponent-1',
      attackType: 'push',
      hit: true,
    });
    expect(resolved[0].displacements).toEqual([
      {
        unitId: 'opponent-1',
        from: { q: 1, r: 0 },
        to: { q: 2, r: 0 },
        reason: 'push',
      },
      {
        unitId: 'player-1',
        from: { q: 0, r: 0 },
        to: { q: 1, r: 0 },
        reason: 'push',
      },
    ]);
    expect(resolved[1]).toMatchObject({
      attackerId: 'player-2',
      targetId: 'opponent-2',
      attackType: 'charge',
      hit: true,
    });
    expect(resolved[1].displacements).toBeUndefined();
    expect(result.units['opponent-1'].position).toEqual({ q: 2, r: 0 });
    expect(result.units['opponent-2'].position).toEqual({ q: 1, r: 1 });
    expect(result.units['player-2'].position).toEqual({ q: 0, r: 2 });
    expect(result.units['opponent-2'].pendingPSRs).not.toContainEqual(
      expect.objectContaining({ reasonCode: PSRTrigger.Charged }),
    );
    expect(result.units['player-2'].pendingPSRs).not.toContainEqual(
      expect.objectContaining({ reasonCode: PSRTrigger.Charged }),
    );
  });

  it('moves a missed charge attacker without queuing a normal charge-miss PSR', () => {
    const { events, result } = runPhase('charge', {
      attacker: {
        movementThisTurn: MovementType.Run,
        hexesMovedThisTurn: 5,
        piloting: 12,
      },
      grid: createPhysicalGrid(),
    });

    expect(resolvedPayload(events)).toMatchObject({
      attackType: 'charge',
      roll: 8,
      toHitNumber: 14,
      hit: false,
    });
    expect(resolvedPayload(events).displacements).toEqual([
      {
        unitId: 'player-1',
        from: { q: 0, r: 0 },
        to: { q: -1, r: 1 },
        reason: 'charge_miss',
      },
    ]);
    expect(damageEventsFor(events, 'opponent-1')).toHaveLength(0);
    expect(result.units['player-1'].pendingPSRs ?? []).not.toContainEqual(
      expect.objectContaining({ reasonCode: PSRTrigger.ChargeMiss }),
    );
    expect(result.units['player-1'].position).toEqual({ q: -1, r: 1 });
    expect(result.units['opponent-1'].pendingPSRs).toHaveLength(0);
  });

  it('applies DFA target clusters, attacker leg damage, and both PSRs', () => {
    const { events, initialState, result } = runPhase('dfa', {
      attacker: {
        movementThisTurn: MovementType.Jump,
        hexesMovedThisTurn: 4,
      },
    });

    expect(resolvedPayload(events)).toMatchObject({
      attackType: 'dfa',
      roll: 8,
      toHitNumber: 5,
      hit: true,
      damage: 21,
    });
    expect(damageEventsFor(events, 'opponent-1')).toHaveLength(5);
    expect(
      damageEventsFor(events, 'player-1').map((payload) => payload.location),
    ).toEqual(expect.arrayContaining(['left_leg', 'right_leg']));
    expect(result.units['player-1'].armor.left_leg).toBeLessThan(
      initialState.units['player-1'].armor.left_leg ?? 0,
    );
    expect(result.units['player-1'].armor.right_leg).toBeLessThan(
      initialState.units['player-1'].armor.right_leg ?? 0,
    );
    expectPendingPSR(result, 'opponent-1', PSRTrigger.DFATarget, {
      additionalModifier: 2,
    });
    expect(result.units['player-1'].pendingPSRs).toContainEqual(
      expect.objectContaining({
        reason: 'Executed DFA',
        reasonCode: PSRTrigger.DFATarget,
        additionalModifier: 4,
        triggerSource: 'dfa_attacker_hit',
      }),
    );
  });

  it('applies source-backed DFA Battle Armor target-class to-hit modifier', () => {
    const { events } = runPhase('dfa', {
      attacker: {
        movementThisTurn: MovementType.Jump,
        hexesMovedThisTurn: 4,
      },
      target: {
        unitType: UnitType.BATTLE_ARMOR,
      },
    });

    expect(resolvedPayload(events)).toMatchObject({
      attackType: 'dfa',
      roll: 8,
      toHitNumber: 6,
      hit: true,
    });
  });

  it('applies source-backed DFA piloting skill differential modifier', () => {
    const { events } = runPhase('dfa', {
      attacker: {
        movementThisTurn: MovementType.Jump,
        hexesMovedThisTurn: 4,
        piloting: 5,
      },
      target: {
        piloting: 3,
      },
    });

    expect(resolvedPayload(events)).toMatchObject({
      attackType: 'dfa',
      roll: 8,
      toHitNumber: 7,
      hit: true,
    });
  });

  it('applies source-backed DFA hit displacement', () => {
    const { events, result } = runPhase('dfa', {
      attacker: {
        movementThisTurn: MovementType.Jump,
        hexesMovedThisTurn: 4,
      },
      grid: createPhysicalGrid(),
    });

    expect(resolvedPayload(events).displacements).toEqual([
      {
        unitId: 'opponent-1',
        from: { q: 1, r: 0 },
        to: { q: 1, r: 1 },
        reason: 'dfa',
      },
      {
        unitId: 'player-1',
        from: { q: 0, r: 0 },
        to: { q: 1, r: 0 },
        reason: 'dfa',
      },
    ]);
    expect(result.units['opponent-1'].position).toEqual({ q: 1, r: 1 });
    expect(result.units['player-1'].position).toEqual({ q: 1, r: 0 });
  });

  it('hydrates grounded DropShip source context for DFA hit displacement', () => {
    const baseState = createState();
    const state: IGameState = {
      ...baseState,
      units: {
        ...baseState.units,
        'player-1': {
          ...baseState.units['player-1'],
          movementThisTurn: MovementType.Jump,
          hexesMovedThisTurn: 4,
        },
        'grounded-dropship': createUnit(
          'grounded-dropship',
          GameSide.Opponent,
          { q: 1, r: 0 },
          {
            unitType: UnitType.DROPSHIP,
            isAirborne: false,
            pilotConscious: false,
          },
        ),
      },
    };
    const { events, result } = runPhaseWithState(
      'dfa',
      state,
      createGroundedDropShipDfaGrid(),
    );

    expect(resolvedPayload(events)).toMatchObject({
      attackType: 'dfa',
      hit: true,
    });
    expect(resolvedPayload(events).displacements).toEqual([
      {
        unitId: 'opponent-1',
        from: { q: 1, r: 0 },
        to: { q: 1, r: 2 },
        reason: 'dfa',
      },
      {
        unitId: 'player-1',
        from: { q: 0, r: 0 },
        to: { q: 1, r: 0 },
        reason: 'dfa',
      },
    ]);
    expect(result.units['opponent-1'].position).toEqual({ q: 1, r: 2 });
    expect(result.units['grounded-dropship'].position).toEqual({
      q: 1,
      r: 0,
    });
    expect(result.units['player-1'].position).toEqual({ q: 1, r: 0 });
  });

  it('applies source-backed DFA miss target displacement and attacker fall-in', () => {
    const { events, result } = runPhase('dfa', {
      attacker: {
        movementThisTurn: MovementType.Jump,
        hexesMovedThisTurn: 4,
        piloting: 12,
      },
      target: {
        piloting: 12,
      },
      grid: createPhysicalGrid(),
    });

    expect(resolvedPayload(events)).toMatchObject({
      attackType: 'dfa',
      roll: 8,
      toHitNumber: 12,
      hit: false,
    });
    expect(resolvedPayload(events).displacements).toEqual([
      {
        unitId: 'opponent-1',
        from: { q: 1, r: 0 },
        to: { q: 1, r: 1 },
        reason: 'dfa_miss',
      },
      {
        unitId: 'player-1',
        from: { q: 0, r: 0 },
        to: { q: 1, r: 0 },
        reason: 'dfa_miss',
      },
    ]);
    expect(damageEventsFor(events, 'opponent-1')).toHaveLength(0);
    const attackerFallDamage = damageEventsFor(events, 'player-1');
    const fell = events.find((event) => event.type === GameEventType.UnitFell);
    const pilotHit = events.find(
      (event) => event.type === GameEventType.PilotHit,
    );
    const fallPayload = fell?.payload as IUnitFellPayload | undefined;
    const pilotHitPayload = pilotHit?.payload as IPilotHitPayload | undefined;
    expect(
      attackerFallDamage.reduce((sum, event) => sum + event.damage, 0),
    ).toBe(21);
    expect(fallPayload).toMatchObject({
      unitId: 'player-1',
      fallDamage: 21,
      newFacing: Facing.North,
      pilotDamage: 1,
      location: 'dfa_miss',
      reason: 'Missed DFA',
      reasonCode: PSRTrigger.DFAMiss,
    });
    expect(pilotHitPayload).toMatchObject({
      unitId: 'player-1',
      wounds: 1,
      totalWounds: 1,
      source: 'fall',
      consciousnessCheckRequired: true,
      consciousnessCheckPassed: true,
    });
    expect(result.units['player-1'].pendingPSRs).toEqual([]);
    expect(result.units['opponent-1'].position).toEqual({ q: 1, r: 1 });
    expect(result.units['player-1']).toMatchObject({
      position: { q: 1, r: 0 },
      prone: true,
      facing: Facing.North,
      pilotWounds: 1,
      pilotConscious: true,
    });
  });

  it('avoids friendly occupied DFA miss displacement destinations in runner resolution', () => {
    const baseState = createState();
    const state: IGameState = {
      ...baseState,
      units: {
        ...baseState.units,
        'player-1': {
          ...baseState.units['player-1'],
          facing: Facing.South,
          movementThisTurn: MovementType.Jump,
          hexesMovedThisTurn: 4,
          piloting: 12,
        },
        'opponent-1': {
          ...baseState.units['opponent-1'],
          piloting: 12,
        },
        'opponent-friend': createUnit(
          'opponent-friend',
          GameSide.Opponent,
          { q: 1, r: 1 },
          { pilotConscious: false },
        ),
      },
    };
    const { events, result } = runPhaseWithState(
      'dfa',
      state,
      createFriendlyDfaMissGrid(),
    );

    expect(resolvedPayload(events)).toMatchObject({
      attackType: 'dfa',
      hit: false,
    });
    expect(resolvedPayload(events).displacements).toEqual([
      {
        unitId: 'opponent-1',
        from: { q: 1, r: 0 },
        to: { q: 0, r: 1 },
        reason: 'dfa_miss',
      },
      {
        unitId: 'player-1',
        from: { q: 0, r: 0 },
        to: { q: 1, r: 0 },
        reason: 'dfa_miss',
      },
    ]);
    expect(result.units['opponent-1'].position).toEqual({ q: 0, r: 1 });
    expect(result.units['opponent-friend'].position).toEqual({ q: 1, r: 1 });
    expect(result.units['player-1'].position).toEqual({ q: 1, r: 0 });
  });

  it('destroys the DFA target when hit displacement is impossible', () => {
    const { events, result } = runPhase('dfa', {
      attacker: {
        movementThisTurn: MovementType.Jump,
        hexesMovedThisTurn: 4,
      },
      grid: createPhysicalGrid({ blockDfaDisplacement: true }),
    });
    const destroyed = events.find(
      (event) =>
        event.type === GameEventType.UnitDestroyed &&
        (event.payload as IUnitDestroyedPayload).unitId === 'opponent-1',
    );
    const payload = destroyed?.payload as IUnitDestroyedPayload | undefined;

    expect(payload).toMatchObject({
      unitId: 'opponent-1',
      cause: 'impossible_displacement',
      killerUnitId: 'player-1',
    });
    expect(resolvedPayload(events).displacements).toEqual([
      {
        unitId: 'player-1',
        from: { q: 0, r: 0 },
        to: { q: 1, r: 0 },
        reason: 'dfa',
      },
    ]);
    expect(result.units['opponent-1'].destroyed).toBe(true);
    expect(result.units['player-1'].position).toEqual({ q: 1, r: 0 });
  });

  it('destroys the DFA attacker when miss displacement is impossible', () => {
    const { events, result } = runPhase('dfa', {
      attacker: {
        movementThisTurn: MovementType.Jump,
        hexesMovedThisTurn: 4,
        piloting: 12,
      },
      target: {
        piloting: 12,
      },
      grid: createPhysicalGrid({ blockDfaDisplacement: true }),
    });
    const destroyed = events.find(
      (event) =>
        event.type === GameEventType.UnitDestroyed &&
        (event.payload as IUnitDestroyedPayload).unitId === 'player-1',
    );
    const psrEvents = events.filter(
      (event) => event.type === GameEventType.PSRTriggered,
    );
    const payload = destroyed?.payload as IUnitDestroyedPayload | undefined;

    expect(resolvedPayload(events)).toMatchObject({
      attackType: 'dfa',
      hit: false,
      roll: 8,
      toHitNumber: 12,
    });
    expect(resolvedPayload(events).displacements).toBeUndefined();
    expect(payload).toMatchObject({
      unitId: 'player-1',
      cause: 'impossible_displacement',
    });
    expect(payload?.killerUnitId).toBeUndefined();
    expect(psrEvents).toHaveLength(0);
    expect(result.units['player-1'].destroyed).toBe(true);
    expect(result.units['player-1'].position).toEqual({ q: 0, r: 0 });
  });
});
