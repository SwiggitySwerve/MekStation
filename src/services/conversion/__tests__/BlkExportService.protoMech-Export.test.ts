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
});
