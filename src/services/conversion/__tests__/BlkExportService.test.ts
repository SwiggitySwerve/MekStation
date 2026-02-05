/**
 * BLK Export Service Tests
 *
 * Tests for exporting unit state objects to BLK (Building Block) format strings.
 * Covers vehicles, aerospace, battle armor, infantry, and protomechs.
 *
 * @spec openspec/specs/serialization-formats/spec.md
 */

import {
  BlkExportService,
  getBlkExportService,
} from '@/services/conversion/BlkExportService';
import { AerospaceState } from '@/stores/aerospaceState';
import { BattleArmorState } from '@/stores/battleArmorState';
import { InfantryState } from '@/stores/infantryState';
import { ProtoMechState } from '@/stores/protoMechState';
import { VehicleState } from '@/stores/vehicleState';
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
import { AerospaceCockpitType } from '@/types/unit/AerospaceInterfaces';
import {
  GroundMotionType,
  SquadMotionType,
  AerospaceMotionType,
} from '@/types/unit/BaseUnitInterfaces';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import {
  BattleArmorChassisType,
  BattleArmorWeightClass,
  InfantryArmorKit,
  ManipulatorType,
  InfantrySpecialization,
} from '@/types/unit/PersonnelInterfaces';

describe('BlkExportService', () => {
  let service: BlkExportService;

  beforeEach(() => {
    service = getBlkExportService();
  });

  // ============================================================================
  // Singleton Pattern
  // ============================================================================
  describe('Singleton Pattern', () => {
    it('should return the same instance from getBlkExportService', () => {
      const instance1 = getBlkExportService();
      const instance2 = getBlkExportService();
      expect(instance1).toBe(instance2);
    });

    it('should return same instance from static getInstance method', () => {
      const instance1 = BlkExportService.getInstance();
      const instance2 = BlkExportService.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should return same instance from both methods', () => {
      const fromGetter = getBlkExportService();
      const fromStatic = BlkExportService.getInstance();
      expect(fromGetter).toBe(fromStatic);
    });
  });

  // ============================================================================
  // Helper: Create Mock Unit States
  // ============================================================================

  const createMockVehicleState = (
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
      [VehicleLocation.BODY]: 0,
    },
    isSuperheavy: false,
    hasEnvironmentalSealing: false,
    hasFlotationHull: false,
    isAmphibious: false,
    hasTrailerHitch: false,
    isTrailer: false,
    equipment: [],
    isModified: false,
    createdAt: Date.now(),
    lastModifiedAt: Date.now(),
    ...overrides,
  });

  const createMockVTOLState = (
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
      [VehicleLocation.BODY]: 0,
      [VTOLLocation.ROTOR]: 2,
    },
    ...overrides,
  });

  const createMockAerospaceState = (
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
    motionType: AerospaceMotionType.AERODYNE,
    isOmni: false,
    engineType: EngineType.STANDARD,
    engineRating: 200,
    safeThrust: 5,
    maxThrust: 8,
    fuel: 400,
    structuralIntegrity: 5,
    cockpitType: AerospaceCockpitType.STANDARD,
    heatSinks: 10,
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
    equipment: [],
    isModified: false,
    createdAt: Date.now(),
    lastModifiedAt: Date.now(),
    ...overrides,
  });

  const createMockBattleArmorState = (
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

  const createMockInfantryState = (
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

  const createMockProtoMechState = (
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
    pointSize: 5,
    isQuad: false,
    isGlider: false,
    engineRating: 25,
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
    hasMyomerBooster: false,
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
  describe('export()', () => {
    describe('unsupported unit types', () => {
      it('should return error for unsupported unit type', () => {
        // Create unit with unsupported type
        const badUnit = {
          ...createMockVehicleState(),
          unitType: UnitType.BATTLEMECH as UnitType.VEHICLE,
        } as VehicleState;
        const result = service.export(badUnit);

        expect(result.success).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
        expect(result.errors[0]).toContain('Unsupported unit type');
      });
    });

    describe('error handling', () => {
      it('should handle export errors gracefully', () => {
        // Create a unit with data that might cause an error
        const badUnit = null as unknown as VehicleState;
        const result = service.export(badUnit);

        expect(result.success).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
        expect(result.errors[0]).toContain('Export error:');
      });
    });
  });

  // ============================================================================
  // Vehicle Export Tests
  // ============================================================================
  describe('Vehicle Export', () => {
    it('should successfully export a basic vehicle', () => {
      const vehicle = createMockVehicleState();
      const result = service.export(vehicle);

      expect(result.success).toBe(true);
      expect(result.content).toBeDefined();
      expect(result.errors).toHaveLength(0);
    });

    it('should include license header', () => {
      const vehicle = createMockVehicleState();
      const result = service.export(vehicle);

      expect(result.content).toContain('MegaMek Data');
      expect(result.content).toContain('CC BY-NC-SA 4.0');
      expect(result.content).toContain('MekStation');
    });

    it('should include block version and MAM0 version', () => {
      const vehicle = createMockVehicleState();
      const result = service.export(vehicle);

      expect(result.content).toContain('<BlockVersion>');
      expect(result.content).toContain('1');
      expect(result.content).toContain('<Version>');
      expect(result.content).toContain('MAM0');
    });

    it('should include correct unit type for Tank', () => {
      const vehicle = createMockVehicleState();
      const result = service.export(vehicle);

      expect(result.content).toContain('<UnitType>');
      expect(result.content).toContain('Tank');
    });

    it('should include correct unit type for VTOL', () => {
      const vtol = createMockVTOLState();
      const result = service.export(vtol);

      expect(result.content).toContain('<UnitType>');
      expect(result.content).toContain('VTOL');
    });

    it('should include correct unit type for Support Vehicle', () => {
      const supportVehicle = createMockVehicleState({
        unitType: UnitType.SUPPORT_VEHICLE,
      });
      const result = service.export(supportVehicle);

      expect(result.content).toContain('<UnitType>');
      expect(result.content).toContain('SupportTank');
    });

    it('should include chassis and model', () => {
      const vehicle = createMockVehicleState({
        chassis: 'Schrek',
        model: 'PPC Carrier',
      });
      const result = service.export(vehicle);

      expect(result.content).toContain('<Name>');
      expect(result.content).toContain('Schrek');
      expect(result.content).toContain('<Model>');
      expect(result.content).toContain('PPC Carrier');
    });

    it('should include mul id when not -1', () => {
      const vehicle = createMockVehicleState({ mulId: '12345' });
      const result = service.export(vehicle);

      expect(result.content).toContain('<mul id:>');
      expect(result.content).toContain('12345');
    });

    it('should not include mul id when -1', () => {
      const vehicle = createMockVehicleState({ mulId: '-1' });
      const result = service.export(vehicle);

      expect(result.content).not.toContain('<mul id:>');
    });

    it('should include year', () => {
      const vehicle = createMockVehicleState({ year: 3025 });
      const result = service.export(vehicle);

      expect(result.content).toContain('<year>');
      expect(result.content).toContain('3025');
    });

    it('should format tech type correctly for IS Standard', () => {
      const vehicle = createMockVehicleState({
        techBase: TechBase.INNER_SPHERE,
        rulesLevel: RulesLevel.STANDARD,
      });
      const result = service.export(vehicle);

      expect(result.content).toContain('<type>');
      expect(result.content).toContain('IS Level 2');
    });

    it('should format tech type correctly for Clan Advanced', () => {
      const vehicle = createMockVehicleState({
        techBase: TechBase.CLAN,
        rulesLevel: RulesLevel.ADVANCED,
      });
      const result = service.export(vehicle);

      expect(result.content).toContain('<type>');
      expect(result.content).toContain('Clan Level 3');
    });

    it('should include motion type', () => {
      const vehicle = createMockVehicleState({
        motionType: GroundMotionType.HOVER,
      });
      const result = service.export(vehicle);

      expect(result.content).toContain('<motion_type>');
      expect(result.content).toContain('Hover');
    });

    it('should include tonnage', () => {
      const vehicle = createMockVehicleState({ tonnage: 80 });
      const result = service.export(vehicle);

      expect(result.content).toContain('<Tonnage>');
      expect(result.content).toContain('80');
    });

    it('should include cruise MP', () => {
      const vehicle = createMockVehicleState({ cruiseMP: 5 });
      const result = service.export(vehicle);

      expect(result.content).toContain('<cruiseMP>');
      expect(result.content).toContain('5');
    });

    it('should format engine type codes correctly', () => {
      const testCases: [EngineType, string][] = [
        [EngineType.STANDARD, '0'],
        [EngineType.XL_IS, '1'],
        [EngineType.XL_CLAN, '2'],
        [EngineType.LIGHT, '3'],
        [EngineType.COMPACT, '4'],
        [EngineType.XXL, '5'],
        [EngineType.ICE, '6'],
        [EngineType.FUEL_CELL, '7'],
        [EngineType.FISSION, '8'],
      ];

      for (const [engineType, expectedCode] of testCases) {
        const vehicle = createMockVehicleState({ engineType });
        const result = service.export(vehicle);

        expect(result.content).toContain('<engine_type>');
        expect(result.content).toContain(`\n${expectedCode}\n`);
      }
    });

    it('should format armor type codes correctly', () => {
      const testCases: [ArmorTypeEnum, string][] = [
        [ArmorTypeEnum.STANDARD, '0'],
        [ArmorTypeEnum.FERRO_FIBROUS_IS, '1'],
        [ArmorTypeEnum.FERRO_FIBROUS_CLAN, '2'],
        [ArmorTypeEnum.LIGHT_FERRO, '3'],
        [ArmorTypeEnum.HEAVY_FERRO, '4'],
        [ArmorTypeEnum.STEALTH, '5'],
        [ArmorTypeEnum.REACTIVE, '6'],
        [ArmorTypeEnum.REFLECTIVE, '7'],
        [ArmorTypeEnum.HARDENED, '8'],
      ];

      for (const [armorType, expectedCode] of testCases) {
        const vehicle = createMockVehicleState({ armorType });
        const result = service.export(vehicle);

        expect(result.content).toContain('<armor_type>');
        expect(result.content).toContain(`\n${expectedCode}\n`);
      }
    });

    it('should format armor tech code for IS', () => {
      const vehicle = createMockVehicleState({
        techBase: TechBase.INNER_SPHERE,
      });
      const result = service.export(vehicle);

      expect(result.content).toContain('<armor_tech>');
      expect(result.content).toContain('\n1\n');
    });

    it('should format armor tech code for Clan', () => {
      const vehicle = createMockVehicleState({ techBase: TechBase.CLAN });
      const result = service.export(vehicle);

      expect(result.content).toContain('<armor_tech>');
      expect(result.content).toContain('\n2\n');
    });

    it('should format vehicle armor allocation correctly', () => {
      const vehicle = createMockVehicleState({
        armorAllocation: {
          [VehicleLocation.FRONT]: 25,
          [VehicleLocation.LEFT]: 18,
          [VehicleLocation.RIGHT]: 18,
          [VehicleLocation.REAR]: 12,
          [VehicleLocation.TURRET]: 15,
          [VehicleLocation.BODY]: 0,
        },
      });
      const result = service.export(vehicle);

      expect(result.content).toContain('<armor>');
      expect(result.content).toContain('25\n18\n18\n12\n15');
    });

    it('should include rotor armor for VTOL', () => {
      const vtol = createMockVTOLState({
        armorAllocation: {
          [VehicleLocation.FRONT]: 15,
          [VehicleLocation.LEFT]: 10,
          [VehicleLocation.RIGHT]: 10,
          [VehicleLocation.REAR]: 8,
          [VehicleLocation.TURRET]: 5,
          [VehicleLocation.BODY]: 0,
          [VTOLLocation.ROTOR]: 3,
        },
      });
      const result = service.export(vtol);

      expect(result.content).toContain('<armor>');
      expect(result.content).toContain('15\n10\n10\n8\n5\n3');
    });

    it('should format motion types correctly', () => {
      const motionTypes: [GroundMotionType, string][] = [
        [GroundMotionType.TRACKED, 'Tracked'],
        [GroundMotionType.WHEELED, 'Wheeled'],
        [GroundMotionType.HOVER, 'Hover'],
        [GroundMotionType.VTOL, 'VTOL'],
        [GroundMotionType.WIGE, 'WiGE'],
        [GroundMotionType.NAVAL, 'Naval'],
        [GroundMotionType.HYDROFOIL, 'Hydrofoil'],
        [GroundMotionType.SUBMARINE, 'Submarine'],
        [GroundMotionType.RAIL, 'Rail'],
        [GroundMotionType.MAGLEV, 'Maglev'],
      ];

      for (const [motionType, expectedValue] of motionTypes) {
        const vehicle = createMockVehicleState({ motionType });
        const result = service.export(vehicle);

        expect(result.content).toContain('<motion_type>');
        expect(result.content).toContain(expectedValue);
      }
    });

    it('should write vehicle equipment by location', () => {
      const vehicle = createMockVehicleState({
        equipment: [
          {
            id: '1',
            equipmentId: 'ppc',
            name: 'PPC',
            location: VehicleLocation.TURRET,
            isRearMounted: false,
            isTurretMounted: true,
            isSponsonMounted: false,
          },
          {
            id: '2',
            equipmentId: 'ml',
            name: 'Medium Laser',
            location: VehicleLocation.FRONT,
            isRearMounted: false,
            isTurretMounted: false,
            isSponsonMounted: false,
          },
        ],
      });
      const result = service.export(vehicle);

      expect(result.content).toContain('<Turret Equipment>');
      expect(result.content).toContain('PPC');
      expect(result.content).toContain('<Front Equipment>');
      expect(result.content).toContain('Medium Laser');
    });

    it('should handle vehicle with no equipment', () => {
      const vehicle = createMockVehicleState({ equipment: [] });
      const result = service.export(vehicle);

      expect(result.success).toBe(true);
      expect(result.content).not.toContain('Equipment>');
    });
  });

  // ============================================================================
  // Aerospace Export Tests
  // ============================================================================
  describe('Aerospace Export', () => {
    it('should successfully export a basic aerospace fighter', () => {
      const aero = createMockAerospaceState();
      const result = service.export(aero);

      expect(result.success).toBe(true);
      expect(result.content).toBeDefined();
      expect(result.errors).toHaveLength(0);
    });

    it('should include correct unit type for Aero', () => {
      const aero = createMockAerospaceState();
      const result = service.export(aero);

      expect(result.content).toContain('<UnitType>');
      expect(result.content).toContain('Aero');
    });

    it('should include correct unit type for ConvFighter', () => {
      const convFighter = createMockAerospaceState({
        unitType: UnitType.CONVENTIONAL_FIGHTER,
      });
      const result = service.export(convFighter);

      expect(result.content).toContain('<UnitType>');
      expect(result.content).toContain('ConvFighter');
    });

    it('should include safe thrust', () => {
      const aero = createMockAerospaceState({ safeThrust: 7 });
      const result = service.export(aero);

      expect(result.content).toContain('<SafeThrust>');
      expect(result.content).toContain('7');
    });

    it('should include heat sinks', () => {
      const aero = createMockAerospaceState({ heatSinks: 15 });
      const result = service.export(aero);

      expect(result.content).toContain('<heatsinks>');
      expect(result.content).toContain('15');
    });

    it('should format single heat sinks as 0', () => {
      const aero = createMockAerospaceState({ doubleHeatSinks: false });
      const result = service.export(aero);

      expect(result.content).toContain('<sink_type>');
      expect(result.content).toContain('\n0\n');
    });

    it('should format double heat sinks as 1', () => {
      const aero = createMockAerospaceState({ doubleHeatSinks: true });
      const result = service.export(aero);

      expect(result.content).toContain('<sink_type>');
      expect(result.content).toContain('\n1\n');
    });

    it('should include fuel', () => {
      const aero = createMockAerospaceState({ fuel: 480 });
      const result = service.export(aero);

      expect(result.content).toContain('<fuel>');
      expect(result.content).toContain('480');
    });

    it('should include structural integrity', () => {
      const aero = createMockAerospaceState({ structuralIntegrity: 8 });
      const result = service.export(aero);

      expect(result.content).toContain('<structural_integrity>');
      expect(result.content).toContain('8');
    });

    it('should format aerospace armor allocation correctly', () => {
      const aero = createMockAerospaceState({
        armorAllocation: {
          [AerospaceLocation.NOSE]: 30,
          [AerospaceLocation.LEFT_WING]: 20,
          [AerospaceLocation.RIGHT_WING]: 20,
          [AerospaceLocation.AFT]: 15,
        },
      });
      const result = service.export(aero);

      expect(result.content).toContain('<armor>');
      expect(result.content).toContain('30\n20\n20\n15');
    });

    it('should write aerospace equipment by arc', () => {
      const aero = createMockAerospaceState({
        equipment: [
          {
            id: '1',
            equipmentId: 'lpl',
            name: 'Large Pulse Laser',
            location: AerospaceLocation.NOSE,
          },
          {
            id: '2',
            equipmentId: 'mpl',
            name: 'Medium Pulse Laser',
            location: AerospaceLocation.LEFT_WING,
          },
        ],
      });
      const result = service.export(aero);

      expect(result.content).toContain('<Nose Equipment>');
      expect(result.content).toContain('Large Pulse Laser');
      expect(result.content).toContain('<Left Wing Equipment>');
      expect(result.content).toContain('Medium Pulse Laser');
    });
  });

  // ============================================================================
  // Battle Armor Export Tests
  // ============================================================================
  describe('Battle Armor Export', () => {
    it('should successfully export a basic battle armor', () => {
      const ba = createMockBattleArmorState();
      const result = service.export(ba);

      expect(result.success).toBe(true);
      expect(result.content).toBeDefined();
      expect(result.errors).toHaveLength(0);
    });

    it('should include correct unit type', () => {
      const ba = createMockBattleArmorState();
      const result = service.export(ba);

      expect(result.content).toContain('<UnitType>');
      expect(result.content).toContain('BattleArmor');
    });

    it('should include chassis type', () => {
      const ba = createMockBattleArmorState({
        chassisType: BattleArmorChassisType.QUAD,
      });
      const result = service.export(ba);

      expect(result.content).toContain('<chassis>');
      expect(result.content).toContain('Quad');
    });

    it('should include trooper count', () => {
      const ba = createMockBattleArmorState({ squadSize: 5 });
      const result = service.export(ba);

      expect(result.content).toContain('<Trooper Count>');
      expect(result.content).toContain('5');
    });

    it('should format weight class correctly', () => {
      const weightClasses: [BattleArmorWeightClass, string][] = [
        [BattleArmorWeightClass.PA_L, '0'],
        [BattleArmorWeightClass.LIGHT, '1'],
        [BattleArmorWeightClass.MEDIUM, '2'],
        [BattleArmorWeightClass.HEAVY, '3'],
        [BattleArmorWeightClass.ASSAULT, '4'],
      ];

      for (const [weightClass, expectedCode] of weightClasses) {
        const ba = createMockBattleArmorState({ weightClass });
        const result = service.export(ba);

        expect(result.content).toContain('<weightclass>');
        expect(result.content).toContain(`\n${expectedCode}\n`);
      }
    });

    it('should include motion type', () => {
      const ba = createMockBattleArmorState({
        motionType: SquadMotionType.VTOL,
      });
      const result = service.export(ba);

      expect(result.content).toContain('<motion_type>');
      expect(result.content).toContain('VTOL');
    });

    it('should include ground MP', () => {
      const ba = createMockBattleArmorState({ groundMP: 2 });
      const result = service.export(ba);

      expect(result.content).toContain('<cruiseMP>');
      expect(result.content).toContain('2');
    });

    it('should include jump MP when greater than 0', () => {
      const ba = createMockBattleArmorState({ jumpMP: 4 });
      const result = service.export(ba);

      expect(result.content).toContain('<jumpingMP>');
      expect(result.content).toContain('4');
    });

    it('should not include jump MP when 0', () => {
      const ba = createMockBattleArmorState({ jumpMP: 0 });
      const result = service.export(ba);

      expect(result.content).not.toContain('<jumpingMP>');
    });

    it('should include armor type and points per trooper', () => {
      const ba = createMockBattleArmorState({
        armorType: 1,
        armorPerTrooper: 7,
      });
      const result = service.export(ba);

      expect(result.content).toContain('<armor_type>');
      expect(result.content).toContain('\n1\n');
      expect(result.content).toContain('<armor>');
      expect(result.content).toContain('\n7\n');
    });

    it('should write battle armor equipment', () => {
      const ba = createMockBattleArmorState({
        equipment: [
          {
            id: '1',
            equipmentId: 'sml',
            name: 'Small Laser',
            location: 'Squad' as never,
            isAPMount: false,
            isTurretMounted: false,
            isModular: false,
          },
        ],
      });
      const result = service.export(ba);

      expect(result.content).toContain('<Squad Equipment>');
      expect(result.content).toContain('Small Laser');
    });
  });

  // ============================================================================
  // Infantry Export Tests
  // ============================================================================
  describe('Infantry Export', () => {
    it('should successfully export a basic infantry platoon', () => {
      const inf = createMockInfantryState();
      const result = service.export(inf);

      expect(result.success).toBe(true);
      expect(result.content).toBeDefined();
      expect(result.errors).toHaveLength(0);
    });

    it('should include correct unit type', () => {
      const inf = createMockInfantryState();
      const result = service.export(inf);

      expect(result.content).toContain('<UnitType>');
      expect(result.content).toContain('Infantry');
    });

    it('should include squad size', () => {
      const inf = createMockInfantryState({ squadSize: 10 });
      const result = service.export(inf);

      expect(result.content).toContain('<squad_size>');
      expect(result.content).toContain('10');
    });

    it('should include number of squads', () => {
      const inf = createMockInfantryState({ numberOfSquads: 3 });
      const result = service.export(inf);

      expect(result.content).toContain('<squadn>');
      expect(result.content).toContain('3');
    });

    it('should include motion type', () => {
      const inf = createMockInfantryState({
        motionType: SquadMotionType.MOTORIZED,
      });
      const result = service.export(inf);

      expect(result.content).toContain('<motion_type>');
      expect(result.content).toContain('Motorized');
    });

    it('should include primary weapon', () => {
      const inf = createMockInfantryState({ primaryWeapon: 'Laser Rifle' });
      const result = service.export(inf);

      expect(result.content).toContain('<Primary>');
      expect(result.content).toContain('Laser Rifle');
    });

    it('should include secondary weapon when present', () => {
      const inf = createMockInfantryState({
        secondaryWeapon: 'SRM Launcher',
        secondaryWeaponCount: 2,
      });
      const result = service.export(inf);

      expect(result.content).toContain('<Secondary>');
      expect(result.content).toContain('SRM Launcher');
      expect(result.content).toContain('<secondn>');
      expect(result.content).toContain('2');
    });

    it('should not include secondary weapon when absent', () => {
      const inf = createMockInfantryState({ secondaryWeapon: undefined });
      const result = service.export(inf);

      expect(result.content).not.toContain('<Secondary>');
      expect(result.content).not.toContain('<secondn>');
    });

    it('should include armor kit when not NONE', () => {
      const inf = createMockInfantryState({ armorKit: InfantryArmorKit.FLAK });
      const result = service.export(inf);

      expect(result.content).toContain('<armorKit>');
      expect(result.content).toContain('Flak');
    });

    it('should not include armor kit when NONE', () => {
      const inf = createMockInfantryState({ armorKit: InfantryArmorKit.NONE });
      const result = service.export(inf);

      expect(result.content).not.toContain('<armorKit>');
    });
  });

  // ============================================================================
  // ProtoMech Export Tests
  // ============================================================================
  describe('ProtoMech Export', () => {
    it('should successfully export a basic protomech', () => {
      const proto = createMockProtoMechState();
      const result = service.export(proto);

      expect(result.success).toBe(true);
      expect(result.content).toBeDefined();
      expect(result.errors).toHaveLength(0);
    });

    it('should include correct unit type', () => {
      const proto = createMockProtoMechState();
      const result = service.export(proto);

      expect(result.content).toContain('<UnitType>');
      expect(result.content).toContain('ProtoMech');
    });

    it('should include tonnage', () => {
      const proto = createMockProtoMechState({ tonnage: 7 });
      const result = service.export(proto);

      expect(result.content).toContain('<Tonnage>');
      expect(result.content).toContain('7');
    });

    it('should include cruise MP', () => {
      const proto = createMockProtoMechState({ cruiseMP: 6 });
      const result = service.export(proto);

      expect(result.content).toContain('<cruiseMP>');
      expect(result.content).toContain('6');
    });

    it('should include jump MP when greater than 0', () => {
      const proto = createMockProtoMechState({ jumpMP: 4 });
      const result = service.export(proto);

      expect(result.content).toContain('<jumpingMP>');
      expect(result.content).toContain('4');
    });

    it('should not include jump MP when 0', () => {
      const proto = createMockProtoMechState({ jumpMP: 0 });
      const result = service.export(proto);

      expect(result.content).not.toContain('<jumpingMP>');
    });

    it('should format protomech armor by location correctly', () => {
      const proto = createMockProtoMechState({
        armorByLocation: {
          [ProtoMechLocation.HEAD]: 4,
          [ProtoMechLocation.TORSO]: 12,
          [ProtoMechLocation.LEFT_ARM]: 5,
          [ProtoMechLocation.RIGHT_ARM]: 5,
          [ProtoMechLocation.LEGS]: 8,
          [ProtoMechLocation.MAIN_GUN]: 3,
        },
      });
      const result = service.export(proto);

      expect(result.content).toContain('<armor>');
      expect(result.content).toContain('4\n12\n5\n5\n8\n3');
    });

    it('should write protomech equipment by location', () => {
      const proto = createMockProtoMechState({
        equipment: [
          {
            id: '1',
            equipmentId: 'erllas',
            name: 'ER Large Laser',
            location: ProtoMechLocation.TORSO,
          },
          {
            id: '2',
            equipmentId: 'srm2',
            name: 'SRM 2',
            location: ProtoMechLocation.MAIN_GUN,
          },
        ],
      });
      const result = service.export(proto);

      expect(result.content).toContain('<Torso Equipment>');
      expect(result.content).toContain('ER Large Laser');
      expect(result.content).toContain('<Main Gun Equipment>');
      expect(result.content).toContain('SRM 2');
    });
  });

  // ============================================================================
  // Tech Type Formatting Tests
  // ============================================================================
  describe('Tech Type Formatting', () => {
    it('should format Introductory rules level as Level 1', () => {
      const vehicle = createMockVehicleState({
        techBase: TechBase.INNER_SPHERE,
        rulesLevel: RulesLevel.INTRODUCTORY,
      });
      const result = service.export(vehicle);

      expect(result.content).toContain('IS Level 1');
    });

    it('should format Standard rules level as Level 2', () => {
      const vehicle = createMockVehicleState({
        techBase: TechBase.INNER_SPHERE,
        rulesLevel: RulesLevel.STANDARD,
      });
      const result = service.export(vehicle);

      expect(result.content).toContain('IS Level 2');
    });

    it('should format Advanced rules level as Level 3', () => {
      const vehicle = createMockVehicleState({
        techBase: TechBase.INNER_SPHERE,
        rulesLevel: RulesLevel.ADVANCED,
      });
      const result = service.export(vehicle);

      expect(result.content).toContain('IS Level 3');
    });

    it('should format Experimental rules level as Level 4', () => {
      const vehicle = createMockVehicleState({
        techBase: TechBase.INNER_SPHERE,
        rulesLevel: RulesLevel.EXPERIMENTAL,
      });
      const result = service.export(vehicle);

      expect(result.content).toContain('IS Level 4');
    });

    it('should use Clan prefix for Clan tech base', () => {
      const vehicle = createMockVehicleState({
        techBase: TechBase.CLAN,
        rulesLevel: RulesLevel.STANDARD,
      });
      const result = service.export(vehicle);

      expect(result.content).toContain('Clan Level 2');
    });
  });

  // ============================================================================
  // Tag Formatting Tests
  // ============================================================================
  describe('Tag Formatting', () => {
    it('should format tags with opening, content, and closing', () => {
      const vehicle = createMockVehicleState({ chassis: 'TestChassis' });
      const result = service.export(vehicle);

      // Tags should have format: <TagName>\nValue\n</TagName>
      expect(result.content).toMatch(/<Name>\nTestChassis\n<\/Name>/);
    });
  });

  // ============================================================================
  // Round-Trip Testing
  // ============================================================================
  describe('Round-Trip Export', () => {
    it('should export a complete vehicle with all features', () => {
      const completeVehicle = createMockVehicleState({
        chassis: 'Demolisher',
        model: 'Heavy Tank',
        mulId: '999',
        year: 2803,
        rulesLevel: RulesLevel.INTRODUCTORY,
        techBase: TechBase.INNER_SPHERE,
        tonnage: 80,
        motionType: GroundMotionType.TRACKED,
        engineType: EngineType.ICE,
        cruiseMP: 3,
        armorType: ArmorTypeEnum.STANDARD,
        armorAllocation: {
          [VehicleLocation.FRONT]: 30,
          [VehicleLocation.LEFT]: 25,
          [VehicleLocation.RIGHT]: 25,
          [VehicleLocation.REAR]: 18,
          [VehicleLocation.TURRET]: 25,
          [VehicleLocation.BODY]: 0,
        },
        equipment: [
          {
            id: '1',
            equipmentId: 'ac20',
            name: 'AC/20',
            location: VehicleLocation.TURRET,
            isRearMounted: false,
            isTurretMounted: true,
            isSponsonMounted: false,
          },
          {
            id: '2',
            equipmentId: 'ac20',
            name: 'AC/20',
            location: VehicleLocation.TURRET,
            isRearMounted: false,
            isTurretMounted: true,
            isSponsonMounted: false,
          },
        ],
      });

      const result = service.export(completeVehicle);

      expect(result.success).toBe(true);
      expect(result.content).toBeDefined();
      expect(result.errors).toHaveLength(0);

      // Verify key sections exist
      expect(result.content).toContain('Demolisher');
      expect(result.content).toContain('Heavy Tank');
      expect(result.content).toContain('999');
      expect(result.content).toContain('2803');
      expect(result.content).toContain('IS Level 1');
      expect(result.content).toContain('80');
      expect(result.content).toContain('Tracked');
      expect(result.content).toContain('AC/20');
    });

    it('should export a Clan aerospace fighter correctly', () => {
      const clanFighter = createMockAerospaceState({
        chassis: 'Sulla',
        model: 'Prime',
        techBase: TechBase.CLAN,
        rulesLevel: RulesLevel.STANDARD,
        engineType: EngineType.XL_CLAN,
        doubleHeatSinks: true,
        armorType: ArmorTypeEnum.FERRO_FIBROUS_CLAN,
      });

      const result = service.export(clanFighter);

      expect(result.success).toBe(true);
      expect(result.content).toContain('Sulla');
      expect(result.content).toContain('Clan Level 2');
      expect(result.content).toContain('\n2\n'); // XL Clan engine code
    });
  });
});
