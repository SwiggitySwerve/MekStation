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
      // Hard-cutover policy (PR2 cluster K): the legacy `fuel` field was
      // removed from AerospaceState. The BLK exporter now emits the
      // computed `fuelPoints` value (fuelTons × points/ton).
      const aero = createMockAerospaceState({ fuelPoints: 480 });
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
});
