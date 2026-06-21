/**
 * TacticalActionDock — component test.
 *
 * Verifies the dock renders commands grouped by category, marks
 * disabled commands as disabled with an accessible reason, dispatches
 * actionId through onAction, and routes requiresConfirmation through
 * the confirm gate.
 *
 * @spec openspec/changes/add-tactical-action-menu-system/specs/tactical-map-interface/spec.md
 */

import { fireEvent, render, screen } from '@testing-library/react';

import type { IPhysicalAttackOption } from '@/utils/gameplay/physicalAttacks/types';

import {
  CoverLevel,
  GamePhase,
  MovementType,
  RangeBracket,
  type ICombatRangeHex,
  type IMovementRangeHex,
  type ITacticalCommandContext,
  type IWeaponStatus,
} from '@/types/gameplay';

import { TacticalActionDock } from '../TacticalActionDock';

function makeCtx(
  overrides: Partial<ITacticalCommandContext> = {},
): ITacticalCommandContext {
  return {
    activeUnitId: 'unit-a',
    selectedUnitId: 'unit-a',
    targetUnitId: null,
    hoveredHex: null,
    phase: GamePhase.Movement,
    canAct: true,
    ...overrides,
  };
}

function makeCombatInfo(
  overrides: Partial<ICombatRangeHex> = {},
): ICombatRangeHex {
  return {
    hex: { q: 2, r: 0 },
    distance: 2,
    rangeBracket: RangeBracket.Medium,
    inRange: true,
    inArc: true,
    losState: 'clear',
    targetCoverLevel: CoverLevel.None,
    targetPartialCover: false,
    targetCoverModifier: 0,
    firingArc: 'front',
    hasTarget: true,
    targetVisibilityState: 'visible',
    visibleTargetUnitIds: ['enemy-x'],
    obscuredTargetUnitIds: [],
    attackable: true,
    weaponIdsInRange: ['medium-laser'],
    weaponIdsInArc: ['medium-laser'],
    weaponIdsAvailable: ['medium-laser'],
    weaponRangeOptions: [
      {
        weaponId: 'medium-laser',
        weaponName: 'Medium Laser',
        heat: 3,
        damage: 5,
        ammoConsumed: 0,
        rangeBracket: RangeBracket.Medium,
        inRange: true,
        inArc: true,
        environmentLegal: true,
        available: true,
      },
    ],
    availableWeaponImpacts: [
      {
        weaponId: 'medium-laser',
        weaponName: 'Medium Laser',
        heat: 3,
        damage: 5,
        ammoConsumed: 0,
      },
    ],
    availableWeaponHeat: 3,
    availableWeaponDamage: 5,
    expectedDamage: 2.1,
    targetUnitIds: ['enemy-x'],
    validTargetUnitIds: ['enemy-x'],
    toHitNumber: 8,
    ...overrides,
  };
}

function makeWeapon(overrides: Partial<IWeaponStatus> = {}): IWeaponStatus {
  return {
    id: 'medium-laser',
    name: 'Medium Laser',
    location: 'right_arm',
    destroyed: false,
    firedThisTurn: false,
    heat: 3,
    damage: 5,
    ranges: { short: 3, medium: 6, long: 9 },
    ...overrides,
  };
}

function makeMovementInfo(
  overrides: Partial<IMovementRangeHex> = {},
): IMovementRangeHex {
  return {
    hex: { q: 4, r: 0 },
    mpCost: 6,
    terrainCost: 1,
    turningCost: 1,
    elevationDelta: 2,
    elevationCost: 2,
    heatGenerated: 2,
    movementMode: 'walk',
    reachable: false,
    movementType: MovementType.Run,
    blockedReason: 'Destination is blocked by terrain',
    movementInvalidReason: 'InsufficientMP',
    movementInvalidDetails: 'Destination is blocked by terrain',
    ...overrides,
  };
}

function makePhysicalOption(
  overrides: Partial<IPhysicalAttackOption> = {},
): IPhysicalAttackOption {
  return {
    attackType: 'punch',
    limb: 'rightArm',
    toHit: {
      baseToHit: 4,
      finalToHit: 6,
      modifiers: [],
      allowed: true,
    },
    damage: {
      targetDamage: 7,
      attackerDamage: 0,
      attackerLegDamagePerLeg: 0,
      targetPSR: false,
      attackerPSR: false,
      attackerPSRModifier: 0,
      hitTable: 'punch',
      targetDisplaced: false,
    },
    selfRisk: {
      damageToAttacker: 0,
      legDamagePerLeg: 0,
      pilotingSkillRoll: null,
      onMiss: null,
    },
    restrictionsFailed: [],
    ...overrides,
  };
}

export {
  CoverLevel,
  GamePhase,
  MovementType,
  RangeBracket,
  TacticalActionDock,
  fireEvent,
  makeCombatInfo,
  makeCtx,
  makeMovementInfo,
  makePhysicalOption,
  makeWeapon,
  render,
  screen,
};

export type {
  ICombatRangeHex,
  IMovementRangeHex,
  IPhysicalAttackOption,
  ITacticalCommandContext,
  IWeaponStatus,
};
