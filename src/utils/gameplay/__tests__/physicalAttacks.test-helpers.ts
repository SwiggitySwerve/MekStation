import { ActuatorType } from '@/types/construction/MechConfigurationSystem';
import {
  Facing,
  GameEventType,
  GamePhase,
  GameSide,
  IComponentDamageState,
  IHexGrid,
  IUnitGameState,
  LockState,
  MovementType,
} from '@/types/gameplay';
import { GroundMotionType } from '@/types/unit/BaseUnitInterfaces';
import { UnitType } from '@/types/unit/BattleMechInterfaces';

import {
  calculatePunchDamage,
  calculateKickDamage,
  calculateChargeDamageToTarget,
  calculateChargeDamageToAttacker,
  calculateDFADamageToTarget,
  calculateDFADamageToAttacker,
  calculateFlailDamage,
  calculateHatchetDamage,
  calculateSwordDamage,
  calculateMaceDamage,
  calculateRetractableBladeDamage,
  calculateWreckingBallDamage,
  calculateThrashDamage,
  calculateBrushOffAttackDamage,
  calculatePunchToHit,
  calculateKickToHit,
  calculateChargeToHit,
  calculateDFAToHit,
  calculatePushToHit,
  calculateTripToHit,
  calculateThrashToHit,
  calculateGrappleToHit,
  calculateBreakGrappleToHit,
  calculateMeleeWeaponToHit,
  calculatePhysicalToHit,
  calculatePhysicalDamage,
  getPhysicalMissConsequences,
  resolveDfaMissFallPilotDamageAvoidance,
  canPunch,
  canKick,
  canCharge,
  canDFA,
  canMeleeWeapon,
  canPush,
  canBrushOffPhysical,
  canTripPhysical,
  canThrashPhysical,
  canGrapplePhysical,
  canBreakGrapplePhysical,
  canJumpJetAttackPhysical,
  canThrash,
  canTrip,
  computeDisplacementWithDominoChain,
  computeChargeDisplacementOutcome,
  computeBreakGrappleDisplacementOutcome,
  computeDfaDisplacementOutcome,
  computeDfaDisplacements,
  computePreferredDisplacement,
  computeValidDisplacement,
  BATTLEMECH_MAX_DISPLACEMENT_ELEVATION_CHANGE,
  isTargetDirectlyAhead,
  getEffectiveWeight,
  applyUnderwaterModifier,
  determinePhysicalHitLocation,
  resolvePhysicalAttack,
  chooseBestPhysicalAttack,
  PUNCH_HIT_TABLE,
  KICK_HIT_TABLE,
  TSM_ACTIVATION_HEAT,
  IPhysicalAttackInput,
  isPhysicalAirborneVtolOrWigeTarget,
  isThrashAttackAutomaticSuccess,
  sourceContainsGroundedDropShip,
  canBreakGrapple,
  canBrushOff,
  canGrapple,
  getBreakGrappleAttackToHitModifiers,
  getBreakGrappleWeightClassModifier,
  getBrushOffAttackToHitModifiers,
  getGrappleAttackToHitModifiers,
  canJumpJetAttack,
  getJumpJetAttackDamage,
  getJumpJetAttackToHitModifiers,
  getThrashAttackDamageForWeight,
  getTripAttackBaseToHitAdjustment,
  getEligiblePhysicalAttacks,
  SUPPORTED_PHYSICAL_WEAPON_ATTACK_TYPES,
} from '../physicalAttacks';

export const DEFAULT_COMPONENT_DAMAGE: IComponentDamageState = {
  engineHits: 0,
  gyroHits: 0,
  sensorHits: 0,
  lifeSupport: 0,
  cockpitHit: false,
  actuators: {},
  weaponsDestroyed: [],
  heatSinksDestroyed: 0,
  jumpJetsDestroyed: 0,
};

export function makeInput(
  overrides: Partial<IPhysicalAttackInput> = {},
): IPhysicalAttackInput {
  return {
    attackerTonnage: 80,
    pilotingSkill: 5,
    componentDamage: DEFAULT_COMPONENT_DAMAGE,
    attackType: 'punch',
    ...overrides,
  };
}

export function makePhysicalProjectionUnit(
  id: string,
  side: GameSide,
  position: { q: number; r: number },
  overrides: Partial<IUnitGameState> = {},
): IUnitGameState {
  return {
    id,
    side,
    position,
    facing: Facing.South,
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
    prone: false,
    ...overrides,
  };
}

