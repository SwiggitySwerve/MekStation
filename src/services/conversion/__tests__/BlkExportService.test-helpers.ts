/**
 * BLK Export Service Tests
 *
 * Tests for exporting unit state objects to BLK (Building Block) format strings.
 * Covers vehicles, aerospace, battle armor, infantry, and protomechs.
 *
 * @spec openspec/specs/serialization-formats/spec.md
 */

import type { AerospaceState } from '@/stores/aerospaceState';
import type { BattleArmorState } from '@/stores/battleArmorState';
import type { InfantryState } from '@/stores/infantryState';
import type { ProtoMechState } from '@/stores/protoMechState';
import type { VehicleState } from '@/stores/vehicleState';

import {
  BlkExportService,
  getBlkExportService,
} from '@/services/conversion/BlkExportService';
import { ArmorTypeEnum } from '@/types/construction/ArmorType';
import { EngineType } from '@/types/construction/EngineType';
import {
  VehicleLocation,
  VTOLLocation,
  AerospaceLocation,
  ProtoMechLocation,
} from '@/types/construction/UnitLocation';
import { RulesLevel } from '@/types/enums/RulesLevel';
import { TechBase } from '@/types/enums/TechBase';
import { WeightClass } from '@/types/enums/WeightClass';
import {
  AerospaceCockpitType,
  AerospaceEngineType,
  AerospaceSubType,
} from '@/types/unit/AerospaceInterfaces';
import {
  GroundMotionType,
  SquadMotionType,
  AerospaceMotionType,
} from '@/types/unit/BaseUnitInterfaces';
import { BAArmorType } from '@/types/unit/BattleArmorInterfaces';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import { InfantryMotive } from '@/types/unit/InfantryInterfaces';
import {
  BattleArmorChassisType,
  BattleArmorWeightClass,
  InfantryArmorKit,
  ManipulatorType,
  InfantrySpecialization,
} from '@/types/unit/PersonnelInterfaces';
import {
  ProtoChassis,
  ProtoWeightClass,
} from '@/types/unit/ProtoMechInterfaces';
import { VehicleStructureType } from '@/utils/construction/vehicle/structure';

// Helper: Create Mock Unit States
// ============================================================================

export const createMockVehicleState = (
  overrides?: Partial<VehicleState>,
): VehicleState => ({
  id: 'test-vehicle-1',
  name: 'Test Tank TST-1',
  chassis: 'Test Tank',
  model: 'TST-1',
  mulId: '-1',
  year: 3050,
  rulesLevel: RulesLevel.STANDARD,
  tonnage: 50,
  weightClass: WeightClass.MEDIUM,
  techBase: TechBase.INNER_SPHERE,
  unitType: UnitType.VEHICLE,
  motionType: GroundMotionType.TRACKED,
  isOmni: false,
  engineType: EngineType.STANDARD,
  engineRating: 200,
  cruiseMP: 4,
  flankMP: 6,
  turret: null,
  secondaryTurret: null,
  armorType: ArmorTypeEnum.STANDARD,
  armorTonnage: 5,
  armorAllocation: {
    [VehicleLocation.FRONT]: 20,
    [VehicleLocation.LEFT]: 15,
    [VehicleLocation.RIGHT]: 15,
    [VehicleLocation.REAR]: 10,
    [VehicleLocation.TURRET]: 10,
    [VehicleLocation.TURRET_2]: 0,
    [VehicleLocation.BODY]: 0,
  },
  isSuperheavy: false,
  hasEnvironmentalSealing: false,
  hasFlotationHull: false,
  isAmphibious: false,
  hasTrailerHitch: false,
  isTrailer: false,
  structureType: VehicleStructureType.STANDARD,
  crewSize: 0,
  passengerSlots: 0,
  barRating: null,
  powerAmpWeight: 0,
  equipment: [],
  isModified: false,
  createdAt: Date.now(),
  lastModifiedAt: Date.now(),
  ...overrides,
});

export const createMockVTOLState = (
  overrides?: Partial<VehicleState>,
): VehicleState => ({
  ...createMockVehicleState(),
  name: 'Test VTOL VTL-1',
  chassis: 'Test VTOL',
  model: 'VTL-1',
  unitType: UnitType.VTOL,
  motionType: GroundMotionType.VTOL,
  armorAllocation: {
    [VehicleLocation.FRONT]: 15,
    [VehicleLocation.LEFT]: 10,
    [VehicleLocation.RIGHT]: 10,
    [VehicleLocation.REAR]: 8,
    [VehicleLocation.TURRET]: 5,
    [VehicleLocation.TURRET_2]: 0,
    [VehicleLocation.BODY]: 0,
    [VTOLLocation.ROTOR]: 2,
  },
  ...overrides,
});

