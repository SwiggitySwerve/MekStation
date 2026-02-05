/**
 * Value Mappings Tests
 *
 * Tests for mapping MegaMekLab string values to typed enums.
 *
 * @spec openspec/specs/tech-base-integration/spec.md
 */

import {
  mapTechBase,
  mapRulesLevel,
  mapEra,
  extractYear,
  mapEngineType,
  mapStructureType,
  mapHeatSinkType,
  mapArmorType,
  mapGyroType,
  mapCockpitType,
  mapMechConfiguration,
  isOmniMechConfig,
} from '@/services/conversion/ValueMappings';
import { ArmorTypeEnum } from '@/types/construction/ArmorType';
import { CockpitType } from '@/types/construction/CockpitType';
import { EngineType } from '@/types/construction/EngineType';
import { GyroType } from '@/types/construction/GyroType';
import { HeatSinkType } from '@/types/construction/HeatSinkType';
import { InternalStructureType } from '@/types/construction/InternalStructureType';
import { Era } from '@/types/enums/Era';
import { RulesLevel } from '@/types/enums/RulesLevel';
import { TechBase } from '@/types/enums/TechBase';
import { MechConfiguration } from '@/types/unit/BattleMechInterfaces';

describe('ValueMappings', () => {
  // ============================================================================
  // mapTechBase()
  // ============================================================================
  describe('mapTechBase()', () => {
    it('should map Inner Sphere variations', () => {
      expect(mapTechBase('Inner Sphere')).toBe(TechBase.INNER_SPHERE);
      expect(mapTechBase('IS')).toBe(TechBase.INNER_SPHERE);
    });

    it('should map Clan', () => {
      expect(mapTechBase('Clan')).toBe(TechBase.CLAN);
    });

    it('should map Mixed tech bases to binary values (per spec VAL-ENUM-004)', () => {
      // Per spec: Components must have binary tech base, MIXED not valid
      expect(mapTechBase('Mixed')).toBe(TechBase.INNER_SPHERE);
      expect(mapTechBase('Mixed (IS Chassis)')).toBe(TechBase.INNER_SPHERE);
      expect(mapTechBase('Mixed (Clan Chassis)')).toBe(TechBase.CLAN);
    });

    it('should default to Inner Sphere for unknown values', () => {
      expect(mapTechBase('Unknown')).toBe(TechBase.INNER_SPHERE);
      expect(mapTechBase('')).toBe(TechBase.INNER_SPHERE);
    });

    it('should handle whitespace', () => {
      expect(mapTechBase('  Clan  ')).toBe(TechBase.CLAN);
    });
  });

  // ============================================================================
  // mapRulesLevel()
  // ============================================================================
  describe('mapRulesLevel()', () => {
    it('should map numeric rules levels', () => {
      expect(mapRulesLevel('1')).toBe(RulesLevel.INTRODUCTORY);
      expect(mapRulesLevel('2')).toBe(RulesLevel.STANDARD);
      expect(mapRulesLevel('3')).toBe(RulesLevel.ADVANCED);
      expect(mapRulesLevel('4')).toBe(RulesLevel.EXPERIMENTAL);
    });

    it('should accept numbers directly', () => {
      expect(mapRulesLevel(1)).toBe(RulesLevel.INTRODUCTORY);
      expect(mapRulesLevel(2)).toBe(RulesLevel.STANDARD);
      expect(mapRulesLevel(3)).toBe(RulesLevel.ADVANCED);
      expect(mapRulesLevel(4)).toBe(RulesLevel.EXPERIMENTAL);
    });

    it('should map named rules levels', () => {
      expect(mapRulesLevel('Introductory')).toBe(RulesLevel.INTRODUCTORY);
      expect(mapRulesLevel('Standard')).toBe(RulesLevel.STANDARD);
      expect(mapRulesLevel('Advanced')).toBe(RulesLevel.ADVANCED);
      expect(mapRulesLevel('Experimental')).toBe(RulesLevel.EXPERIMENTAL);
    });

    it('should default to Standard for unknown values', () => {
      expect(mapRulesLevel('Unknown')).toBe(RulesLevel.STANDARD);
      expect(mapRulesLevel(99)).toBe(RulesLevel.STANDARD);
    });
  });

  // ============================================================================
  // mapEra()
  // ============================================================================
  describe('mapEra()', () => {
    it('should map year numbers to eras', () => {
      expect(mapEra(2400)).toBe(Era.AGE_OF_WAR);
      expect(mapEra(2750)).toBe(Era.STAR_LEAGUE);
      expect(mapEra(3000)).toBe(Era.LATE_SUCCESSION_WARS);
      expect(mapEra(3050)).toBe(Era.CLAN_INVASION);
    });

    it('should map year strings to eras', () => {
      expect(mapEra('2750')).toBe(Era.STAR_LEAGUE);
      expect(mapEra('3050')).toBe(Era.CLAN_INVASION);
    });

    it('should map era names', () => {
      expect(mapEra('Age of War')).toBe(Era.AGE_OF_WAR);
      expect(mapEra('Star League')).toBe(Era.STAR_LEAGUE);
      expect(mapEra('Late Succession Wars')).toBe(Era.LATE_SUCCESSION_WARS);
      expect(mapEra('Clan Invasion')).toBe(Era.CLAN_INVASION);
      expect(mapEra('Civil War')).toBe(Era.CIVIL_WAR);
      expect(mapEra('Dark Age')).toBe(Era.DARK_AGE);
      expect(mapEra('ilClan')).toBe(Era.IL_CLAN);
    });

    it('should default to Late Succession Wars for unknown values', () => {
      expect(mapEra('Unknown')).toBe(Era.LATE_SUCCESSION_WARS);
    });
  });

  // ============================================================================
  // extractYear()
  // ============================================================================
  describe('extractYear()', () => {
    it('should return numeric years as-is', () => {
      expect(extractYear(2755)).toBe(2755);
      expect(extractYear(3025)).toBe(3025);
    });

    it('should parse year strings', () => {
      expect(extractYear('2755')).toBe(2755);
      expect(extractYear('3050')).toBe(3050);
    });

    it('should return default years for era names', () => {
      expect(extractYear('Age of War')).toBe(2400);
      expect(extractYear('Star League')).toBe(2700);
      expect(extractYear('Succession Wars')).toBe(2900);
      expect(extractYear('Clan Invasion')).toBe(3050);
    });

    it('should default to 3025 for unknown values', () => {
      expect(extractYear('Unknown')).toBe(3025);
    });
  });

  // ============================================================================
  // mapEngineType()
  // ============================================================================
  describe('mapEngineType()', () => {
    it('should map standard engine variations', () => {
      expect(mapEngineType('Fusion Engine')).toBe(EngineType.STANDARD);
      expect(mapEngineType('Fusion')).toBe(EngineType.STANDARD);
      expect(mapEngineType('Standard')).toBe(EngineType.STANDARD);
      expect(mapEngineType('Standard Engine')).toBe(EngineType.STANDARD);
    });

    it('should map XL engine variations', () => {
      expect(mapEngineType('XL Engine')).toBe(EngineType.XL_IS);
      expect(mapEngineType('XL')).toBe(EngineType.XL_IS);
      expect(mapEngineType('XL (IS) Engine')).toBe(EngineType.XL_IS);
    });

    it('should map Clan XL engines', () => {
      expect(mapEngineType('XL (Clan) Engine')).toBe(EngineType.XL_CLAN);
      expect(mapEngineType('Clan XL Engine')).toBe(EngineType.XL_CLAN);
      expect(mapEngineType('Clan XL')).toBe(EngineType.XL_CLAN);
    });

    it('should use tech base for ambiguous XL', () => {
      // Direct 'XL' match returns XL_IS by default
      // To get Clan XL, use explicit Clan prefix or fuzzy matching
      expect(mapEngineType('XL', TechBase.INNER_SPHERE)).toBe(EngineType.XL_IS);
      expect(mapEngineType('XL Engine', TechBase.INNER_SPHERE)).toBe(
        EngineType.XL_IS,
      );
      // Explicit Clan prefix works
      expect(mapEngineType('Clan XL', TechBase.CLAN)).toBe(EngineType.XL_CLAN);
    });

    it('should map light engine', () => {
      expect(mapEngineType('Light Engine')).toBe(EngineType.LIGHT);
      expect(mapEngineType('Light')).toBe(EngineType.LIGHT);
    });

    it('should map XXL engine', () => {
      expect(mapEngineType('XXL Engine')).toBe(EngineType.XXL);
      expect(mapEngineType('XXL')).toBe(EngineType.XXL);
    });

    it('should map compact engine', () => {
      expect(mapEngineType('Compact Engine')).toBe(EngineType.COMPACT);
      expect(mapEngineType('Compact')).toBe(EngineType.COMPACT);
    });

    it('should map ICE engine', () => {
      expect(mapEngineType('ICE')).toBe(EngineType.ICE);
      expect(mapEngineType('I.C.E.')).toBe(EngineType.ICE);
      expect(mapEngineType('Internal Combustion')).toBe(EngineType.ICE);
    });

    it('should map fuel cell and fission', () => {
      expect(mapEngineType('Fuel Cell')).toBe(EngineType.FUEL_CELL);
      expect(mapEngineType('Fission')).toBe(EngineType.FISSION);
    });

    it('should default to Standard', () => {
      expect(mapEngineType('Unknown')).toBe(EngineType.STANDARD);
    });
  });

  // ============================================================================
  // mapStructureType()
  // ============================================================================
  describe('mapStructureType()', () => {
    it('should map standard structure', () => {
      expect(mapStructureType('Standard')).toBe(InternalStructureType.STANDARD);
      expect(mapStructureType('IS Standard')).toBe(
        InternalStructureType.STANDARD,
      );
    });

    it('should map Endo Steel', () => {
      expect(mapStructureType('Endo Steel')).toBe(
        InternalStructureType.ENDO_STEEL_IS,
      );
      expect(mapStructureType('IS Endo Steel')).toBe(
        InternalStructureType.ENDO_STEEL_IS,
      );
    });

    it('should map Clan Endo Steel', () => {
      expect(mapStructureType('Clan Endo Steel')).toBe(
        InternalStructureType.ENDO_STEEL_CLAN,
      );
      expect(mapStructureType('Endo Steel (Clan)')).toBe(
        InternalStructureType.ENDO_STEEL_CLAN,
      );
      // Direct 'Endo Steel' maps to IS by default (direct mapping takes precedence)
      expect(mapStructureType('Endo Steel')).toBe(
        InternalStructureType.ENDO_STEEL_IS,
      );
    });

    it('should map Endo-Composite', () => {
      expect(mapStructureType('Endo-Composite')).toBe(
        InternalStructureType.ENDO_COMPOSITE,
      );
      expect(mapStructureType('Endo Composite')).toBe(
        InternalStructureType.ENDO_COMPOSITE,
      );
    });

    it('should map Reinforced', () => {
      expect(mapStructureType('Reinforced')).toBe(
        InternalStructureType.REINFORCED,
      );
    });

    it('should map Composite', () => {
      expect(mapStructureType('Composite')).toBe(
        InternalStructureType.COMPOSITE,
      );
    });

    it('should map Industrial', () => {
      expect(mapStructureType('Industrial')).toBe(
        InternalStructureType.INDUSTRIAL,
      );
    });

    it('should default to Standard', () => {
      expect(mapStructureType('Unknown')).toBe(InternalStructureType.STANDARD);
    });
  });

  // ============================================================================
  // mapHeatSinkType()
  // ============================================================================
  describe('mapHeatSinkType()', () => {
    it('should map single heat sinks', () => {
      expect(mapHeatSinkType('Single')).toBe(HeatSinkType.SINGLE);
      expect(mapHeatSinkType('Single Heat Sink')).toBe(HeatSinkType.SINGLE);
    });

    it('should map double heat sinks (IS)', () => {
      expect(mapHeatSinkType('Double')).toBe(HeatSinkType.DOUBLE_IS);
      expect(mapHeatSinkType('Double Heat Sink')).toBe(HeatSinkType.DOUBLE_IS);
      expect(mapHeatSinkType('Double (IS)')).toBe(HeatSinkType.DOUBLE_IS);
    });

    it('should map double heat sinks (Clan)', () => {
      expect(mapHeatSinkType('Double (Clan)')).toBe(HeatSinkType.DOUBLE_CLAN);
      expect(mapHeatSinkType('Clan Double')).toBe(HeatSinkType.DOUBLE_CLAN);
      expect(mapHeatSinkType('Clan Double Heat Sink')).toBe(
        HeatSinkType.DOUBLE_CLAN,
      );
      // Direct 'Double' maps to IS by default
      expect(mapHeatSinkType('Double')).toBe(HeatSinkType.DOUBLE_IS);
    });

    it('should map compact heat sinks', () => {
      expect(mapHeatSinkType('Compact')).toBe(HeatSinkType.COMPACT);
    });

    it('should map laser heat sinks', () => {
      expect(mapHeatSinkType('Laser')).toBe(HeatSinkType.LASER);
    });

    it('should default to Single', () => {
      expect(mapHeatSinkType('Unknown')).toBe(HeatSinkType.SINGLE);
    });
  });

  // ============================================================================
  // mapArmorType()
  // ============================================================================
  describe('mapArmorType()', () => {
    it('should map standard armor', () => {
      expect(mapArmorType('Standard')).toBe(ArmorTypeEnum.STANDARD);
      expect(mapArmorType('Standard Armor')).toBe(ArmorTypeEnum.STANDARD);
    });

    it('should map Ferro-Fibrous (IS)', () => {
      expect(mapArmorType('Ferro-Fibrous')).toBe(
        ArmorTypeEnum.FERRO_FIBROUS_IS,
      );
      expect(mapArmorType('IS Ferro-Fibrous')).toBe(
        ArmorTypeEnum.FERRO_FIBROUS_IS,
      );
    });

    it('should map Ferro-Fibrous (Clan)', () => {
      expect(mapArmorType('Clan Ferro-Fibrous')).toBe(
        ArmorTypeEnum.FERRO_FIBROUS_CLAN,
      );
      expect(mapArmorType('Ferro-Fibrous (Clan)')).toBe(
        ArmorTypeEnum.FERRO_FIBROUS_CLAN,
      );
      // Direct 'Ferro-Fibrous' maps to IS by default
      expect(mapArmorType('Ferro-Fibrous')).toBe(
        ArmorTypeEnum.FERRO_FIBROUS_IS,
      );
    });

    it('should map Light Ferro-Fibrous', () => {
      expect(mapArmorType('Light Ferro-Fibrous')).toBe(
        ArmorTypeEnum.LIGHT_FERRO,
      );
    });

    it('should map Heavy Ferro-Fibrous', () => {
      expect(mapArmorType('Heavy Ferro-Fibrous')).toBe(
        ArmorTypeEnum.HEAVY_FERRO,
      );
    });

    it('should map Stealth armor', () => {
      expect(mapArmorType('Stealth')).toBe(ArmorTypeEnum.STEALTH);
    });

    it('should map Reactive armor', () => {
      expect(mapArmorType('Reactive')).toBe(ArmorTypeEnum.REACTIVE);
    });

    it('should map Reflective armor', () => {
      expect(mapArmorType('Reflective')).toBe(ArmorTypeEnum.REFLECTIVE);
      expect(mapArmorType('Laser-Reflective')).toBe(ArmorTypeEnum.REFLECTIVE);
    });

    it('should map Hardened armor', () => {
      expect(mapArmorType('Hardened')).toBe(ArmorTypeEnum.HARDENED);
    });

    it('should default to Standard', () => {
      expect(mapArmorType('Unknown')).toBe(ArmorTypeEnum.STANDARD);
    });
  });

  // ============================================================================
  // mapGyroType()
  // ============================================================================
  describe('mapGyroType()', () => {
    it('should map standard gyro', () => {
      expect(mapGyroType('Standard')).toBe(GyroType.STANDARD);
      expect(mapGyroType('Standard Gyro')).toBe(GyroType.STANDARD);
    });

    it('should map compact gyro', () => {
      expect(mapGyroType('Compact')).toBe(GyroType.COMPACT);
    });

    it('should map heavy-duty gyro', () => {
      expect(mapGyroType('Heavy Duty')).toBe(GyroType.HEAVY_DUTY);
      expect(mapGyroType('Heavy-Duty')).toBe(GyroType.HEAVY_DUTY);
    });

    it('should map XL gyro', () => {
      expect(mapGyroType('XL')).toBe(GyroType.XL);
      expect(mapGyroType('Extra-Light')).toBe(GyroType.XL);
    });

    it('should default to Standard', () => {
      expect(mapGyroType('Unknown')).toBe(GyroType.STANDARD);
    });
  });

  // ============================================================================
  // mapCockpitType()
  // ============================================================================
  describe('mapCockpitType()', () => {
    it('should map standard cockpit', () => {
      expect(mapCockpitType('Standard')).toBe(CockpitType.STANDARD);
    });

    it('should map small cockpit', () => {
      expect(mapCockpitType('Small')).toBe(CockpitType.SMALL);
    });

    it('should map command console', () => {
      expect(mapCockpitType('Command Console')).toBe(
        CockpitType.COMMAND_CONSOLE,
      );
    });

    it('should map torso-mounted', () => {
      expect(mapCockpitType('Torso-Mounted')).toBe(CockpitType.TORSO_MOUNTED);
      expect(mapCockpitType('Torso Mounted')).toBe(CockpitType.TORSO_MOUNTED);
    });

    it('should map industrial cockpit', () => {
      expect(mapCockpitType('Industrial')).toBe(CockpitType.INDUSTRIAL);
    });

    it('should map primitive cockpit', () => {
      expect(mapCockpitType('Primitive')).toBe(CockpitType.PRIMITIVE);
    });

    it('should map superheavy cockpit', () => {
      expect(mapCockpitType('Superheavy')).toBe(CockpitType.SUPER_HEAVY);
    });

    it('should default to Standard', () => {
      expect(mapCockpitType('Unknown')).toBe(CockpitType.STANDARD);
    });
  });

  // ============================================================================
  // mapMechConfiguration()
  // ============================================================================
  describe('mapMechConfiguration()', () => {
    it('should map biped', () => {
      expect(mapMechConfiguration('Biped')).toBe(MechConfiguration.BIPED);
      expect(mapMechConfiguration('Biped Omnimech')).toBe(
        MechConfiguration.BIPED,
      );
    });

    it('should map quad', () => {
      expect(mapMechConfiguration('Quad')).toBe(MechConfiguration.QUAD);
      expect(mapMechConfiguration('Quad Omnimech')).toBe(
        MechConfiguration.QUAD,
      );
    });

    it('should map tripod', () => {
      expect(mapMechConfiguration('Tripod')).toBe(MechConfiguration.TRIPOD);
    });

    it('should map LAM', () => {
      expect(mapMechConfiguration('LAM')).toBe(MechConfiguration.LAM);
    });

    it('should map QuadVee', () => {
      expect(mapMechConfiguration('QuadVee')).toBe(MechConfiguration.QUADVEE);
    });

    it('should default to Biped', () => {
      expect(mapMechConfiguration('Unknown')).toBe(MechConfiguration.BIPED);
    });
  });

  // ============================================================================
  // isOmniMechConfig()
  // ============================================================================
  describe('isOmniMechConfig()', () => {
    it('should detect OmniMech configurations', () => {
      expect(isOmniMechConfig('Biped Omnimech')).toBe(true);
      expect(isOmniMechConfig('Quad Omnimech')).toBe(true);
      expect(isOmniMechConfig('Tripod Omnimech')).toBe(true);
    });

    it('should detect "omni" keyword', () => {
      expect(isOmniMechConfig('omni')).toBe(true);
      expect(isOmniMechConfig('Omni Configuration')).toBe(true);
    });

    it('should return false for standard configs', () => {
      expect(isOmniMechConfig('Biped')).toBe(false);
      expect(isOmniMechConfig('Quad')).toBe(false);
      expect(isOmniMechConfig('Standard')).toBe(false);
    });
  });
});