export function makeDiceSequence(values: number[]) {
  let i = 0;
  return () => {
    if (i >= values.length) return values[values.length - 1];
    return values[i++];
  };
}

export function makeDisplacementGrid(): IHexGrid {
  const hexes = new Map();
  hexes.set('0,0', {
    coord: { q: 0, r: 0 },
    occupantId: 'attacker',
    terrain: 'clear',
    elevation: 0,
  });
  hexes.set('1,0', {
    coord: { q: 1, r: 0 },
    occupantId: 'target',
    terrain: 'clear',
    elevation: 0,
  });
  hexes.set('1,1', {
    coord: { q: 1, r: 1 },
    occupantId: null,
    terrain: 'clear',
    elevation: 0,
  });
  hexes.set('2,0', {
    coord: { q: 2, r: 0 },
    occupantId: null,
    terrain: 'clear',
    elevation: 2,
  });
  hexes.set('0,1', {
    coord: { q: 0, r: 1 },
    occupantId: null,
    terrain: 'clear',
    elevation: 1,
  });
  return { config: { radius: 2 }, hexes };
}

export function makeBreakGrappleGrid(): IHexGrid {
  const hexes = new Map();
  const addHex = (
    q: number,
    r: number,
    terrain: string,
    elevation: number,
    occupantId: string | null = null,
  ) => {
    hexes.set(`${q},${r}`, {
      coord: { q, r },
      occupantId,
      terrain,
      elevation,
    });
  };

  addHex(0, 0, 'clear', 0, 'attacker');
  addHex(0, -1, 'clear', 0);
  addHex(1, -1, 'water:2', 0);
  addHex(1, 0, 'magma', 0);
  addHex(0, 1, 'clear', -2);
  addHex(-1, 1, 'water:1', -2);
  addHex(-1, 0, 'clear', 0);
  return { config: { radius: 2 }, hexes };
}

export function makeDropShipRadiusDisplacementGrid(
  primaryRadiusTwoTerrain = 'clear',
): IHexGrid {
  const hexes = new Map();
  const coords = [
    { q: 0, r: 0 },
    { q: 0, r: 1 },
    { q: 0, r: 2 },
    { q: -1, r: 2 },
    { q: -2, r: 2 },
    { q: -2, r: 1 },
    { q: 2, r: 0 },
    { q: 1, r: 1 },
    { q: -2, r: 0 },
    { q: -1, r: -1 },
    { q: 2, r: -2 },
    { q: 2, r: -1 },
    { q: 0, r: -2 },
    { q: 1, r: -2 },
  ];

  for (const coord of coords) {
    const key = `${coord.q},${coord.r}`;
    hexes.set(key, {
      coord,
      occupantId: coord.q === 0 && coord.r === 0 ? 'target' : null,
      terrain: key === '0,2' ? primaryRadiusTwoTerrain : 'clear',
      elevation: 0,
    });
  }

  return { config: { radius: 2 }, hexes };
}

export function makeBlockedDfaDisplacementGrid(): IHexGrid {
  const grid = makeDisplacementGrid();
  const hexes = new Map(grid.hexes);
  for (const key of ['1,1', '2,0', '0,1']) {
    const hex = hexes.get(key);
    if (hex) {
      hexes.set(key, { ...hex, occupantId: `blocker-${key}` });
    }
  }
  return { ...grid, hexes };
}

export function makeBlockedChargeDisplacementGrid(): IHexGrid {
  const grid = makeDisplacementGrid();
  const hexes = new Map(grid.hexes);
  const hex = hexes.get('1,1');
  if (hex) {
    hexes.set('1,1', { ...hex, occupantId: 'charge-blocker' });
  }
  return { ...grid, hexes };
}

export function makeDominoDisplacementGrid(): IHexGrid {
  const grid = makeDisplacementGrid();
  const hexes = new Map(grid.hexes);
  const blockedDestination = hexes.get('1,1');
  if (blockedDestination) {
    hexes.set('1,1', {
      ...blockedDestination,
      occupantId: 'domino-blocker',
    });
  }
  hexes.set('1,2', {
    coord: { q: 1, r: 2 },
    occupantId: null,
    terrain: 'clear',
    elevation: 0,
  });
  return { ...grid, hexes };
}

