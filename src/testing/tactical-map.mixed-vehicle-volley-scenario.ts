import type { IApplyAttackInput } from '@/engine/InteractiveSession.actions';
import type { IGameState, IUnitToken } from '@/types/gameplay';

import { VehicleLocation } from '@/types/construction/UnitLocation';
import { TokenUnitType, VehicleMotionType } from '@/types/gameplay';
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

export const tacticalMapMixedChinTurretPivotTargetId = 'mixed-chin-body-target';
export const tacticalMapMixedChinTurretPivotTargetHex = {
  q: -2,
  r: 2,
} as const;
export const tacticalMapMixedChinTurretPivotSelectedWeaponIds = [
  'mixed-chin-turret-laser',
  'left-body-laser',
];

const tacticalMapMixedChinTurretArcs = getVehicleWeaponArcs({
  mountLocation: VehicleLocation.TURRET,
  isTurretMounted: true,
  isSponsonMounted: false,
  turretType: TurretType.CHIN,
  turretLocked: false,
});

const tacticalMapMixedLeftBodyArcs = getVehicleWeaponArcs({
  mountLocation: VehicleLocation.LEFT,
  isTurretMounted: false,
  isSponsonMounted: false,
  turretLocked: false,
});

export const tacticalMapMixedChinTurretPivotTokens: readonly IUnitToken[] = [
  tacticalMapAttackerToken({
    name: 'Mixed Chin Body Carrier',
    designation: 'MCB',
    unitType: TokenUnitType.Vehicle,
    vehicleMotionType: VehicleMotionType.Tracked,
  }),
  tacticalMapTargetToken({
    unitId: tacticalMapMixedChinTurretPivotTargetId,
    name: 'Mixed Chin Body Target',
    designation: 'MCB-T',
    position: tacticalMapMixedChinTurretPivotTargetHex,
  }),
];

const tacticalMapMixedChinTurretPivotBaseCombatState =
  tacticalMapCombatStateForTokens(tacticalMapMixedChinTurretPivotTokens);

const tacticalMapMixedChinTurretPivotVehicleState = {
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

export const tacticalMapMixedChinTurretPivotCombatState: IGameState = {
  ...tacticalMapMixedChinTurretPivotBaseCombatState,
  units: {
    ...tacticalMapMixedChinTurretPivotBaseCombatState.units,
    attacker: {
      ...tacticalMapMixedChinTurretPivotBaseCombatState.units.attacker,
      combatState: {
        kind: 'vehicle',
        state: tacticalMapMixedChinTurretPivotVehicleState,
      },
    },
  },
};

export const tacticalMapMixedChinTurretPivotUnitWeapons =
  tacticalMapUnitWeapons(
    tacticalMapWeapon({
      id: 'mixed-chin-turret-laser',
      name: 'Mixed Chin Turret Laser',
      location: 'chin_turret',
      mountingArcs: tacticalMapMixedChinTurretArcs,
      vehicleMountLocation: VehicleLocation.TURRET,
      vehicleIsTurretMounted: true,
    }),
    tacticalMapWeapon({
      id: 'left-body-laser',
      name: 'Left Body Laser',
      location: 'left_body',
      mountingArcs: tacticalMapMixedLeftBodyArcs,
      vehicleMountLocation: VehicleLocation.LEFT,
      vehicleIsTurretMounted: false,
    }),
  );

const tacticalMapMixedChinTurretPivotGrid = tacticalMapCombatGrid();

export const tacticalMapMixedChinTurretPivotCombatProjection =
  tacticalMapCombatProjection({
    attacker: tacticalMapMixedChinTurretPivotTokens[0],
    targetUnitId: tacticalMapMixedChinTurretPivotTargetId,
    targetHex: tacticalMapMixedChinTurretPivotTargetHex,
    grid: tacticalMapMixedChinTurretPivotGrid,
    tokens: tacticalMapMixedChinTurretPivotTokens,
    weapons: tacticalMapMixedChinTurretPivotUnitWeapons.attacker,
    combatState: tacticalMapMixedChinTurretPivotCombatState,
  });

export function tacticalMapMixedChinTurretPivotCommitInput(): IApplyAttackInput {
  return tacticalMapCommitInput({
    tokens: tacticalMapMixedChinTurretPivotTokens,
    combatState: tacticalMapMixedChinTurretPivotCombatState,
    unitWeapons: tacticalMapMixedChinTurretPivotUnitWeapons,
    targetId: tacticalMapMixedChinTurretPivotTargetId,
    weaponIds: tacticalMapMixedChinTurretPivotSelectedWeaponIds,
    grid: tacticalMapMixedChinTurretPivotGrid,
  });
}

export const tacticalMapMixedVehicleVolleyHarnessScenarios = {
  'vehicle-mixed-chin-body-pivot': {
    selectedWeaponIds: tacticalMapMixedChinTurretPivotSelectedWeaponIds,
    targetUnitId: tacticalMapMixedChinTurretPivotTargetId,
    tokens: tacticalMapMixedChinTurretPivotTokens,
    combatState: tacticalMapMixedChinTurretPivotCombatState,
    unitWeapons: tacticalMapMixedChinTurretPivotUnitWeapons,
    selectedHex: undefined,
    hexTerrain: undefined,
  },
} as const;
