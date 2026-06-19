import { act, fireEvent, render, screen } from '@testing-library/react';

import type { IGameEvent, IUnitToken, IWeaponStatus } from '@/types/gameplay';

import { hexToPixel } from '@/components/gameplay/HexMapDisplay/renderHelpers';
import { useAnimationQueue } from '@/stores/useAnimationQueue';
import {
  Facing,
  GameEventType,
  GamePhase,
  GameSide,
  MovementType,
  TerrainType,
  TokenUnitType,
  VehicleMotionType,
} from '@/types/gameplay';

import { HexMapDisplay } from '../HexMapDisplay';

function makeToken(overrides: Partial<IUnitToken>): IUnitToken {
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

function makeEvent(
  type: GameEventType,
  payload: IGameEvent['payload'],
  sequence = 1,
): IGameEvent {
  return {
    id: `${type}-${sequence}`,
    gameId: 'game',
    sequence,
    timestamp: `2026-04-29T00:00:0${sequence}.000Z`,
    type,
    turn: 1,
    phase: GamePhase.WeaponAttack,
    payload,
  };
}

function makeWeapon(overrides: Partial<IWeaponStatus> = {}): IWeaponStatus {
  return {
    id: 'medium-laser',
    name: 'Medium Laser',
    location: 'center_torso',
    destroyed: false,
    firedThisTurn: false,
    heat: 3,
    damage: 5,
    ranges: { short: 3, medium: 6, long: 9 },
    ...overrides,
  };
}

export {
  Facing,
  GameEventType,
  GamePhase,
  GameSide,
  HexMapDisplay,
  MovementType,
  TerrainType,
  TokenUnitType,
  VehicleMotionType,
  act,
  fireEvent,
  hexToPixel,
  makeEvent,
  makeToken,
  makeWeapon,
  render,
  screen,
  useAnimationQueue,
};

export type { IGameEvent, IUnitToken, IWeaponStatus };
