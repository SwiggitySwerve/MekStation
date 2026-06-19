/**
 * Behavior-class coverage for heat environment parity boundaries.
 *
 * The event-session heat resolver accepts water/fire providers, and the
 * quick-sim runner heat phase consumes occupied grid terrain for water/fire
 * effects. These tests keep the remaining generic environment boundary explicit
 * so the validation catalog does not overstate runner parity.
 */

import type { CriticalSlotManifest } from '@/utils/gameplay/criticalHitResolution';
import type { DiceRoller } from '@/utils/gameplay/diceTypes';

import {
  Facing,
  GameEventType,
  GamePhase,
  GameSide,
  GameStatus,
  IGameConfig,
  IGameEvent,
  IGameSession,
  IGameState,
  IGameUnit,
  IHexGrid,
  IHeatEffectAppliedPayload,
  IHeatPayload,
  IPilotHitPayload,
  IShutdownCheckPayload,
  IUnitGameState,
  IWeaponAttack,
  LockState,
  MovementType,
  RangeBracket,
  WeaponCategory,
} from '@/types/gameplay';
import { TerrainType } from '@/types/gameplay/TerrainTypes';
import { createEnvironmentalConditions } from '@/utils/gameplay/environmentalModifiers';
import {
  advancePhase,
  createGameSession,
  declareAttack,
  lockAttack,
  resolveHeatPhase,
  rollInitiative,
  startGame,
} from '@/utils/gameplay/gameSession';
import { getTerrainHeatEffect } from '@/utils/gameplay/heat';

import type { IWeapon } from '../../ai/types';

import { SeededRandom } from '../../core/SeededRandom';
import { PILOT_DAMAGE_COMBAT_SUPPORT } from '../CombatDamageSupport';
import {
  QUIRK_COMBAT_SUPPORT,
  SPA_COMBAT_SUPPORT,
} from '../CombatFeatureSupport';
import { RUNNER_INTERACTIVE_PARITY_SUPPORT } from '../CombatParitySupport';
import { PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT } from '../CombatPilotModifierApplicationSupport';
import {
  HEAT_RULE_COMBAT_SUPPORT,
  TERRAIN_ENVIRONMENT_COMBAT_SUPPORT,
} from '../CombatRuleSupport';
import { runHeatPhase } from '../phases/postCombat';
import { DEFAULT_COMPONENT_DAMAGE } from '../SimulationRunnerConstants';
import { createMinimalGrid } from '../SimulationRunnerSupport';

export const fixedD6 = (): number => 6;
export const fixedRoller: DiceRoller = () => ({
  dice: [6, 6],
  total: 12,
  isSnakeEyes: false,
  isBoxcars: true,
});
export const rollSeven: DiceRoller = () => ({
  dice: [3, 4],
  total: 7,
  isSnakeEyes: false,
  isBoxcars: false,
});

export function createScriptedDiceRoller(
  rolls: readonly (readonly [number, number])[],
): DiceRoller {
  const queuedRolls = [...rolls];
  return () => {
    const dice = queuedRolls.shift() ?? [6, 6];
    const total = dice[0] + dice[1];
    return {
      dice,
      total,
      isSnakeEyes: total === 2,
      isBoxcars: total === 12,
    };
  };
}

export function createConfig(): IGameConfig {
  return {
    mapRadius: 5,
    turnLimit: 0,
    victoryConditions: ['elimination'],
    optionalRules: [],
  };
}

export function createGameUnit(id: string, side: GameSide): IGameUnit {
  return {
    id,
    name: id,
    side,
    unitRef: `${id}-ref`,
    pilotRef: `${id}-pilot`,
    gunnery: 4,
    piloting: 5,
    heatSinks: 10,
    heatSinkType: 'single',
  };
}

export function createPpc(id: string): IWeaponAttack {
  return {
    weaponId: id,
    weaponName: 'PPC',
    damage: 10,
    heat: 10,
    category: WeaponCategory.ENERGY,
    minRange: 3,
    shortRange: 6,
    mediumRange: 12,
    longRange: 18,
    isCluster: false,
  };
}

export function createRunnerPpc(id: string): IWeapon {
  return {
    id,
    name: 'PPC',
    shortRange: 6,
    mediumRange: 12,
    longRange: 18,
    damage: 10,
    heat: 10,
    minRange: 3,
    ammoPerTon: -1,
    destroyed: false,
  };
}

export function createInteractiveHeatSession(
  playerWeapons: readonly IWeaponAttack[] = [],
): IGameSession {
  let session = createGameSession(createConfig(), [
    createGameUnit('player-1', GameSide.Player),
    createGameUnit('opponent-1', GameSide.Opponent),
  ]);

  session = startGame(session, GameSide.Player);
  session = rollInitiative(session, GameSide.Player, fixedD6);
  session = advancePhase(session); // Movement
  session = advancePhase(session); // WeaponAttack

  if (playerWeapons.length > 0) {
    session = declareAttack(
      session,
      'player-1',
      'opponent-1',
      playerWeapons,
      6,
      RangeBracket.Short,
    );
    session = lockAttack(session, 'player-1');
  }

  session = advancePhase(session); // PhysicalAttack
  session = advancePhase(session); // Heat
  return session;
}

export function createRunnerUnit(
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
    pendingPSRs: [],
    weaponsFiredThisTurn: [],
    gunnery: 4,
    piloting: 5,
    heatSinks: 10,
    heatSinkType: 'single',
    ...overrides,
  };
}

export function createRunnerHeatState(unit: IUnitGameState): IGameState {
  return {
    gameId: 'heat-environment-parity-test',
    status: GameStatus.Active,
    turn: 1,
    phase: GamePhase.Heat,
    activationIndex: 0,
    units: { [unit.id]: unit },
    turnEvents: [],
  };
}

export function createRunnerTerrainGrid(terrain: string): IHexGrid {
  const grid = createMinimalGrid(3);
  const hex = grid.hexes.get('0,0');
  if (!hex) return grid;

  const hexes = new Map(grid.hexes);
  hexes.set('0,0', { ...hex, terrain });
  return { ...grid, hexes };
}

export function withInteractiveUnit(
  session: IGameSession,
  unitId: string,
  overrides: Partial<IUnitGameState>,
): IGameSession {
  return {
    ...session,
    currentState: {
      ...session.currentState,
      units: {
        ...session.currentState.units,
        [unitId]: {
          ...session.currentState.units[unitId],
          ...overrides,
        },
      },
    },
  };
}

export function heatPayloads(
  session: IGameSession,
  type: GameEventType,
  unitId = 'player-1',
): readonly IHeatPayload[] {
  return session.events
    .filter((event) => event.type === type && event.actorId === unitId)
    .map((event) => event.payload as IHeatPayload);
}
