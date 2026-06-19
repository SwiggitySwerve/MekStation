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

import {
  createMockVehicleState,
  createMockVTOLState,
  createMockAerospaceState,
  createMockBattleArmorState,
  createMockInfantryState,
  createMockProtoMechState,
} from './BlkExportService.test-helpers';

describe('BlkExportService', () => {
  let service: BlkExportService;

  beforeEach(() => {
    service = getBlkExportService();
  });

  // ============================================================================
  // Singleton Pattern
  // ============================================================================
  // ============================================================================
  // ============================================================================
  // Vehicle Export Tests
  // ============================================================================
  // ============================================================================
  // Aerospace Export Tests
  // ============================================================================
  // ============================================================================
  // Battle Armor Export Tests
  // ============================================================================
  // ============================================================================
  // Infantry Export Tests
  // ============================================================================
  // ============================================================================
  // ProtoMech Export Tests
  // ============================================================================
  // ============================================================================
  // Tech Type Formatting Tests
  // ============================================================================
  // ============================================================================
  // Tag Formatting Tests
  // ============================================================================
  // ============================================================================
  // Round-Trip Testing
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
          [VehicleLocation.TURRET_2]: 0,
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
          [VehicleLocation.TURRET_2]: 0,
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
});
