/**
 * BlkExportServiceCore.formatters Tests
 *
 * Tier 1 invariant tests for the BLK code-token formatters. BLK is a numeric
 * tag-based format used by MegaMek for vehicles, aerospace, battle armor,
 * infantry, and protomechs. Each enum value must serialize to a specific
 * numeric or short-string code that MegaMek's BLK parser expects on the
 * round-trip. Wrong codes break unit imports in the real MegaMek client.
 *
 * Tests assert the exact code per enum member, fallback values, and the
 * armor-line layout (newline-joined order) per chassis type.
 */

import type { ProtoMechState } from '@/stores/protoMechState';

import { ArmorTypeEnum } from '@/types/construction/ArmorType';
import { EngineType } from '@/types/construction/EngineType';
import {
  AerospaceLocation,
  ProtoMechLocation,
  VTOLLocation,
  VehicleLocation,
} from '@/types/construction/UnitLocation';
import { RulesLevel } from '@/types/enums/RulesLevel';
import { TechBase } from '@/types/enums/TechBase';
import {
  GroundMotionType,
  SquadMotionType,
} from '@/types/unit/BaseUnitInterfaces';
import {
  BattleArmorChassisType,
  BattleArmorWeightClass,
} from '@/types/unit/PersonnelInterfaces';

import {
  aerospaceLocationToBlockName,
  formatAerospaceArmor,
  formatArmorTechCode,
  formatArmorTypeCode,
  formatBAChassisType,
  formatBAMotionType,
  formatBAWeightClass,
  formatEngineTypeCode,
  formatInfantryMotionType,
  formatMotionType,
  formatProtoMechArmor,
  formatTechType,
  formatVehicleArmor,
} from '../BlkExportServiceCore.formatters';

