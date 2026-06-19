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
});
