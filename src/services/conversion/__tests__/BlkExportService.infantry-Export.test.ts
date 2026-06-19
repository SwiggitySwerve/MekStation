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
});