export const createMockAerospaceState = (
  overrides?: Partial<AerospaceState>,
): AerospaceState => ({
  id: 'test-aero-1',
  name: 'Test Fighter TF-1',
  chassis: 'Test Fighter',
  model: 'TF-1',
  mulId: '-1',
  year: 3050,
  rulesLevel: RulesLevel.STANDARD,
  tonnage: 50,
  weightClass: WeightClass.MEDIUM,
  techBase: TechBase.INNER_SPHERE,
  unitType: UnitType.AEROSPACE,
  aerospaceSubType: AerospaceSubType.AEROSPACE_FIGHTER,
  motionType: AerospaceMotionType.AERODYNE,
  isOmni: false,
  engineType: EngineType.STANDARD,
  aerospaceEngineType: AerospaceEngineType.FUSION,
  engineRating: 200,
  safeThrust: 5,
  maxThrust: 8,
  fuelTons: 5,
  fuelPoints: 400,
  structuralIntegrity: 5,
  cockpitType: AerospaceCockpitType.STANDARD,
  heatSinks: 10,
  heatSinkPool: 10,
  doubleHeatSinks: false,
  armorType: ArmorTypeEnum.STANDARD,
  armorTonnage: 5,
  armorAllocation: {
    [AerospaceLocation.NOSE]: 20,
    [AerospaceLocation.LEFT_WING]: 15,
    [AerospaceLocation.RIGHT_WING]: 15,
    [AerospaceLocation.AFT]: 10,
  },
  hasBombBay: false,
  bombCapacity: 0,
  hasReinforcedCockpit: false,
  hasEjectionSeat: true,
  crew: null,
  equipment: [],
  isModified: false,
  createdAt: Date.now(),
  lastModifiedAt: Date.now(),
  ...overrides,
});

export const createMockBattleArmorState = (
  overrides?: Partial<BattleArmorState>,
): BattleArmorState => ({
  id: 'test-ba-1',
  name: 'Test Battle Armor TBA-1',
  chassis: 'Test Battle Armor',
  model: 'TBA-1',
  mulId: '-1',
  year: 3050,
  rulesLevel: RulesLevel.STANDARD,
  techBase: TechBase.INNER_SPHERE,
  unitType: UnitType.BATTLE_ARMOR,
  chassisType: BattleArmorChassisType.BIPED,
  weightClass: BattleArmorWeightClass.MEDIUM,
  weightPerTrooper: 750,
  squadSize: 4,
  motionType: SquadMotionType.JUMP,
  groundMP: 1,
  jumpMP: 3,
  hasMechanicalJumpBoosters: false,
  umuMP: 0,
  leftManipulator: ManipulatorType.BASIC,
  rightManipulator: ManipulatorType.BASIC,
  armorType: 0,
  baArmorType: BAArmorType.STANDARD,
  armorPerTrooper: 5,
  hasAPMount: false,
  hasModularMount: false,
  hasTurretMount: false,
  hasStealthSystem: false,
  stealthType: undefined,
  hasMimeticArmor: false,
  hasFireResistantArmor: false,
  equipment: [],
  isModified: false,
  createdAt: Date.now(),
  lastModifiedAt: Date.now(),
  ...overrides,
});

export const createMockInfantryState = (
  overrides?: Partial<InfantryState>,
): InfantryState => ({
  id: 'test-inf-1',
  name: 'Test Infantry Platoon',
  chassis: 'Test Infantry',
  model: 'Platoon',
  mulId: '-1',
  year: 3025,
  rulesLevel: RulesLevel.STANDARD,
  techBase: TechBase.INNER_SPHERE,
  unitType: UnitType.INFANTRY,
  squadSize: 7,
  numberOfSquads: 4,
  motionType: SquadMotionType.FOOT,
  infantryMotive: InfantryMotive.FOOT,
  platoonComposition: { squads: 7, troopersPerSquad: 4 },
  groundMP: 1,
  jumpMP: 0,
  primaryWeapon: 'Rifle',
  primaryWeaponId: 'rifle-standard',
  secondaryWeapon: undefined,
  secondaryWeaponId: undefined,
  secondaryWeaponCount: 0,
  armorKit: InfantryArmorKit.NONE,
  damageDivisor: 1,
  specialization: InfantrySpecialization.NONE,
  hasAntiMechTraining: false,
  isAugmented: false,
  augmentationType: undefined,
  fieldGuns: [],
  isModified: false,
  createdAt: Date.now(),
  lastModifiedAt: Date.now(),
  ...overrides,
});

export const createMockProtoMechState = (
  overrides?: Partial<ProtoMechState>,
): ProtoMechState => ({
  id: 'test-proto-1',
  name: 'Test ProtoMech TP-1',
  chassis: 'Test ProtoMech',
  model: 'TP-1',
  mulId: '-1',
  year: 3060,
  rulesLevel: RulesLevel.STANDARD,
  techBase: TechBase.CLAN,
  unitType: UnitType.PROTOMECH,
  tonnage: 5,
  weightClass: ProtoWeightClass.MEDIUM,
  chassisType: ProtoChassis.BIPED,
  pointSize: 5,
  engineRating: 25,
  walkMP: 5,
  cruiseMP: 5,
  flankMP: 8,
  jumpMP: 3,
  structureByLocation: {
    [ProtoMechLocation.HEAD]: 2,
    [ProtoMechLocation.TORSO]: 6,
    [ProtoMechLocation.LEFT_ARM]: 3,
    [ProtoMechLocation.RIGHT_ARM]: 3,
    [ProtoMechLocation.LEGS]: 4,
    [ProtoMechLocation.MAIN_GUN]: 0,
  },
  armorByLocation: {
    [ProtoMechLocation.HEAD]: 3,
    [ProtoMechLocation.TORSO]: 10,
    [ProtoMechLocation.LEFT_ARM]: 4,
    [ProtoMechLocation.RIGHT_ARM]: 4,
    [ProtoMechLocation.LEGS]: 6,
    [ProtoMechLocation.MAIN_GUN]: 2,
  },
  armorType: 0,
  hasMainGun: true,
  mainGunWeaponId: undefined,
  hasMyomerBooster: false,
  glidingWings: false,
  hasMagneticClamps: false,
  hasExtendedTorsoTwist: false,
  equipment: [],
  isModified: false,
  createdAt: Date.now(),
  lastModifiedAt: Date.now(),
  ...overrides,
});

// ============================================================================
// export() - Main Export Function
// ============================================================================
