import type { IApplyAttackInput } from '@/engine/InteractiveSession.actions';
import type { IGameState, IUnitToken } from '@/types/gameplay';

import { VehicleLocation } from '@/types/construction/UnitLocation';
import { FiringArc, TokenUnitType, VehicleMotionType } from '@/types/gameplay';
import { GroundMotionType } from '@/types/unit/BaseUnitInterfaces';
import { TurretType } from '@/types/unit/VehicleInterfaces';
import { createVehicleCombatState } from '@/utils/gameplay/vehicleDamage';
import { getVehicleWeaponArcs } from '@/utils/gameplay/vehicleFiringArc';

import {
  tacticalMapAttackerToken,
  tacticalMapCombatProjection,
  tacticalMapCombatStateForTokens,
  tacticalMapCommitInput,
  tacticalMapTargetToken,
  tacticalMapUnitWeapons,
  tacticalMapWeapon,
} from './tactical-map.arc-scenario-helpers';
import { tacticalMapCombatGrid } from './tactical-map.combat-scenarios';

export const tacticalMapOutOfArcTargetId = 'rear-arc-target';
export const tacticalMapOutOfArcTargetHex = { q: 0, r: 1 } as const;
export const tacticalMapOutOfArcSelectedWeaponIds = ['front-arc-laser'];
export const tacticalMapSponsonArcTargetId = 'left-arc-target';
export const tacticalMapSponsonArcTargetHex = { q: -2, r: 2 } as const;
export const tacticalMapSponsonArcSelectedWeaponIds = ['left-sponson-laser'];
export const tacticalMapRightSponsonArcTargetId = 'right-arc-target';
export const tacticalMapRightSponsonArcTargetHex = { q: 3, r: -2 } as const;
export const tacticalMapRightSponsonArcSelectedWeaponIds = [
  'right-sponson-laser',
];
export const tacticalMapLockedTurretTargetId = 'locked-turret-side-target';
export const tacticalMapLockedTurretTargetHex = { q: -2, r: 2 } as const;
export const tacticalMapLockedTurretSelectedWeaponIds = ['locked-turret-ppc'];
export const tacticalMapChinTurretPivotTargetId = 'chin-turret-target';
export const tacticalMapChinTurretPivotTargetHex = { q: -2, r: 2 } as const;
export const tacticalMapChinTurretPivotSelectedWeaponIds = [
  'chin-turret-laser',
];

const tacticalMapLeftSponsonArcs = getVehicleWeaponArcs({
  mountLocation: VehicleLocation.LEFT,
  isTurretMounted: false,
  isSponsonMounted: true,
  turretLocked: false,
});

const tacticalMapRightSponsonArcs = getVehicleWeaponArcs({
  mountLocation: VehicleLocation.RIGHT,
  isTurretMounted: false,
  isSponsonMounted: true,
  turretLocked: false,
});

const tacticalMapLockedTurretArcs = getVehicleWeaponArcs({
  mountLocation: VehicleLocation.TURRET,
  isTurretMounted: true,
  isSponsonMounted: false,
  turretType: TurretType.SINGLE,
  turretLocked: true,
});

const tacticalMapChinTurretArcs = getVehicleWeaponArcs({
  mountLocation: VehicleLocation.TURRET,
  isTurretMounted: true,
  isSponsonMounted: false,
  turretType: TurretType.CHIN,
  turretLocked: false,
});

export const tacticalMapOutOfArcTokens: readonly IUnitToken[] = [
  tacticalMapAttackerToken({
    name: 'Shadow Hawk SHD-2H',
    designation: 'SHD',
    unitType: TokenUnitType.Mech,
  }),
  tacticalMapTargetToken({
    unitId: tacticalMapOutOfArcTargetId,
    name: 'Rear Arc Target',
    designation: 'RAT',
    position: tacticalMapOutOfArcTargetHex,
  }),
];

export const tacticalMapSponsonArcTokens: readonly IUnitToken[] = [
  tacticalMapAttackerToken({
    name: 'Vedette Left Sponson',
    designation: 'VDS',
    unitType: TokenUnitType.Vehicle,
    vehicleMotionType: VehicleMotionType.Tracked,
  }),
  tacticalMapTargetToken({
    unitId: tacticalMapSponsonArcTargetId,
    name: 'Left Arc Target',
    designation: 'LAT',
    position: tacticalMapSponsonArcTargetHex,
  }),
];

export const tacticalMapRightSponsonArcTokens: readonly IUnitToken[] = [
  tacticalMapAttackerToken({
    name: 'Vedette Right Sponson',
    designation: 'VRS',
    unitType: TokenUnitType.Vehicle,
    vehicleMotionType: VehicleMotionType.Tracked,
  }),
  tacticalMapTargetToken({
    unitId: tacticalMapRightSponsonArcTargetId,
    name: 'Right Arc Target',
    designation: 'RAT',
    position: tacticalMapRightSponsonArcTargetHex,
  }),
];

