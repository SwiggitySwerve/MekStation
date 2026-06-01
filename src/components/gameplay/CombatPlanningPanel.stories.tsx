import type { Decorator, Meta, StoryObj } from '@storybook/react';

import { fn } from '@storybook/test';
import { useEffect } from 'react';

import type { IWeapon } from '@/simulation/ai/types';

import { useGameplayStore } from '@/stores/useGameplayStore';
import {
  DEFAULT_UI_STATE,
  Facing,
  GamePhase,
  GameSide,
  GameStatus,
  LockState,
  MovementType,
  type IGameSession,
  type IGameUnit,
  type IUnitGameState,
} from '@/types/gameplay';

import { CombatPlanningPanel } from './CombatPlanningPanel';

const weapons: readonly IWeapon[] = [
  {
    id: 'ac20',
    name: 'AC/20',
    shortRange: 3,
    mediumRange: 6,
    longRange: 9,
    damage: 20,
    heat: 7,
    minRange: 0,
    ammoPerTon: 5,
    destroyed: false,
  },
  {
    id: 'medium-laser',
    name: 'Medium Laser',
    shortRange: 3,
    mediumRange: 6,
    longRange: 9,
    damage: 5,
    heat: 3,
    minRange: 0,
    ammoPerTon: -1,
    destroyed: false,
  },
  {
    id: 'lrm20',
    name: 'LRM 20',
    shortRange: 7,
    mediumRange: 14,
    longRange: 21,
    damage: 20,
    heat: 6,
    minRange: 6,
    ammoPerTon: 6,
    destroyed: false,
  },
];

const units: readonly IGameUnit[] = [
  {
    id: 'atlas',
    name: 'Atlas AS7-D',
    side: GameSide.Player,
    unitRef: 'atlas-as7-d',
    pilotRef: 'major-vale',
    gunnery: 3,
    piloting: 4,
    heatSinks: 20,
    heatSinkType: 'double',
  },
  {
    id: 'hunchback',
    name: 'Hunchback HBK-4G',
    side: GameSide.Opponent,
    unitRef: 'hunchback-hbk-4g',
    pilotRef: 'captain-rhee',
    gunnery: 4,
    piloting: 5,
    heatSinks: 10,
  },
];

function createUnitState(
  id: string,
  side: GameSide,
  position: { q: number; r: number },
  lockState: LockState,
): IUnitGameState {
  return {
    id,
    side,
    position,
    facing: side === GameSide.Player ? Facing.North : Facing.South,
    heat: side === GameSide.Player ? 7 : 2,
    movementThisTurn: MovementType.Walk,
    hexesMovedThisTurn: side === GameSide.Player ? 2 : 0,
    armor: {
      head: 9,
      center_torso: 47,
      center_torso_rear: 14,
      left_torso: 32,
      left_torso_rear: 10,
      right_torso: 32,
      right_torso_rear: 10,
      left_arm: 34,
      right_arm: 34,
      left_leg: 42,
      right_leg: 42,
    },
    structure: {
      head: 3,
      center_torso: 31,
      left_torso: 21,
      right_torso: 21,
      left_arm: 17,
      right_arm: 17,
      left_leg: 21,
      right_leg: 21,
    },
    destroyedLocations: [],
    destroyedEquipment: [],
    ammo: {
      ac20: 4,
      lrm20: 8,
    },
    pilotWounds: 0,
    pilotConscious: true,
    destroyed: false,
    lockState,
  };
}

function createSession(
  phase: GamePhase,
  attackerLocked: boolean,
): IGameSession {
  const playerLockState = attackerLocked
    ? LockState.Locked
    : LockState.Planning;
  return {
    id: 'storybook-combat-session',
    createdAt: '2026-04-29T03:00:00.000Z',
    updatedAt: '2026-04-29T03:14:00.000Z',
    config: {
      mapRadius: 5,
      turnLimit: 12,
      victoryConditions: ['destroy_opponent'],
      optionalRules: [],
    },
    units,
    events: [],
    currentState: {
      gameId: 'storybook-combat-session',
      status: GameStatus.Active,
      turn: 2,
      phase,
      activationIndex: 0,
      initiativeWinner: GameSide.Player,
      firstMover: GameSide.Opponent,
      units: {
        atlas: createUnitState(
          'atlas',
          GameSide.Player,
          { q: 0, r: 0 },
          playerLockState,
        ),
        hunchback: createUnitState(
          'hunchback',
          GameSide.Opponent,
          { q: 3, r: -1 },
          LockState.Pending,
        ),
      },
      turnEvents: [],
    },
  };
}

const GameplayStoreDecorator: Decorator = (Story, context) => {
  const phase =
    context.parameters.gameplayPhase === GamePhase.WeaponAttack
      ? GamePhase.WeaponAttack
      : context.parameters.gameplayPhase === GamePhase.PhysicalAttack
        ? GamePhase.PhysicalAttack
        : GamePhase.Movement;
  const attackerLocked = context.parameters.attackerLocked === true;

  useEffect(() => {
    useGameplayStore.getState().reset();
    useGameplayStore.setState({
      session: createSession(phase, attackerLocked),
      ui: {
        ...DEFAULT_UI_STATE,
        selectedUnitId: 'atlas',
        targetUnitId: phase === GamePhase.Movement ? null : 'hunchback',
      },
      plannedMovement:
        phase === GamePhase.Movement
          ? {
              destination: { q: 1, r: 0 },
              facing: Facing.Northeast,
              movementType: MovementType.Walk,
              path: [
                { q: 0, r: 0 },
                { q: 1, r: 0 },
              ],
            }
          : null,
      attackPlan:
        phase === GamePhase.Movement
          ? { targetUnitId: null, selectedWeapons: [], weaponModeError: null }
          : {
              targetUnitId: 'hunchback',
              selectedWeapons: ['ac20'],
              weaponModeError: null,
            },
      previewEnabled: true,
    });

    return () => {
      useGameplayStore.getState().reset();
    };
  }, [attackerLocked, phase]);

  return <Story />;
};

const meta: Meta<typeof CombatPlanningPanel> = {
  title: 'Gameplay/CombatPlanningPanel',
  component: CombatPlanningPanel,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    gameplayPhase: GamePhase.Movement,
  },
  decorators: [
    GameplayStoreDecorator,
    (Story) => (
      <div className="w-[520px] max-w-full rounded-lg border border-gray-300 bg-white">
        <Story />
      </div>
    ),
  ],
  args: {
    walkMP: 3,
    runMP: 5,
    jumpMP: 0,
    weapons,
    attackerTonnage: 100,
    onPhysicalAttackIntentChange: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof CombatPlanningPanel>;

export const MovementPlanning: Story = {};

export const WeaponAttackPlanning: Story = {
  parameters: {
    gameplayPhase: GamePhase.WeaponAttack,
  },
};

export const LockedWeaponAttack: Story = {
  parameters: {
    gameplayPhase: GamePhase.WeaponAttack,
    attackerLocked: true,
  },
};

export const PhysicalAttackPlanning: Story = {
  parameters: {
    gameplayPhase: GamePhase.PhysicalAttack,
  },
};
