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
          [VehicleLocation.TURRET_2]: 0,
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
