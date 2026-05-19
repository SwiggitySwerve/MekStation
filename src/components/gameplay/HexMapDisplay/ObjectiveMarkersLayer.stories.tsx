/**
 * Storybook stories for the scenario objective marker layer.
 *
 * One story per control state (neutral / friendly / enemy / contested)
 * plus a mixed-objective-type story, per `add-scenario-objective-engine`
 * task 6.3.
 */

import type { Meta, StoryObj } from '@storybook/react';

import type { IObjectiveMarker } from '@/types/scenario/ScenarioInterfaces';

import {
  Facing,
  GameSide,
  type IUnitToken,
  TokenUnitType,
} from '@/types/gameplay';

import { HexMapDisplay } from './HexMapDisplay';

const meta: Meta<typeof HexMapDisplay> = {
  title: 'Gameplay/ObjectiveMarkersLayer',
  component: HexMapDisplay,
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story) => (
      <div className="h-[600px] w-full">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof HexMapDisplay>;

function marker(overrides: Partial<IObjectiveMarker>): IObjectiveMarker {
  return {
    id: 'objective-1',
    hexKey: '0,0',
    objectiveType: 'capture',
    owningSide: 'neutral',
    controlSide: 'neutral',
    controlRule: 'sole-occupancy',
    holdTurnsRequired: 3,
    holdProgress: 0,
    ...overrides,
  };
}

function token(overrides: Partial<IUnitToken>): IUnitToken {
  return {
    unitId: 'unit',
    name: 'Unit',
    side: GameSide.Player,
    position: { q: 0, r: 0 },
    facing: Facing.North,
    isSelected: false,
    isValidTarget: false,
    isDestroyed: false,
    designation: 'UNT',
    unitType: TokenUnitType.Mech,
    ...overrides,
  } as IUnitToken;
}

export const NeutralObjective: Story = {
  args: {
    radius: 5,
    tokens: [],
    selectedHex: null,
    friendlySide: GameSide.Player,
    objectives: { '0,0': marker({ controlSide: 'neutral', holdProgress: 0 }) },
  },
};

export const FriendlyControlled: Story = {
  args: {
    radius: 5,
    tokens: [token({ unitId: 'p1', position: { q: 0, r: 0 } })],
    selectedHex: null,
    friendlySide: GameSide.Player,
    objectives: { '0,0': marker({ controlSide: 'player', holdProgress: 2 }) },
  },
};

export const EnemyControlled: Story = {
  args: {
    radius: 5,
    tokens: [
      token({
        unitId: 'o1',
        side: GameSide.Opponent,
        position: { q: 0, r: 0 },
      }),
    ],
    selectedHex: null,
    friendlySide: GameSide.Player,
    objectives: { '0,0': marker({ controlSide: 'opponent', holdProgress: 1 }) },
  },
};

export const ContestedObjective: Story = {
  args: {
    radius: 5,
    tokens: [
      token({ unitId: 'p1', side: GameSide.Player, position: { q: 0, r: 0 } }),
      token({
        unitId: 'o1',
        side: GameSide.Opponent,
        position: { q: 0, r: 0 },
      }),
    ],
    selectedHex: null,
    friendlySide: GameSide.Player,
    objectives: { '0,0': marker({ controlSide: 'player', holdProgress: 0 }) },
  },
};

export const MixedObjectiveTypes: Story = {
  args: {
    radius: 5,
    tokens: [],
    selectedHex: null,
    friendlySide: GameSide.Player,
    objectives: {
      '0,0': marker({
        id: 'objective-1',
        hexKey: '0,0',
        objectiveType: 'capture',
        controlSide: 'player',
        holdProgress: 1,
      }),
      '2,-1': marker({
        id: 'objective-2',
        hexKey: '2,-1',
        objectiveType: 'defend',
        controlSide: 'opponent',
      }),
      '-2,3': marker({
        id: 'objective-3',
        hexKey: '-2,3',
        objectiveType: 'breakthrough',
        controlSide: 'neutral',
      }),
    },
  },
};
