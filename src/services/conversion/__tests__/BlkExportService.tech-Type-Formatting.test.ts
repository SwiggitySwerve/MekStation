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
});
