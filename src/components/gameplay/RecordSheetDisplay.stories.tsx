import type { Meta, StoryObj } from '@storybook/react';

import { fn } from '@storybook/test';

import {
  Facing,
  GameEventType,
  GamePhase,
  GameSide,
  LockState,
  MovementType,
  type IGameEvent,
  type IUnitGameState,
  type IWeaponStatus,
} from '@/types/gameplay';

import { RecordSheetDisplay } from './RecordSheetDisplay';

const maxArmor: Record<string, number> = {
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
};

const maxStructure: Record<string, number> = {
  head: 3,
  center_torso: 31,
  left_torso: 21,
  right_torso: 21,
  left_arm: 17,
  right_arm: 17,
  left_leg: 21,
  right_leg: 21,
};

const atlasState: IUnitGameState = {
  id: 'atlas',
  side: GameSide.Player,
  position: { q: 0, r: 0 },
  facing: Facing.North,
  heat: 7,
  movementThisTurn: MovementType.Walk,
  hexesMovedThisTurn: 2,
  armor: {
    ...maxArmor,
    center_torso: 31,
    right_torso: 18,
    right_arm: 12,
  },
  structure: {
    ...maxStructure,
    right_arm: 9,
  },
  destroyedLocations: [],
  destroyedEquipment: ['small-laser-ra'],
  ammo: {
    ac20: 4,
    lrm20: 8,
    srm6: 10,
  },
  pilotWounds: 1,
  pilotConscious: true,
  destroyed: false,
  lockState: LockState.Planning,
};

const weapons: readonly IWeaponStatus[] = [
  {
    id: 'ac20',
    name: 'AC/20',
    location: 'right_torso',
    destroyed: false,
    firedThisTurn: true,
    ammoRemaining: 4,
    ammoMax: 10,
    heat: 7,
    damage: 20,
    ranges: { short: 3, medium: 6, long: 9 },
  },
  {
    id: 'lrm20',
    name: 'LRM 20',
    location: 'left_torso',
    destroyed: false,
    firedThisTurn: false,
    ammoRemaining: 8,
    ammoMax: 12,
    heat: 6,
    damage: '20 clusters',
    ranges: { minimum: 6, short: 7, medium: 14, long: 21 },
  },
  {
    id: 'mlas-ct',
    name: 'Medium Laser',
    location: 'center_torso',
    destroyed: false,
    firedThisTurn: false,
    heat: 3,
    damage: 5,
    ranges: { short: 3, medium: 6, long: 9 },
  },
  {
    id: 'small-laser-ra',
    name: 'Small Laser',
    location: 'right_arm',
    destroyed: true,
    firedThisTurn: false,
    heat: 1,
    damage: 3,
    ranges: { short: 1, medium: 2, long: 3 },
  },
];

const recentEvents: readonly IGameEvent[] = [
  {
    id: 'damage-atlas-ra',
    gameId: 'story-game',
    sequence: 11,
    timestamp: '2026-04-29T03:08:00.000Z',
    type: GameEventType.DamageApplied,
    turn: 2,
    phase: GamePhase.WeaponAttack,
    payload: {
      unitId: 'atlas',
      location: 'right_arm',
      damage: 14,
      armorRemaining: 12,
      structureRemaining: 9,
      locationDestroyed: false,
      sourceUnitId: 'hunchback',
      attackId: 'hunchback-ac20',
    },
  },
  {
    id: 'pilot-atlas',
    gameId: 'story-game',
    sequence: 12,
    timestamp: '2026-04-29T03:08:05.000Z',
    type: GameEventType.PilotHit,
    turn: 2,
    phase: GamePhase.WeaponAttack,
    payload: {
      unitId: 'atlas',
      wounds: 1,
      totalWounds: 1,
      source: 'head_hit',
      consciousnessCheckRequired: true,
      consciousnessCheckPassed: true,
    },
  },
];

const meta: Meta<typeof RecordSheetDisplay> = {
  title: 'Gameplay/RecordSheetDisplay',
  component: RecordSheetDisplay,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  decorators: [
    (Story) => (
      <div className="h-[760px] w-[520px] max-w-full overflow-hidden rounded-lg border border-gray-700">
        <Story />
      </div>
    ),
  ],
  args: {
    unitName: 'Atlas AS7-D',
    designation: 'AS7-D',
    state: atlasState,
    maxArmor,
    maxStructure,
    weapons,
    pilotName: 'Major Tamsin Vale',
    gunnery: 3,
    piloting: 4,
    heatSinks: 20,
    selectedWeaponIds: ['ac20'],
    onWeaponToggle: fn(),
    side: GameSide.Player,
    tonnage: 100,
    chassis: 'Atlas',
    unitId: 'atlas',
    events: recentEvents,
    spas: [
      {
        id: 'weapon-specialist-ac20',
        displayLabel: 'Weapon Specialist (AC/20)',
        description: 'Improves accuracy with the selected weapon family.',
      },
    ],
  },
};

export default meta;
type Story = StoryObj<typeof RecordSheetDisplay>;

export const DamagedAssaultMech: Story = {};

export const DestroyedUnit: Story = {
  args: {
    state: {
      ...atlasState,
      armor: Object.fromEntries(
        Object.keys(maxArmor).map((location) => [location, 0]),
      ),
      structure: Object.fromEntries(
        Object.keys(maxStructure).map((location) => [location, 0]),
      ),
      destroyedLocations: [
        'head',
        'center_torso',
        'left_torso',
        'right_torso',
        'left_arm',
        'right_arm',
        'left_leg',
        'right_leg',
      ],
      destroyed: true,
      pilotConscious: false,
    },
  },
};