export const tacticalMapLockedTurretTokens: readonly IUnitToken[] = [
  tacticalMapAttackerToken({
    name: 'Locked Turret Carrier',
    designation: 'LTC',
    unitType: TokenUnitType.Vehicle,
    vehicleMotionType: VehicleMotionType.Tracked,
  }),
  tacticalMapTargetToken({
    unitId: tacticalMapLockedTurretTargetId,
    name: 'Locked Turret Side Target',
    designation: 'LST',
    position: tacticalMapLockedTurretTargetHex,
  }),
];

export const tacticalMapChinTurretPivotTokens: readonly IUnitToken[] = [
  tacticalMapAttackerToken({
    name: 'Chin Turret Carrier',
    designation: 'CTC',
    unitType: TokenUnitType.Vehicle,
    vehicleMotionType: VehicleMotionType.Tracked,
  }),
  tacticalMapTargetToken({
    unitId: tacticalMapChinTurretPivotTargetId,
    name: 'Chin Turret Target',
    designation: 'CTT',
    position: tacticalMapChinTurretPivotTargetHex,
  }),
];

export const tacticalMapOutOfArcCombatState = tacticalMapCombatStateForTokens(
  tacticalMapOutOfArcTokens,
);
export const tacticalMapSponsonArcCombatState = tacticalMapCombatStateForTokens(
  tacticalMapSponsonArcTokens,
);
export const tacticalMapRightSponsonArcCombatState =
  tacticalMapCombatStateForTokens(tacticalMapRightSponsonArcTokens);
export const tacticalMapLockedTurretCombatState =
  tacticalMapCombatStateForTokens(tacticalMapLockedTurretTokens);
const tacticalMapChinTurretPivotBaseCombatState =
  tacticalMapCombatStateForTokens(tacticalMapChinTurretPivotTokens);
const tacticalMapChinTurretPivotVehicleState = {
  ...createVehicleCombatState({
    unitId: 'attacker',
    motionType: GroundMotionType.TRACKED,
    turretType: TurretType.CHIN,
    originalCruiseMP: 4,
    armor: {},
    structure: {},
  }),
  turretPivotedThisTurn: true,
};
export const tacticalMapChinTurretPivotCombatState: IGameState = {
  ...tacticalMapChinTurretPivotBaseCombatState,
  units: {
    ...tacticalMapChinTurretPivotBaseCombatState.units,
    attacker: {
      ...tacticalMapChinTurretPivotBaseCombatState.units.attacker,
      combatState: {
        kind: 'vehicle',
        state: tacticalMapChinTurretPivotVehicleState,
      },
    },
  },
};

export const tacticalMapOutOfArcUnitWeapons = tacticalMapUnitWeapons(
  tacticalMapWeapon({
    id: 'front-arc-laser',
    name: 'Front Arc Laser',
    location: 'right_arm',
    mountingArc: FiringArc.Front,
    mountingArcs: [FiringArc.Front],
  }),
);

export const tacticalMapSponsonArcUnitWeapons = tacticalMapUnitWeapons(
  tacticalMapWeapon({
    id: 'left-sponson-laser',
    name: 'Left Sponson Laser',
    location: 'left_sponson',
    mountingArcs: tacticalMapLeftSponsonArcs,
  }),
);

export const tacticalMapRightSponsonArcUnitWeapons = tacticalMapUnitWeapons(
  tacticalMapWeapon({
    id: 'right-sponson-laser',
    name: 'Right Sponson Laser',
    location: 'right_sponson',
    mountingArcs: tacticalMapRightSponsonArcs,
  }),
);

export const tacticalMapLockedTurretUnitWeapons = tacticalMapUnitWeapons(
  tacticalMapWeapon({
    id: 'locked-turret-ppc',
    name: 'Locked Turret PPC',
    location: 'turret',
    mountingArcs: tacticalMapLockedTurretArcs,
    heat: 10,
    damage: 10,
    ranges: { short: 6, medium: 12, long: 18 },
  }),
);

export const tacticalMapChinTurretPivotUnitWeapons = tacticalMapUnitWeapons(
  tacticalMapWeapon({
    id: 'chin-turret-laser',
    name: 'Chin Turret Laser',
    location: 'chin_turret',
    mountingArcs: tacticalMapChinTurretArcs,
    vehicleMountLocation: VehicleLocation.TURRET,
    vehicleIsTurretMounted: true,
  }),
);

const tacticalMapOutOfArcGrid = tacticalMapCombatGrid();

export const tacticalMapOutOfArcCombatProjection = tacticalMapCombatProjection({
  attacker: tacticalMapOutOfArcTokens[0],
  targetUnitId: tacticalMapOutOfArcTargetId,
  targetHex: tacticalMapOutOfArcTargetHex,
  grid: tacticalMapOutOfArcGrid,
  tokens: tacticalMapOutOfArcTokens,
  weapons: tacticalMapOutOfArcUnitWeapons.attacker,
  combatState: tacticalMapOutOfArcCombatState,
});

const tacticalMapSponsonArcGrid = tacticalMapCombatGrid();

