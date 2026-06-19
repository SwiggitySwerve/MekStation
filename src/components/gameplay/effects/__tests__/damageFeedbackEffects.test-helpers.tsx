import { act, render, screen, within } from '@testing-library/react';
import React from 'react';

import type {
  ArmorPipState,
  BipedPipLocation,
  ICriticalHitResolvedPayload,
  IDamageAppliedPayload,
  IGameEvent,
  ILocationDestroyedPayload,
  IUnitDestroyedPayload,
  IUnitToken,
  PipLocationState,
} from '@/types/gameplay';

import {
  effectAnchorForLocation,
  type EffectLocation,
} from '@/components/gameplay/effects/damageEffectHelpers';
import { DebrisCloud } from '@/components/gameplay/effects/DebrisCloud';
import { EngineFire } from '@/components/gameplay/effects/EngineFire';
import { HitLocationFlash } from '@/components/gameplay/effects/HitLocationFlash';
import {
  DamageEffectDefinitions,
  PersistentEffectsLayer,
} from '@/components/gameplay/effects/PersistentEffectsLayer';
import { SmokePuff } from '@/components/gameplay/effects/SmokePuff';
import { HexMapDisplay } from '@/components/gameplay/HexMapDisplay';
import { hexToPixel } from '@/components/gameplay/HexMapDisplay/renderHelpers';
import { TokenUnitType } from '@/types/gameplay';
import { Facing, GameEventType, GamePhase, GameSide } from '@/types/gameplay';

interface DamageAppliedPayloadWithTransfer extends IDamageAppliedPayload {
  readonly fromLocation: string;
  readonly toLocation: string;
}

function svgRender(ui: React.ReactElement): ReturnType<typeof render> {
  return render(<svg>{ui}</svg>);
}

function buildEvent(
  id: string,
  type: GameEventType,
  payload: IGameEvent['payload'],
  sequence = 1,
): IGameEvent {
  return {
    id,
    gameId: 'g1',
    sequence,
    timestamp: `2026-01-01T00:00:0${sequence}.000Z`,
    type,
    turn: 1,
    phase: GamePhase.WeaponAttack,
    payload,
  };
}

function damagePayload(
  overrides: Partial<IDamageAppliedPayload> = {},
): IDamageAppliedPayload {
  return {
    unitId: 'u1',
    location: 'right_arm',
    damage: 7,
    armorRemaining: 3,
    structureRemaining: 8,
    locationDestroyed: false,
    ...overrides,
  };
}

function locationDestroyedPayload(
  overrides: Partial<ILocationDestroyedPayload> = {},
): ILocationDestroyedPayload {
  return {
    unitId: 'u1',
    location: 'left_arm',
    ...overrides,
  };
}

function engineCritPayload(
  overrides: Partial<ICriticalHitResolvedPayload> = {},
): ICriticalHitResolvedPayload {
  return {
    unitId: 'u1',
    location: 'center_torso',
    slotIndex: 3,
    componentType: 'engine',
    componentName: 'Fusion Engine',
    effect: 'engine_hit',
    destroyed: false,
    ...overrides,
  };
}

function unitDestroyedPayload(
  overrides: Partial<IUnitDestroyedPayload> = {},
): IUnitDestroyedPayload {
  return {
    unitId: 'u1',
    cause: 'damage',
    ...overrides,
  };
}

function token(overrides: Partial<IUnitToken> = {}): IUnitToken {
  // Default to the Mech variant — discriminated union narrowing is preserved
  // when overrides supply a different unitType (cast at the boundary because
  // TS can't statically verify the merged literal matches a single variant).
  return {
    unitId: 'u1',
    name: 'Atlas',
    side: GameSide.Player,
    position: { q: 0, r: 0 },
    facing: Facing.North,
    isSelected: false,
    isValidTarget: false,
    isDestroyed: false,
    designation: 'ATL',
    unitType: TokenUnitType.Mech,
    ...overrides,
  } as IUnitToken;
}

function uniformBipedLocations(
  state: PipLocationState,
): Record<BipedPipLocation, PipLocationState> {
  return {
    head: state,
    centerTorso: state,
    leftTorso: state,
    rightTorso: state,
    leftArm: state,
    rightArm: state,
    leftLeg: state,
    rightLeg: state,
  };
}

function armorStateWithDestroyed(location: BipedPipLocation): ArmorPipState {
  return {
    archetype: 'humanoid',
    locations: {
      ...uniformBipedLocations('full'),
      [location]: 'destroyed',
    },
  };
}

function expectedSmokeTransform(
  position: IUnitToken['position'],
  location: EffectLocation,
): string {
  const pixel = hexToPixel(position);
  const anchor = effectAnchorForLocation(location);
  return `translate(${pixel.x + anchor.x}, ${pixel.y + anchor.y}) scale(1)`;
}

export {
  DamageEffectDefinitions,
  DebrisCloud,
  EngineFire,
  Facing,
  GameEventType,
  GamePhase,
  GameSide,
  HexMapDisplay,
  HitLocationFlash,
  PersistentEffectsLayer,
  React,
  SmokePuff,
  TokenUnitType,
  act,
  armorStateWithDestroyed,
  buildEvent,
  damagePayload,
  effectAnchorForLocation,
  engineCritPayload,
  expectedSmokeTransform,
  hexToPixel,
  locationDestroyedPayload,
  render,
  screen,
  svgRender,
  token,
  uniformBipedLocations,
  unitDestroyedPayload,
  within,
};

export type {
  ArmorPipState,
  BipedPipLocation,
  DamageAppliedPayloadWithTransfer,
  EffectLocation,
  ICriticalHitResolvedPayload,
  IDamageAppliedPayload,
  IGameEvent,
  ILocationDestroyedPayload,
  IUnitDestroyedPayload,
  IUnitToken,
  PipLocationState,
};
