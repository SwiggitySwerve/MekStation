import { ActuatorType } from '@/types/construction/MechConfigurationSystem';
import {
  Facing,
  GameEventType,
  GamePhase,
  GameSide,
  GameStatus,
  type IPilotHitPayload,
  LockState,
  MovementType,
  type IGameEvent,
  type IGameState,
  type IPSRResolvedPayload,
  type IUnitGameState,
  PSRTrigger,
} from '@/types/gameplay';
import { UnitType } from '@/types/unit';
import { buildCriticalSlotManifest } from '@/utils/gameplay/criticalHitResolution';
import {
  createEnteringWaterPSR,
  createKickedPSR,
  createDamagePSR,
  createMASCFailurePSR,
  createOutOfControlPSR,
  createRubblePSR,
  createSkiddingPSR,
  createSuperchargerFailurePSR,
  createSwampBogDownPSR,
} from '@/utils/gameplay/pilotingSkillRolls';
import { UNIT_QUIRK_IDS } from '@/utils/gameplay/quirkModifiers';

import { SeededRandom } from '../../core/SeededRandom';
import {
  QUIRK_COMBAT_SUPPORT,
  SPA_COMBAT_SUPPORT,
} from '../CombatFeatureSupport';
import { PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT } from '../CombatPilotModifierApplicationSupport';
import { applySuperchargerFailureCriticalDamage } from '../phases/movementEnhancementFailureDamage';
import { runPSRPhase } from '../phases/postCombat';
import { DEFAULT_COMPONENT_DAMAGE } from '../SimulationRunnerConstants';

export function fixedRandom(nextValue: number): SeededRandom {
  return { next: () => nextValue } as unknown as SeededRandom;
}

export function sequenceRandom(values: readonly number[]): SeededRandom {
  let index = 0;
  return {
    next: () => values[Math.min(index++, values.length - 1)] ?? 0,
  } as unknown as SeededRandom;
}

export function sequenceD6(values: readonly number[]): () => number {
  let index = 0;
  return () => values[Math.min(index++, values.length - 1)] ?? 1;
}

export function makeUnit(
  overrides: Partial<IUnitGameState> = {},
): IUnitGameState {
  return {
    id: 'player-1',
    side: GameSide.Player,
    position: { q: 0, r: 0 },
    facing: Facing.North,
    heat: 0,
    movementThisTurn: MovementType.Stationary,
    hexesMovedThisTurn: 0,
    armor: {},
    structure: {},
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
    gunnery: 4,
    piloting: 5,
    ...overrides,
  };
}

export function makeState(unit: IUnitGameState): IGameState {
  return {
    gameId: 'psr-phase-behavior-test',
    status: GameStatus.Active,
    turn: 1,
    phase: GamePhase.PhysicalAttack,
    activationIndex: 0,
    units: { [unit.id]: unit },
    turnEvents: [],
  };
}