export function makeFriendlyPreferredDisplacementGrid(): IHexGrid {
  const grid = makeDisplacementGrid();
  const hexes = new Map(grid.hexes);
  const friendlyDestination = hexes.get('1,1');
  const alternateDestination = hexes.get('0,1');
  if (friendlyDestination) {
    hexes.set('1,1', {
      ...friendlyDestination,
      occupantId: 'target-friend',
    });
  }
  if (alternateDestination) {
    hexes.set('0,1', {
      ...alternateDestination,
      elevation: 0,
    });
  }
  hexes.set('1,2', {
    coord: { q: 1, r: 2 },
    occupantId: null,
    terrain: 'clear',
    elevation: 0,
  });
  return { ...grid, hexes };
}

export function makeProhibitedChargeDisplacementGrid(
  terrain: string = 'impassable',
): IHexGrid {
  const grid = makeDisplacementGrid();
  const hexes = new Map(grid.hexes);
  const hex = hexes.get('1,1');
  if (hex) {
    hexes.set('1,1', { ...hex, terrain });
  }
  return { ...grid, hexes };
}

export function terrainFeature(type: string, level: number): string {
  return JSON.stringify([{ type, level }]);
}

// =============================================================================
// Punch Damage Tests
// =============================================================================

export { ActuatorType } from '@/types/construction/MechConfigurationSystem';
export {
  Facing,
  GameEventType,
  GamePhase,
  GameSide,
  LockState,
  MovementType,
} from '@/types/gameplay';
export type {
  IComponentDamageState,
  IHexGrid,
  IUnitGameState,
} from '@/types/gameplay';
export { GroundMotionType } from '@/types/unit/BaseUnitInterfaces';
export { UnitType } from '@/types/unit/BattleMechInterfaces';
export {
  calculatePunchDamage,
  calculateKickDamage,
  calculateChargeDamageToTarget,
  calculateChargeDamageToAttacker,
  calculateDFADamageToTarget,
  calculateDFADamageToAttacker,
  calculateFlailDamage,
  calculateHatchetDamage,
  calculateSwordDamage,
  calculateMaceDamage,
  calculateRetractableBladeDamage,
  calculateWreckingBallDamage,
  calculateThrashDamage,
  calculateBrushOffAttackDamage,
  calculatePunchToHit,
  calculateKickToHit,
  calculateChargeToHit,
  calculateDFAToHit,
  calculatePushToHit,
  calculateTripToHit,
  calculateThrashToHit,
  calculateGrappleToHit,
  calculateBreakGrappleToHit,
  calculateMeleeWeaponToHit,
  calculatePhysicalToHit,
  calculatePhysicalDamage,
  getPhysicalMissConsequences,
  resolveDfaMissFallPilotDamageAvoidance,
  canPunch,
  canKick,
  canCharge,
  canDFA,
  canMeleeWeapon,
  canPush,
  canBrushOffPhysical,
  canTripPhysical,
  canThrashPhysical,
  canGrapplePhysical,
  canBreakGrapplePhysical,
  canJumpJetAttackPhysical,
  canThrash,
  canTrip,
  computeDisplacementWithDominoChain,
  computeChargeDisplacementOutcome,
  computeBreakGrappleDisplacementOutcome,
  computeDfaDisplacementOutcome,
  computeDfaDisplacements,
  computePreferredDisplacement,
  computeValidDisplacement,
  BATTLEMECH_MAX_DISPLACEMENT_ELEVATION_CHANGE,
  isTargetDirectlyAhead,
  getEffectiveWeight,
  applyUnderwaterModifier,
  determinePhysicalHitLocation,
  resolvePhysicalAttack,
  chooseBestPhysicalAttack,
  PUNCH_HIT_TABLE,
  KICK_HIT_TABLE,
  TSM_ACTIVATION_HEAT,
  isPhysicalAirborneVtolOrWigeTarget,
  isThrashAttackAutomaticSuccess,
  sourceContainsGroundedDropShip,
  canBreakGrapple,
  canBrushOff,
  canGrapple,
  getBreakGrappleAttackToHitModifiers,
  getBreakGrappleWeightClassModifier,
  getBrushOffAttackToHitModifiers,
  getGrappleAttackToHitModifiers,
  canJumpJetAttack,
  getJumpJetAttackDamage,
  getJumpJetAttackToHitModifiers,
  getThrashAttackDamageForWeight,
  getTripAttackBaseToHitAdjustment,
  getEligiblePhysicalAttacks,
  SUPPORTED_PHYSICAL_WEAPON_ATTACK_TYPES,
} from '../physicalAttacks';
export type { IPhysicalAttackInput } from '../physicalAttacks';