export const tacticalMapSponsonArcCombatProjection =
  tacticalMapCombatProjection({
    attacker: tacticalMapSponsonArcTokens[0],
    targetUnitId: tacticalMapSponsonArcTargetId,
    targetHex: tacticalMapSponsonArcTargetHex,
    grid: tacticalMapSponsonArcGrid,
    tokens: tacticalMapSponsonArcTokens,
    weapons: tacticalMapSponsonArcUnitWeapons.attacker,
    combatState: tacticalMapSponsonArcCombatState,
  });

const tacticalMapRightSponsonArcGrid = tacticalMapCombatGrid();

export const tacticalMapRightSponsonArcCombatProjection =
  tacticalMapCombatProjection({
    attacker: tacticalMapRightSponsonArcTokens[0],
    targetUnitId: tacticalMapRightSponsonArcTargetId,
    targetHex: tacticalMapRightSponsonArcTargetHex,
    grid: tacticalMapRightSponsonArcGrid,
    tokens: tacticalMapRightSponsonArcTokens,
    weapons: tacticalMapRightSponsonArcUnitWeapons.attacker,
    combatState: tacticalMapRightSponsonArcCombatState,
  });

const tacticalMapLockedTurretGrid = tacticalMapCombatGrid();

export const tacticalMapLockedTurretCombatProjection =
  tacticalMapCombatProjection({
    attacker: tacticalMapLockedTurretTokens[0],
    targetUnitId: tacticalMapLockedTurretTargetId,
    targetHex: tacticalMapLockedTurretTargetHex,
    grid: tacticalMapLockedTurretGrid,
    tokens: tacticalMapLockedTurretTokens,
    weapons: tacticalMapLockedTurretUnitWeapons.attacker,
    combatState: tacticalMapLockedTurretCombatState,
  });

const tacticalMapChinTurretPivotGrid = tacticalMapCombatGrid();

export const tacticalMapChinTurretPivotCombatProjection =
  tacticalMapCombatProjection({
    attacker: tacticalMapChinTurretPivotTokens[0],
    targetUnitId: tacticalMapChinTurretPivotTargetId,
    targetHex: tacticalMapChinTurretPivotTargetHex,
    grid: tacticalMapChinTurretPivotGrid,
    tokens: tacticalMapChinTurretPivotTokens,
    weapons: tacticalMapChinTurretPivotUnitWeapons.attacker,
    combatState: tacticalMapChinTurretPivotCombatState,
  });

export function tacticalMapOutOfArcCommitInput(): IApplyAttackInput {
  return tacticalMapCommitInput({
    tokens: tacticalMapOutOfArcTokens,
    combatState: tacticalMapOutOfArcCombatState,
    unitWeapons: tacticalMapOutOfArcUnitWeapons,
    targetId: tacticalMapOutOfArcTargetId,
    weaponIds: tacticalMapOutOfArcSelectedWeaponIds,
    grid: tacticalMapOutOfArcGrid,
  });
}

export function tacticalMapLockedTurretCommitInput(): IApplyAttackInput {
  return tacticalMapCommitInput({
    tokens: tacticalMapLockedTurretTokens,
    combatState: tacticalMapLockedTurretCombatState,
    unitWeapons: tacticalMapLockedTurretUnitWeapons,
    targetId: tacticalMapLockedTurretTargetId,
    weaponIds: tacticalMapLockedTurretSelectedWeaponIds,
    grid: tacticalMapLockedTurretGrid,
  });
}

export function tacticalMapSponsonArcCommitInput(): IApplyAttackInput {
  return tacticalMapCommitInput({
    tokens: tacticalMapSponsonArcTokens,
    combatState: tacticalMapSponsonArcCombatState,
    unitWeapons: tacticalMapSponsonArcUnitWeapons,
    targetId: tacticalMapSponsonArcTargetId,
    weaponIds: tacticalMapSponsonArcSelectedWeaponIds,
    grid: tacticalMapSponsonArcGrid,
  });
}

export function tacticalMapRightSponsonArcCommitInput(): IApplyAttackInput {
  return tacticalMapCommitInput({
    tokens: tacticalMapRightSponsonArcTokens,
    combatState: tacticalMapRightSponsonArcCombatState,
    unitWeapons: tacticalMapRightSponsonArcUnitWeapons,
    targetId: tacticalMapRightSponsonArcTargetId,
    weaponIds: tacticalMapRightSponsonArcSelectedWeaponIds,
    grid: tacticalMapRightSponsonArcGrid,
  });
}

export function tacticalMapChinTurretPivotCommitInput(): IApplyAttackInput {
  return tacticalMapCommitInput({
    tokens: tacticalMapChinTurretPivotTokens,
    combatState: tacticalMapChinTurretPivotCombatState,
    unitWeapons: tacticalMapChinTurretPivotUnitWeapons,
    targetId: tacticalMapChinTurretPivotTargetId,
    weaponIds: tacticalMapChinTurretPivotSelectedWeaponIds,
    grid: tacticalMapChinTurretPivotGrid,
  });
}
