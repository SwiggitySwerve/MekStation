import type { Meta, StoryObj } from '@storybook/react';

import { fn } from '@storybook/test';

import {
  GameEventType,
  GamePhase,
  GameSide,
  Facing,
  MovementType,
  type IGameEvent,
} from '@/types/gameplay';

import { EventLogDisplay } from './EventLogDisplay';

const events: readonly IGameEvent[] = [
  {
    id: 'event-1',
    gameId: 'story-game',
    sequence: 1,
    timestamp: '2026-04-29T03:00:00.000Z',
    type: GameEventType.TurnStarted,
    turn: 1,
    phase: GamePhase.Initiative,
    payload: {},
  },
  {
    id: 'event-2',
    gameId: 'story-game',
    sequence: 2,
    timestamp: '2026-04-29T03:01:00.000Z',
    type: GameEventType.PhaseChanged,
    turn: 1,
    phase: GamePhase.Movement,
    payload: {
      fromPhase: GamePhase.Initiative,
      toPhase: GamePhase.Movement,
    },
  },
  {
    id: 'event-3',
    gameId: 'story-game',
    sequence: 3,
    timestamp: '2026-04-29T03:03:00.000Z',
    type: GameEventType.MovementDeclared,
    turn: 1,
    phase: GamePhase.Movement,
    actorId: 'atlas',
    payload: {
      unitId: 'atlas',
      from: { q: 0, r: 0 },
      to: { q: 1, r: 0 },
      facing: Facing.Northeast,
      movementType: MovementType.Walk,
      mpUsed: 2,
      heatGenerated: 0,
    },
  },
  {
    id: 'event-4',
    gameId: 'story-game',
    sequence: 4,
    timestamp: '2026-04-29T03:06:00.000Z',
    type: GameEventType.AttackResolved,
    turn: 1,
    phase: GamePhase.WeaponAttack,
    actorId: 'atlas',
    payload: {
      attackerId: 'atlas',
      targetId: 'hunchback',
      weaponId: 'ac20',
      roll: 9,
      toHitNumber: 7,
      hit: true,
      location: 'center_torso',
      damage: 20,
      heat: 7,
      attackerArc: 'front',
      ammoBinId: 'ac20-bin-1',
    },
  },
  {
    id: 'event-5',
    gameId: 'story-game',
    sequence: 5,
    timestamp: '2026-04-29T03:06:05.000Z',
    type: GameEventType.DamageApplied,
    turn: 1,
    phase: GamePhase.WeaponAttack,
    actorId: 'atlas',
    payload: {
      unitId: 'hunchback',
      location: 'center_torso',
      damage: 20,
      armorRemaining: 0,
      structureRemaining: 8,
      locationDestroyed: false,
      sourceUnitId: 'atlas',
      attackId: 'atlas',
    },
  },
  {
    id: 'event-6',
    gameId: 'story-game',
    sequence: 6,
    timestamp: '2026-04-29T03:08:00.000Z',
    type: GameEventType.HeatGenerated,
    turn: 1,
    phase: GamePhase.Heat,
    actorId: 'atlas',
    payload: {
      unitId: 'atlas',
      amount: 7,
      source: 'firing',
      newTotal: 7,
    },
  },
];

const meta: Meta<typeof EventLogDisplay> = {
  title: 'Gameplay/EventLogDisplay',
  component: EventLogDisplay,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  decorators: [
    (Story) => (
      <div className="w-[780px] max-w-full rounded-lg border border-gray-300 bg-white">
        <Story />
      </div>
    ),
  ],
  args: {
    events,
    actorLookup: {
      atlas: 'AS7-D',
      hunchback: 'HBK-4G',
    },
    weaponLookup: {
      ac20: 'AC/20',
    },
    maxHeight: 280,
    onFilterChange: fn(),
    onCollapsedChange: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof EventLogDisplay>;

export const CombatSequence: Story = {};

export const Collapsed: Story = {
  args: {
    collapsed: true,
  },
};

export const FilteredToAttackPhase: Story = {
  args: {
    filter: {
      eventTypes: [GameEventType.AttackResolved, GameEventType.DamageApplied],
    },
  },
};

export const Empty: Story = {
  args: {
    events: [],
  },
};
