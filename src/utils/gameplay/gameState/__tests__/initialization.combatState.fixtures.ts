import type { IInfantry } from '@/types/unit/PersonnelInterfaces';

import { VehicleLocation } from '@/types/construction/UnitLocation';
import { GameSide, type IGameUnit } from '@/types/gameplay';
import {
  GroundMotionType,
  SquadMotionType,
} from '@/types/unit/BaseUnitInterfaces';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import {
  InfantryArmorKit,
  InfantrySpecialization,
} from '@/types/unit/PersonnelInterfaces';
import { ProtoChassis, ProtoLocation } from '@/types/unit/ProtoMechInterfaces';

export const POSITION = { q: 0, r: 0 } as const;

export function baseGameUnit(overrides: Partial<IGameUnit> = {}): IGameUnit {
  return {
    id: 'unit-1',
    name: 'Test Unit',
    side: GameSide.Player,
    unitRef: 'test-ref',
    pilotRef: 'pilot-1',
    gunnery: 4,
    piloting: 5,
    ...overrides,
  };
}

export function makeInfantryUnit(): IInfantry {
  return {
    unitType: UnitType.INFANTRY,
    tonnage: 3,
    weightClass: 'Light',
    metadata: {
      chassis: 'Test Platoon',
      model: 'TST-1',
      era: 'Succession Wars',
      year: 3025,
      rulesLevel: 'Standard',
    },
    totalWeight: 3,
    remainingTonnage: 0,
    isValid: true,
    validationErrors: [],
    techBase: 'IS',
    introductionYear: 3025,
    extinctionYear: 0,
    cBills: 0,
    bv: 0,
    crew: 28,
    squadSize: 7,
    numberOfSquads: 4,
    platoonStrength: 28,
    motionType: SquadMotionType.FOOT,
    primaryWeapon: 'SRM Launcher',
    secondaryWeaponCount: 0,
    armorKit: InfantryArmorKit.STANDARD,
    specialization: InfantrySpecialization.NONE,
    fieldGuns: [],
    hasAntiMechTraining: true,
    isAugmented: false,
    canSwarm: true,
    canLegAttack: true,
  } as unknown as IInfantry;
}

export const SAMPLE_AERO_INIT = {
  maxSI: 8,
  armorByArc: { nose: 20, leftWing: 15, rightWing: 15, aft: 10 },
  heatSinks: 12,
  fuelPoints: 400,
  safeThrust: 5,
  maxThrust: 8,
} as const;

const SAMPLE_VEHICLE_ARMOR = {
  [VehicleLocation.FRONT]: 20,
  [VehicleLocation.LEFT]: 16,
  [VehicleLocation.RIGHT]: 16,
  [VehicleLocation.REAR]: 12,
  [VehicleLocation.BODY]: 10,
} as NonNullable<IGameUnit['vehicleInit']>['armor'];

const SAMPLE_VEHICLE_STRUCTURE = {
  [VehicleLocation.FRONT]: 8,
  [VehicleLocation.LEFT]: 8,
  [VehicleLocation.RIGHT]: 8,
  [VehicleLocation.REAR]: 6,
  [VehicleLocation.BODY]: 10,
} as NonNullable<IGameUnit['vehicleInit']>['structure'];

export const SAMPLE_VEHICLE_INIT: NonNullable<IGameUnit['vehicleInit']> = {
  motionType: GroundMotionType.WIGE,
  originalCruiseMP: 5,
  armor: SAMPLE_VEHICLE_ARMOR,
  structure: SAMPLE_VEHICLE_STRUCTURE,
  altitude: 1,
} as const;

export const SAMPLE_PROTO_INIT = {
  chassisType: ProtoChassis.BIPED,
  hasMainGun: true,
  armorByLocation: {
    [ProtoLocation.HEAD]: 2,
    [ProtoLocation.TORSO]: 6,
    [ProtoLocation.LEFT_ARM]: 2,
    [ProtoLocation.RIGHT_ARM]: 2,
    [ProtoLocation.LEGS]: 4,
    [ProtoLocation.MAIN_GUN]: 2,
  },
  structureByLocation: {
    [ProtoLocation.HEAD]: 1,
    [ProtoLocation.TORSO]: 5,
    [ProtoLocation.LEFT_ARM]: 1,
    [ProtoLocation.RIGHT_ARM]: 1,
    [ProtoLocation.LEGS]: 3,
    [ProtoLocation.MAIN_GUN]: 1,
  },
} as const;

export const SAMPLE_BA_INIT = {
  squadSize: 5,
  armorPointsPerTrooper: 8,
} as const;