describe('BlkExportServiceCore.formatters', () => {
  // ============================================================================
  // formatMotionType() — vehicle motion (Tracked/Wheeled/etc)
  // ============================================================================
  describe('formatMotionType()', () => {
    it.each([
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
    ])('formats %s to "%s"', (input, expected) => {
      expect(formatMotionType(input)).toBe(expected);
    });

    it('falls back to "Tracked" for an unknown motion type', () => {
      expect(formatMotionType('UNKNOWN' as GroundMotionType)).toBe('Tracked');
    });
  });

  // ============================================================================
  // formatBAMotionType / formatInfantryMotionType — pass-through (with FOOT default)
  // ============================================================================
  describe('formatBAMotionType()', () => {
    it('passes through known squad motion types', () => {
      expect(formatBAMotionType(SquadMotionType.JUMP)).toBe(
        SquadMotionType.JUMP,
      );
      expect(formatBAMotionType(SquadMotionType.UMU)).toBe(SquadMotionType.UMU);
    });

    it('falls back to FOOT for falsy input', () => {
      expect(formatBAMotionType('' as SquadMotionType)).toBe(
        SquadMotionType.FOOT,
      );
    });
  });

  describe('formatInfantryMotionType()', () => {
    it('passes through known squad motion types', () => {
      expect(formatInfantryMotionType(SquadMotionType.MECHANIZED)).toBe(
        SquadMotionType.MECHANIZED,
      );
    });

    it('falls back to FOOT for falsy input', () => {
      expect(formatInfantryMotionType('' as SquadMotionType)).toBe(
        SquadMotionType.FOOT,
      );
    });
  });

  // ============================================================================
  // formatBAChassisType()
  // ============================================================================
  describe('formatBAChassisType()', () => {
    it('passes through known chassis types', () => {
      expect(formatBAChassisType(BattleArmorChassisType.BIPED)).toBe(
        BattleArmorChassisType.BIPED,
      );
      expect(formatBAChassisType(BattleArmorChassisType.QUAD)).toBe(
        BattleArmorChassisType.QUAD,
      );
    });

    it('falls back to BIPED for falsy input', () => {
      expect(formatBAChassisType('' as BattleArmorChassisType)).toBe(
        BattleArmorChassisType.BIPED,
      );
    });
  });

  // ============================================================================
  // formatBAWeightClass() — must emit "0".."4" numeric codes
  // ============================================================================
  describe('formatBAWeightClass()', () => {
    it.each([
      [BattleArmorWeightClass.PA_L, '0'],
      [BattleArmorWeightClass.LIGHT, '1'],
      [BattleArmorWeightClass.MEDIUM, '2'],
      [BattleArmorWeightClass.HEAVY, '3'],
      [BattleArmorWeightClass.ASSAULT, '4'],
    ])('formats %s to "%s"', (input, expected) => {
      expect(formatBAWeightClass(input)).toBe(expected);
    });

    it('falls back to "2" (MEDIUM) for unknown', () => {
      expect(formatBAWeightClass('UNKNOWN' as BattleArmorWeightClass)).toBe(
        '2',
      );
    });
  });

  // ============================================================================
  // formatTechType() — combines techbase + rules level
  // ============================================================================
  describe('formatTechType()', () => {
    it('formats IS + STANDARD as "IS Level 2"', () => {
      expect(formatTechType(TechBase.INNER_SPHERE, RulesLevel.STANDARD)).toBe(
        'IS Level 2',
      );
    });

    it('formats Clan + EXPERIMENTAL as "Clan Level 4"', () => {
      expect(formatTechType(TechBase.CLAN, RulesLevel.EXPERIMENTAL)).toBe(
        'Clan Level 4',
      );
    });

    it.each([
      [RulesLevel.INTRODUCTORY, 'IS Level 1'],
      [RulesLevel.STANDARD, 'IS Level 2'],
      [RulesLevel.ADVANCED, 'IS Level 3'],
      [RulesLevel.EXPERIMENTAL, 'IS Level 4'],
    ])('IS + %s formats to "%s"', (level, expected) => {
      expect(formatTechType(TechBase.INNER_SPHERE, level)).toBe(expected);
    });

    it('falls back to Level 2 for an unknown rules level', () => {
      expect(
        formatTechType(TechBase.INNER_SPHERE, 'UNKNOWN' as RulesLevel),
      ).toBe('IS Level 2');
    });
  });

  // ============================================================================
  // formatEngineTypeCode() — must emit numeric code "0".."8" per MegaMek
  // ============================================================================
  describe('formatEngineTypeCode()', () => {
    it.each([
      [EngineType.STANDARD, '0'],
      [EngineType.XL_IS, '1'],
      [EngineType.XL_CLAN, '2'],
      [EngineType.LIGHT, '3'],
      [EngineType.COMPACT, '4'],
      [EngineType.XXL, '5'],
      [EngineType.ICE, '6'],
      [EngineType.FUEL_CELL, '7'],
      [EngineType.FISSION, '8'],
    ])('formats %s to "%s"', (input, expected) => {
      expect(formatEngineTypeCode(input)).toBe(expected);
    });

    it('falls back to "0" (Standard) for unknown', () => {
      expect(formatEngineTypeCode('UNKNOWN' as EngineType)).toBe('0');
    });
  });

  // ============================================================================
  // formatArmorTypeCode() — must emit numeric code "0".."8" per MegaMek
  // ============================================================================
  describe('formatArmorTypeCode()', () => {
    it.each([
      [ArmorTypeEnum.STANDARD, '0'],
      [ArmorTypeEnum.FERRO_FIBROUS_IS, '1'],
      [ArmorTypeEnum.FERRO_FIBROUS_CLAN, '2'],
      [ArmorTypeEnum.LIGHT_FERRO, '3'],
      [ArmorTypeEnum.HEAVY_FERRO, '4'],
      [ArmorTypeEnum.STEALTH, '5'],
      [ArmorTypeEnum.REACTIVE, '6'],
      [ArmorTypeEnum.REFLECTIVE, '7'],
      [ArmorTypeEnum.HARDENED, '8'],
    ])('formats %s to "%s"', (input, expected) => {
      expect(formatArmorTypeCode(input)).toBe(expected);
    });

    it('falls back to "0" (Standard) for unknown', () => {
      expect(formatArmorTypeCode('UNKNOWN' as ArmorTypeEnum)).toBe('0');
    });
  });

  // ============================================================================
  // formatArmorTechCode() — "1" for IS, "2" for Clan
  // ============================================================================
  describe('formatArmorTechCode()', () => {
    it('returns "2" for Clan', () => {
      expect(formatArmorTechCode(TechBase.CLAN)).toBe('2');
    });

    it('returns "1" for Inner Sphere', () => {
      expect(formatArmorTechCode(TechBase.INNER_SPHERE)).toBe('1');
    });
  });

  // ============================================================================
  // formatVehicleArmor() — newline-joined Front/Left/Right/Rear/Turret(/Rotor)
  // ============================================================================
  describe('formatVehicleArmor()', () => {
    it('emits Front/Left/Right/Rear/Turret on a non-VTOL vehicle', () => {
      const allocation = {
        [VehicleLocation.FRONT]: 30,
        [VehicleLocation.LEFT]: 25,
        [VehicleLocation.RIGHT]: 25,
        [VehicleLocation.REAR]: 20,
        [VehicleLocation.TURRET]: 15,
      };
      expect(formatVehicleArmor(allocation, false)).toBe('30\n25\n25\n20\n15');
    });

    it('appends Rotor as a 6th line for VTOLs', () => {
      const allocation: Record<string, number> = {
        [VehicleLocation.FRONT]: 10,
        [VehicleLocation.LEFT]: 10,
        [VehicleLocation.RIGHT]: 10,
        [VehicleLocation.REAR]: 10,
        [VehicleLocation.TURRET]: 0,
        [VTOLLocation.ROTOR]: 2,
      };
      expect(formatVehicleArmor(allocation, true)).toBe('10\n10\n10\n10\n0\n2');
    });

    it('emits zeros for missing locations', () => {
      expect(formatVehicleArmor({}, false)).toBe('0\n0\n0\n0\n0');
      expect(formatVehicleArmor({}, true)).toBe('0\n0\n0\n0\n0\n0');
    });
  });

  // ============================================================================
  // formatAerospaceArmor() — newline-joined Nose/LeftWing/RightWing/Aft
  // ============================================================================
  describe('formatAerospaceArmor()', () => {
    it('emits Nose/LeftWing/RightWing/Aft in that order', () => {
      const allocation = {
        [AerospaceLocation.NOSE]: 60,
        [AerospaceLocation.LEFT_WING]: 50,
        [AerospaceLocation.RIGHT_WING]: 50,
        [AerospaceLocation.AFT]: 40,
      };
      expect(formatAerospaceArmor(allocation)).toBe('60\n50\n50\n40');
    });

    it('emits zeros for missing arcs', () => {
      expect(formatAerospaceArmor({})).toBe('0\n0\n0\n0');
    });
  });

  // ============================================================================
  // formatProtoMechArmor() — newline-joined Head/Torso/LA/RA/Legs/MainGun
  // ============================================================================
  describe('formatProtoMechArmor()', () => {
    it('emits Head/Torso/LA/RA/Legs/MainGun in that order', () => {
      const unit = {
        armorByLocation: {
          [ProtoMechLocation.HEAD]: 2,
          [ProtoMechLocation.TORSO]: 8,
          [ProtoMechLocation.LEFT_ARM]: 4,
          [ProtoMechLocation.RIGHT_ARM]: 4,
          [ProtoMechLocation.LEGS]: 6,
          [ProtoMechLocation.MAIN_GUN]: 3,
        },
      } as unknown as ProtoMechState;
      expect(formatProtoMechArmor(unit)).toBe('2\n8\n4\n4\n6\n3');
    });

    it('emits zeros for missing locations', () => {
      const unit = { armorByLocation: {} } as unknown as ProtoMechState;
      expect(formatProtoMechArmor(unit)).toBe('0\n0\n0\n0\n0\n0');
    });
  });

  // ============================================================================
  // aerospaceLocationToBlockName()
  // ============================================================================
  describe('aerospaceLocationToBlockName()', () => {
    it.each([
      [AerospaceLocation.NOSE, 'Nose'],
      [AerospaceLocation.LEFT_WING, 'Left Wing'],
      [AerospaceLocation.RIGHT_WING, 'Right Wing'],
      [AerospaceLocation.AFT, 'Aft'],
      [AerospaceLocation.FUSELAGE, 'Fuselage'],
    ])('maps %s to "%s"', (input, expected) => {
      expect(aerospaceLocationToBlockName(input)).toBe(expected);
    });

    it('falls back to "Nose" for unknown', () => {
      expect(aerospaceLocationToBlockName('UNKNOWN' as AerospaceLocation)).toBe(
        'Nose',
      );
    });
  });
});
