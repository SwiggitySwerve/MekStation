/**
 * ValueMappings Tests
 *
 * Tests for value mapping functions that convert MegaMekLab strings to typed enums.
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
} from '../ValueMappings';

import { TechBase } from '@/types/enums/TechBase';
import { RulesLevel } from '@/types/enums/RulesLevel';
import { Era } from '@/types/enums/Era';
import { EngineType } from '@/types/construction/EngineType';
import { InternalStructureType } from '@/types/construction/InternalStructureType';
import { HeatSinkType } from '@/types/construction/HeatSinkType';
import { ArmorTypeEnum } from '@/types/construction/ArmorType';
import { GyroType } from '@/types/construction/GyroType';
import { CockpitType } from '@/types/construction/CockpitType';
import { MechConfiguration } from '@/types/unit/BattleMechInterfaces';

describe('ValueMappings', () => {
  describe('mapTechBase', () => {
    it('should map Inner Sphere variants correctly', () => {
      expect(mapTechBase('Inner Sphere')).toBe(TechBase.INNER_SPHERE);
      expect(mapTechBase('IS')).toBe(TechBase.INNER_SPHERE);
    });

    it('should map Clan correctly', () => {
      expect(mapTechBase('Clan')).toBe(TechBase.CLAN);
    });

    it('should map Mixed variants to appropriate defaults', () => {
      expect(mapTechBase('Mixed')).toBe(TechBase.INNER_SPHERE);
      expect(mapTechBase('Mixed (IS Chassis)')).toBe(TechBase.INNER_SPHERE);
      expect(mapTechBase('Mixed (Clan Chassis)')).toBe(TechBase.CLAN);
      expect(mapTechBase('BOTH')).toBe(TechBase.INNER_SPHERE);
    });

    it('should default to INNER_SPHERE for unknown values', () => {
      expect(mapTechBase('Unknown')).toBe(TechBase.INNER_SPHERE);
      expect(mapTechBase('')).toBe(TechBase.INNER_SPHERE);
    });

    it('should handle whitespace', () => {
      expect(mapTechBase('  Clan  ')).toBe(TechBase.CLAN);
    });
  });

  describe('mapRulesLevel', () => {
    it('should map numeric levels correctly', () => {
      expect(mapRulesLevel('1')).toBe(RulesLevel.INTRODUCTORY);
      expect(mapRulesLevel('2')).toBe(RulesLevel.STANDARD);
      expect(mapRulesLevel('3')).toBe(RulesLevel.ADVANCED);
      expect(mapRulesLevel('4')).toBe(RulesLevel.EXPERIMENTAL);
    });

    it('should map numeric values correctly', () => {
      expect(mapRulesLevel(1)).toBe(RulesLevel.INTRODUCTORY);
      expect(mapRulesLevel(2)).toBe(RulesLevel.STANDARD);
      expect(mapRulesLevel(3)).toBe(RulesLevel.ADVANCED);
      expect(mapRulesLevel(4)).toBe(RulesLevel.EXPERIMENTAL);
    });

    it('should map string names correctly', () => {
      expect(mapRulesLevel('Introductory')).toBe(RulesLevel.INTRODUCTORY);
      expect(mapRulesLevel('Standard')).toBe(RulesLevel.STANDARD);
      expect(mapRulesLevel('Advanced')).toBe(RulesLevel.ADVANCED);
      expect(mapRulesLevel('Experimental')).toBe(RulesLevel.EXPERIMENTAL);
    });

    it('should default to STANDARD for unknown values', () => {
      expect(mapRulesLevel('Unknown')).toBe(RulesLevel.STANDARD);
      expect(mapRulesLevel(99)).toBe(RulesLevel.STANDARD);
    });
  });

  describe('mapEra', () => {
    it('should map numeric years to correct eras', () => {
      expect(mapEra(2400)).toBe(Era.AGE_OF_WAR);
      expect(mapEra(2700)).toBe(Era.STAR_LEAGUE);
      expect(mapEra(3000)).toBe(Era.LATE_SUCCESSION_WARS);  // 2901-3019
      expect(mapEra(3025)).toBe(Era.RENAISSANCE);           // 3020-3049
      expect(mapEra(3050)).toBe(Era.CLAN_INVASION);         // 3050-3061
      expect(mapEra(3068)).toBe(Era.JIHAD);                 // 3068-3081
      expect(mapEra(3152)).toBe(Era.IL_CLAN);               // 3151+
    });

    it('should parse year strings', () => {
      expect(mapEra('3050')).toBe(Era.CLAN_INVASION);
      expect(mapEra('3025')).toBe(Era.RENAISSANCE);  // 3020-3049
    });

    it('should map era names', () => {
      expect(mapEra('Clan Invasion')).toBe(Era.CLAN_INVASION);
      expect(mapEra('Star League')).toBe(Era.STAR_LEAGUE);
      expect(mapEra('Dark Age')).toBe(Era.DARK_AGE);
    });

    it('should default for unknown eras', () => {
      expect(mapEra('Unknown Era')).toBe(Era.LATE_SUCCESSION_WARS);
    });
  });

  describe('extractYear', () => {
    it('should return numeric year directly', () => {
      expect(extractYear(3050)).toBe(3050);
      expect(extractYear(2750)).toBe(2750);
    });

    it('should parse year strings', () => {
      expect(extractYear('3050')).toBe(3050);
      expect(extractYear('2500')).toBe(2500);
    });

    it('should estimate year from era names', () => {
      expect(extractYear('Clan Invasion')).toBe(3050);
      expect(extractYear('Star League')).toBe(2700);
      expect(extractYear('Dark Age')).toBe(3100);
    });

    it('should default to 3025 for unknown', () => {
      expect(extractYear('Unknown Era')).toBe(3025);
    });
  });

  describe('mapEngineType', () => {
    it('should map standard fusion variants', () => {
      expect(mapEngineType('Fusion Engine')).toBe(EngineType.STANDARD);
      expect(mapEngineType('Fusion')).toBe(EngineType.STANDARD);
      expect(mapEngineType('Standard')).toBe(EngineType.STANDARD);
      expect(mapEngineType('Standard Engine')).toBe(EngineType.STANDARD);
    });

    it('should map XL engine variants', () => {
      expect(mapEngineType('XL Engine')).toBe(EngineType.XL_IS);
      expect(mapEngineType('XL')).toBe(EngineType.XL_IS);
      expect(mapEngineType('XL (IS) Engine')).toBe(EngineType.XL_IS);
      expect(mapEngineType('Extra-Light Engine')).toBe(EngineType.XL_IS);
    });

    it('should map Clan XL engines', () => {
      expect(mapEngineType('XL (Clan) Engine')).toBe(EngineType.XL_CLAN);
      expect(mapEngineType('Clan XL Engine')).toBe(EngineType.XL_CLAN);
      expect(mapEngineType('Clan XL')).toBe(EngineType.XL_CLAN);
    });

    it('should use fuzzy matching with tech base for XL variants', () => {
      // Note: Direct mappings take precedence, so 'XL Engine' maps to XL_IS even with Clan tech base
      // Fuzzy matching only applies when no direct mapping exists
      expect(mapEngineType('some xl engine', TechBase.CLAN)).toBe(EngineType.XL_CLAN);
      expect(mapEngineType('some xl engine', TechBase.INNER_SPHERE)).toBe(EngineType.XL_IS);
    });

    it('should map other engine types', () => {
      expect(mapEngineType('Light Engine')).toBe(EngineType.LIGHT);
      expect(mapEngineType('XXL Engine')).toBe(EngineType.XXL);
      expect(mapEngineType('Compact Engine')).toBe(EngineType.COMPACT);
      expect(mapEngineType('ICE')).toBe(EngineType.ICE);
      expect(mapEngineType('I.C.E.')).toBe(EngineType.ICE);
      expect(mapEngineType('Fuel Cell')).toBe(EngineType.FUEL_CELL);
      expect(mapEngineType('Fission')).toBe(EngineType.FISSION);
    });

    it('should use fuzzy matching', () => {
      expect(mapEngineType('some xl engine type')).toBe(EngineType.XL_IS);
      expect(mapEngineType('light fusion engine')).toBe(EngineType.LIGHT);
      expect(mapEngineType('compact fusion')).toBe(EngineType.COMPACT);
    });

    it('should fuzzy match ICE/combustion engines', () => {
      expect(mapEngineType('internal combustion type')).toBe(EngineType.ICE);
      expect(mapEngineType('some ice engine')).toBe(EngineType.ICE);
    });

    it('should fuzzy match fuel cell engines', () => {
      expect(mapEngineType('some fuel cell type')).toBe(EngineType.FUEL_CELL);
    });

    it('should fuzzy match fission engines', () => {
      expect(mapEngineType('some fission type')).toBe(EngineType.FISSION);
    });

    it('should default to STANDARD for unknown', () => {
      expect(mapEngineType('Unknown')).toBe(EngineType.STANDARD);
    });
  });

  describe('mapStructureType', () => {
    it('should map standard structure', () => {
      expect(mapStructureType('Standard')).toBe(InternalStructureType.STANDARD);
      expect(mapStructureType('IS Standard')).toBe(InternalStructureType.STANDARD);
      expect(mapStructureType('Clan Standard')).toBe(InternalStructureType.STANDARD);
    });

    it('should map IS Endo Steel', () => {
      expect(mapStructureType('Endo Steel')).toBe(InternalStructureType.ENDO_STEEL_IS);
      expect(mapStructureType('IS Endo Steel')).toBe(InternalStructureType.ENDO_STEEL_IS);
      expect(mapStructureType('Endo-Steel')).toBe(InternalStructureType.ENDO_STEEL_IS);
    });

    it('should map Clan Endo Steel', () => {
      expect(mapStructureType('Clan Endo Steel')).toBe(InternalStructureType.ENDO_STEEL_CLAN);
      expect(mapStructureType('Endo Steel (Clan)')).toBe(InternalStructureType.ENDO_STEEL_CLAN);
    });

    it('should use fuzzy matching with tech base for Endo Steel variants', () => {
      // Direct mappings take precedence; fuzzy matching only for non-mapped strings
      expect(mapStructureType('some endo steel type', TechBase.CLAN)).toBe(InternalStructureType.ENDO_STEEL_CLAN);
      expect(mapStructureType('some endo steel type', TechBase.INNER_SPHERE)).toBe(InternalStructureType.ENDO_STEEL_IS);
    });

    it('should map other structure types', () => {
      expect(mapStructureType('Endo-Composite')).toBe(InternalStructureType.ENDO_COMPOSITE);
      expect(mapStructureType('Reinforced')).toBe(InternalStructureType.REINFORCED);
      expect(mapStructureType('Composite')).toBe(InternalStructureType.COMPOSITE);
      expect(mapStructureType('Industrial')).toBe(InternalStructureType.INDUSTRIAL);
    });

    it('should fuzzy match endo-composite structure', () => {
      expect(mapStructureType('some endo composite type')).toBe(InternalStructureType.ENDO_COMPOSITE);
    });

    it('should fuzzy match reinforced structure', () => {
      expect(mapStructureType('some reinforced type')).toBe(InternalStructureType.REINFORCED);
    });

    it('should fuzzy match composite structure', () => {
      expect(mapStructureType('some composite type')).toBe(InternalStructureType.COMPOSITE);
    });

    it('should fuzzy match industrial structure', () => {
      expect(mapStructureType('some industrial type')).toBe(InternalStructureType.INDUSTRIAL);
    });

    it('should default to STANDARD for unknown', () => {
      expect(mapStructureType('Unknown')).toBe(InternalStructureType.STANDARD);
    });
  });

  describe('mapHeatSinkType', () => {
    it('should map single heat sinks', () => {
      expect(mapHeatSinkType('Single')).toBe(HeatSinkType.SINGLE);
      expect(mapHeatSinkType('Single Heat Sink')).toBe(HeatSinkType.SINGLE);
    });

    it('should map IS double heat sinks', () => {
      expect(mapHeatSinkType('Double')).toBe(HeatSinkType.DOUBLE_IS);
      expect(mapHeatSinkType('Double Heat Sink')).toBe(HeatSinkType.DOUBLE_IS);
      expect(mapHeatSinkType('Double (IS)')).toBe(HeatSinkType.DOUBLE_IS);
    });

    it('should map Clan double heat sinks', () => {
      expect(mapHeatSinkType('Double (Clan)')).toBe(HeatSinkType.DOUBLE_CLAN);
      expect(mapHeatSinkType('Clan Double')).toBe(HeatSinkType.DOUBLE_CLAN);
    });

    it('should use fuzzy matching with tech base for double variants', () => {
      // Direct mappings take precedence; fuzzy matching only for non-mapped strings
      expect(mapHeatSinkType('some double heat sink', TechBase.CLAN)).toBe(HeatSinkType.DOUBLE_CLAN);
      expect(mapHeatSinkType('some double heat sink', TechBase.INNER_SPHERE)).toBe(HeatSinkType.DOUBLE_IS);
    });

    it('should map other heat sink types', () => {
      expect(mapHeatSinkType('Compact')).toBe(HeatSinkType.COMPACT);
      expect(mapHeatSinkType('Laser')).toBe(HeatSinkType.LASER);
    });

    it('should fuzzy match laser heat sinks', () => {
      expect(mapHeatSinkType('some laser heat sink')).toBe(HeatSinkType.LASER);
    });

    it('should fuzzy match compact heat sinks', () => {
      expect(mapHeatSinkType('some compact heat sink')).toBe(HeatSinkType.COMPACT);
    });

    it('should default to SINGLE for unknown', () => {
      expect(mapHeatSinkType('Unknown')).toBe(HeatSinkType.SINGLE);
    });
  });

  describe('mapArmorType', () => {
    it('should map standard armor', () => {
      expect(mapArmorType('Standard')).toBe(ArmorTypeEnum.STANDARD);
      expect(mapArmorType('Standard Armor')).toBe(ArmorTypeEnum.STANDARD);
    });

    it('should map IS Ferro-Fibrous', () => {
      expect(mapArmorType('Ferro-Fibrous')).toBe(ArmorTypeEnum.FERRO_FIBROUS_IS);
      expect(mapArmorType('IS Ferro-Fibrous')).toBe(ArmorTypeEnum.FERRO_FIBROUS_IS);
    });

    it('should map Clan Ferro-Fibrous', () => {
      expect(mapArmorType('Clan Ferro-Fibrous')).toBe(ArmorTypeEnum.FERRO_FIBROUS_CLAN);
      expect(mapArmorType('Ferro-Fibrous (Clan)')).toBe(ArmorTypeEnum.FERRO_FIBROUS_CLAN);
    });

    it('should use fuzzy matching with tech base for Ferro-Fibrous variants', () => {
      // Direct mappings take precedence; fuzzy matching only for non-mapped strings
      expect(mapArmorType('some ferro fibrous armor', TechBase.CLAN)).toBe(ArmorTypeEnum.FERRO_FIBROUS_CLAN);
      expect(mapArmorType('some ferro fibrous armor', TechBase.INNER_SPHERE)).toBe(ArmorTypeEnum.FERRO_FIBROUS_IS);
    });

    it('should map other armor types', () => {
      expect(mapArmorType('Light Ferro-Fibrous')).toBe(ArmorTypeEnum.LIGHT_FERRO);
      expect(mapArmorType('Heavy Ferro-Fibrous')).toBe(ArmorTypeEnum.HEAVY_FERRO);
      expect(mapArmorType('Stealth')).toBe(ArmorTypeEnum.STEALTH);
      expect(mapArmorType('Reactive')).toBe(ArmorTypeEnum.REACTIVE);
      expect(mapArmorType('Reflective')).toBe(ArmorTypeEnum.REFLECTIVE);
      expect(mapArmorType('Hardened')).toBe(ArmorTypeEnum.HARDENED);
    });

    it('should fuzzy match stealth armor', () => {
      expect(mapArmorType('some stealth armor')).toBe(ArmorTypeEnum.STEALTH);
    });

    it('should fuzzy match reactive armor', () => {
      expect(mapArmorType('some reactive armor')).toBe(ArmorTypeEnum.REACTIVE);
    });

    it('should fuzzy match reflective armor', () => {
      expect(mapArmorType('some reflective armor')).toBe(ArmorTypeEnum.REFLECTIVE);
      expect(mapArmorType('laser-reflective type')).toBe(ArmorTypeEnum.REFLECTIVE);
    });

    it('should fuzzy match hardened armor', () => {
      expect(mapArmorType('some hardened armor')).toBe(ArmorTypeEnum.HARDENED);
    });

    it('should fuzzy match heavy ferro armor', () => {
      expect(mapArmorType('some heavy ferro armor')).toBe(ArmorTypeEnum.HEAVY_FERRO);
    });

    it('should fuzzy match light ferro armor', () => {
      expect(mapArmorType('some light ferro armor')).toBe(ArmorTypeEnum.LIGHT_FERRO);
    });

    it('should default to STANDARD for unknown', () => {
      expect(mapArmorType('Unknown')).toBe(ArmorTypeEnum.STANDARD);
    });
  });

  describe('mapGyroType', () => {
    it('should map standard gyro', () => {
      expect(mapGyroType('Standard')).toBe(GyroType.STANDARD);
      expect(mapGyroType('Standard Gyro')).toBe(GyroType.STANDARD);
    });

    it('should map other gyro types', () => {
      expect(mapGyroType('Compact')).toBe(GyroType.COMPACT);
      expect(mapGyroType('Heavy Duty')).toBe(GyroType.HEAVY_DUTY);
      expect(mapGyroType('Heavy-Duty')).toBe(GyroType.HEAVY_DUTY);
      expect(mapGyroType('XL')).toBe(GyroType.XL);
      expect(mapGyroType('Extra-Light')).toBe(GyroType.XL);
    });

    it('should use fuzzy matching', () => {
      expect(mapGyroType('some compact gyro')).toBe(GyroType.COMPACT);
      expect(mapGyroType('heavy duty type')).toBe(GyroType.HEAVY_DUTY);
    });

    it('should fuzzy match XL gyro', () => {
      expect(mapGyroType('some xl gyro')).toBe(GyroType.XL);
      expect(mapGyroType('extra-light gyro')).toBe(GyroType.XL);
    });

    it('should default to STANDARD for unknown', () => {
      expect(mapGyroType('Unknown')).toBe(GyroType.STANDARD);
    });
  });

  describe('mapCockpitType', () => {
    it('should map standard cockpit', () => {
      expect(mapCockpitType('Standard')).toBe(CockpitType.STANDARD);
      expect(mapCockpitType('Standard Cockpit')).toBe(CockpitType.STANDARD);
    });

    it('should map other cockpit types', () => {
      expect(mapCockpitType('Small')).toBe(CockpitType.SMALL);
      expect(mapCockpitType('Command Console')).toBe(CockpitType.COMMAND_CONSOLE);
      expect(mapCockpitType('Torso-Mounted')).toBe(CockpitType.TORSO_MOUNTED);
      expect(mapCockpitType('Industrial')).toBe(CockpitType.INDUSTRIAL);
      expect(mapCockpitType('Primitive')).toBe(CockpitType.PRIMITIVE);
      expect(mapCockpitType('Superheavy')).toBe(CockpitType.SUPER_HEAVY);
    });

    it('should use fuzzy matching', () => {
      expect(mapCockpitType('small cockpit')).toBe(CockpitType.SMALL);
      expect(mapCockpitType('torso mounted')).toBe(CockpitType.TORSO_MOUNTED);
    });

    it('should fuzzy match command console', () => {
      expect(mapCockpitType('command console type')).toBe(CockpitType.COMMAND_CONSOLE);
    });

    it('should fuzzy match industrial cockpit', () => {
      expect(mapCockpitType('industrial cockpit type')).toBe(CockpitType.INDUSTRIAL);
    });

    it('should fuzzy match primitive cockpit', () => {
      expect(mapCockpitType('primitive cockpit type')).toBe(CockpitType.PRIMITIVE);
    });

    it('should fuzzy match superheavy cockpit', () => {
      expect(mapCockpitType('superheavy cockpit type')).toBe(CockpitType.SUPER_HEAVY);
      expect(mapCockpitType('super-heavy cockpit')).toBe(CockpitType.SUPER_HEAVY);
    });

    it('should default to STANDARD for unknown', () => {
      expect(mapCockpitType('Unknown')).toBe(CockpitType.STANDARD);
    });
  });

  describe('mapMechConfiguration', () => {
    it('should map biped configurations', () => {
      expect(mapMechConfiguration('Biped')).toBe(MechConfiguration.BIPED);
      expect(mapMechConfiguration('Biped Omnimech')).toBe(MechConfiguration.BIPED);
    });

    it('should map quad configurations', () => {
      expect(mapMechConfiguration('Quad')).toBe(MechConfiguration.QUAD);
      expect(mapMechConfiguration('Quad Omnimech')).toBe(MechConfiguration.QUAD);
    });

    it('should map other configurations', () => {
      expect(mapMechConfiguration('Tripod')).toBe(MechConfiguration.TRIPOD);
      expect(mapMechConfiguration('LAM')).toBe(MechConfiguration.LAM);
      expect(mapMechConfiguration('QuadVee')).toBe(MechConfiguration.QUADVEE);
    });

    it('should use fuzzy matching', () => {
      expect(mapMechConfiguration('quad mech')).toBe(MechConfiguration.QUAD);
      expect(mapMechConfiguration('tripod omni')).toBe(MechConfiguration.TRIPOD);
      expect(mapMechConfiguration('quad vee type')).toBe(MechConfiguration.QUADVEE);
    });

    it('should fuzzy match LAM configuration', () => {
      expect(mapMechConfiguration('some lam type')).toBe(MechConfiguration.LAM);
    });

    it('should default to BIPED for unknown', () => {
      expect(mapMechConfiguration('Unknown')).toBe(MechConfiguration.BIPED);
    });
  });

  describe('isOmniMechConfig', () => {
    it('should detect OmniMech configurations', () => {
      expect(isOmniMechConfig('Biped Omnimech')).toBe(true);
      expect(isOmniMechConfig('Quad Omnimech')).toBe(true);
      expect(isOmniMechConfig('OmniMech')).toBe(true);
    });

    it('should return false for non-OmniMech configurations', () => {
      expect(isOmniMechConfig('Biped')).toBe(false);
      expect(isOmniMechConfig('Quad')).toBe(false);
      expect(isOmniMechConfig('Standard')).toBe(false);
    });

    it('should be case-insensitive', () => {
      expect(isOmniMechConfig('OMNIMECH')).toBe(true);
      expect(isOmniMechConfig('omnimech')).toBe(true);
    });
  });
});
