import type { Meta, StoryObj } from '@storybook/react';
import type { ReactElement } from 'react';

import { fn } from '@storybook/test';

import {
  Facing,
  GameEventType,
  GamePhase,
  GameSide,
  InfantryMotiveType,
  InfantryTokenSpecialization,
  TokenUnitType,
  VehicleMotionType,
  type IGameEvent,
  type IUnitToken,
} from '@/types/gameplay';

import { UnitTokenForType } from './UnitTokenForType';

const tokenEvents: readonly IGameEvent[] = [
  {
    id: 'floater-damage',
    gameId: 'story-game',
    sequence: 21,
    timestamp: '2026-04-29T03:11:00.000Z',
    type: GameEventType.DamageApplied,
    turn: 2,
    phase: GamePhase.WeaponAttack,
    payload: {
      unitId: 'token-mech',
      location: 'center_torso',
      damage: 12,
      armorRemaining: 9,
      structureRemaining: 31,
      locationDestroyed: false,
      sourceUnitId: 'token-vehicle',
      attackId: 'story-attack',
    },
  },
  {
    id: 'floater-crit',
    gameId: 'story-game',
    sequence: 22,
    timestamp: '2026-04-29T03:11:05.000Z',
    type: GameEventType.CriticalHitResolved,
    turn: 2,
    phase: GamePhase.WeaponAttack,
    payload: {
      unitId: 'token-mech',
      location: 'center_torso',
      slotIndex: 4,
      componentType: 'engine',
      componentName: 'Fusion Engine',
      effect: 'Engine hit',
      destroyed: false,
    },
  },
];

const tokens: readonly IUnitToken[] = [
  {
    unitId: 'token-mech',
    name: 'Atlas AS7-D',
    designation: 'AS7',
    side: GameSide.Player,
    position: { q: 0, r: 0 },
    facing: Facing.North,
    isSelected: true,
    isValidTarget: false,
    isDestroyed: false,
    unitType: TokenUnitType.Mech,
  },
  {
    unitId: 'token-vehicle',
    name: 'Schrek PPC Carrier',
    designation: 'SRK',
    side: GameSide.Opponent,
    position: { q: 1, r: -1 },
    facing: Facing.South,
    isSelected: false,
    isValidTarget: true,
    isActiveTarget: true,
    isDestroyed: false,
    unitType: TokenUnitType.Vehicle,
    vehicleMotionType: VehicleMotionType.Tracked,
    turretFacing: Facing.South,
  },
  {
    unitId: 'token-aero',
    name: 'Seydlitz SYD-21',
    designation: 'SYD',
    side: GameSide.Player,
    position: { q: -1, r: 0 },
    facing: Facing.Northeast,
    isSelected: false,
    isValidTarget: false,
    isDestroyed: false,
    unitType: TokenUnitType.Aerospace,
    altitude: 5,
    velocity: 8,
  },
  {
    unitId: 'token-ba',
    name: 'Elemental Point',
    designation: 'BA',
    side: GameSide.Player,
    position: { q: 0, r: 1 },
    facing: Facing.North,
    isSelected: false,
    isValidTarget: false,
    isDestroyed: false,
    unitType: TokenUnitType.BattleArmor,
    trooperCount: 4,
    jumpActive: true,
    mountedOn: 'token-mech',
  },
  {
    unitId: 'token-infantry',
    name: 'Rifle Platoon',
    designation: 'INF',
    side: GameSide.Opponent,
    position: { q: -1, r: 1 },
    facing: Facing.Northwest,
    isSelected: false,
    isValidTarget: true,
    isDestroyed: false,
    unitType: TokenUnitType.Infantry,
    infantryCount: 21,
    platoonCount: 2,
    infantryMotiveType: InfantryMotiveType.Jump,
    infantrySpecialization: InfantryTokenSpecialization.AntiMech,
  },
  {
    unitId: 'token-proto',
    name: 'Roc Point',
    designation: 'ROC',
    side: GameSide.Player,
    position: { q: 1, r: 0 },
    facing: Facing.Southeast,
    isSelected: false,
    isValidTarget: false,
    isDestroyed: false,
    unitType: TokenUnitType.ProtoMech,
    protoCount: 3,
    isGlider: true,
    hasMainGun: true,
  },
];

const TokenCanvas = ({
  visibleTokens,
}: {
  visibleTokens: readonly IUnitToken[];
}): ReactElement => (
  <svg
    width="520"
    height="420"
    viewBox="-180 -150 360 300"
    role="img"
    aria-label="Unit token variants"
    className="rounded-lg bg-slate-950"
  >
    <g>
      {visibleTokens.map((token) => (
        <UnitTokenForType
          key={token.unitId}
          token={token}
          onClick={fn()}
          onDoubleClick={fn()}
          events={tokenEvents}
          allTokens={visibleTokens}
        />
      ))}
    </g>
  </svg>
);

const meta: Meta<typeof UnitTokenForType> = {
  title: 'Gameplay/UnitTokenForType',
  component: UnitTokenForType,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof UnitTokenForType>;

export const AllUnitTypes: Story = {
  render: () => <TokenCanvas visibleTokens={tokens} />,
};

export const DestroyedVehicle: Story = {
  render: () => (
    <TokenCanvas
      visibleTokens={[
        {
          ...tokens[1],
          unitId: 'token-destroyed-vehicle',
          isDestroyed: true,
          isValidTarget: false,
          isActiveTarget: false,
        },
      ]}
    />
  ),
};

export const MountedBattleArmor: Story = {
  render: () => <TokenCanvas visibleTokens={[tokens[0], tokens[3]]} />,
};
