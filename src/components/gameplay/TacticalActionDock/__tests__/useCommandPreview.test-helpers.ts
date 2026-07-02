/**
 * useCommandPreview / buildCommandPreview — pure projection tests.
 *
 * Verifies the spec's `Command Preview Lifecycle` requirement:
 *   - Movement preview reads from the existing path/MP projection.
 *   - Attack preview surfaces the targetUnitId + to-hit when a target
 *     is selected.
 *   - Cancel (passing null command) clears the preview.
 *
 * @spec openspec/changes/add-tactical-action-menu-system/specs/tactical-map-interface/spec.md
 */

import type {
  IPhysicalAttackOption,
  PhysicalAttackInvalidReason,
  PhysicalAttackType,
} from '@/utils/gameplay/physicalAttacks/types';

import {
  CoverLevel,
  GamePhase,
  MovementType,
  RangeBracket,
  type ITacticalCommandContext,
  type ICombatRangeHex,
  type IMovementRangeHex,
  type IWeaponStatus,
} from '@/types/gameplay';

import { buildMovementCommands } from '../commands/movementCommands';
import { buildPhysicalAttackCommands } from '../commands/physicalAttackCommands';
import { buildWeaponAttackCommands } from '../commands/weaponAttackCommands';
import { buildCommandPreview } from '../useCommandPreview';

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
    rangeBracket: RangeBracket.Short,
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
        rangeBracket: RangeBracket.Short,
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

// tactical-movement-intent-composer removed the Walk verb; the movement command
// PREVIEW machinery (buildMovementPreview fires for any `category: 'movement'`
// command) is unchanged, so any remaining movement command exercises it. Evade
// is the surviving movement-category command in the dock.
const walk = buildMovementCommands().find((c) => c.id === 'movement.evade')!;
const fire = buildWeaponAttackCommands().find(
  (c) => c.id === 'weapon.fire-volley',
)!;
const punch = buildPhysicalAttackCommands().find(
  (c) => c.id === 'physical.punch',
)!;
const charge = buildPhysicalAttackCommands().find(
  (c) => c.id === 'physical.charge',
)!;

export {
  CoverLevel,
  GamePhase,
  MovementType,
  RangeBracket,
  buildCommandPreview,
  buildMovementCommands,
  buildPhysicalAttackCommands,
  buildWeaponAttackCommands,
  charge,
  fire,
  makeCombatInfo,
  makeCtx,
  makePhysicalOption,
  makeWeapon,
  punch,
  walk,
};

export type {
  ICombatRangeHex,
  IMovementRangeHex,
  IPhysicalAttackOption,
  ITacticalCommandContext,
  IWeaponStatus,
  PhysicalAttackInvalidReason,
  PhysicalAttackType,
};
