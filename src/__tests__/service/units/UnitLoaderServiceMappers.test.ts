import { TechBase } from '@/types/enums/TechBase';
import { RulesLevel } from '@/types/enums/RulesLevel';
import { EngineType } from '@/types/construction/EngineType';
import { GyroType } from '@/types/construction/GyroType';
import { InternalStructureType } from '@/types/construction/InternalStructureType';
import { CockpitType } from '@/types/construction/CockpitType';
import { HeatSinkType } from '@/types/construction/HeatSinkType';
import { ArmorTypeEnum } from '@/types/construction/ArmorType';
import { MechLocation } from '@/types/construction/CriticalSlotAllocation';
import { TechBaseMode } from '@/types/construction/TechBaseConfiguration';
import {
  mapEngineType,
  mapGyroType,
  mapStructureType,
  mapCockpitType,
  mapHeatSinkType,
  mapArmorType,
  mapTechBase,
  mapTechBaseMode,
  mapRulesLevel,
  mapMechLocation,
  mapArmorAllocation,
} from '@/services/units/unitLoaderService/componentMappers';

describe('UnitLoaderService Component Mappers', () => {
  describe('mapEngineType', () => {
    it('should map standard fusion engines', () => {
      expect(mapEngineType('Fusion', TechBase.INNER_SPHERE)).toBe(EngineType.STANDARD);
      expect(mapEngineType('Standard', TechBase.INNER_SPHERE)).toBe(EngineType.STANDARD);
      expect(mapEngineType('Standard Fusion', TechBase.INNER_SPHERE)).toBe(EngineType.STANDARD);
    });

    it('should map XL engines based on tech base', () => {
      expect(mapEngineType('XL', TechBase.INNER_SPHERE)).toBe(EngineType.XL_IS);
      expect(mapEngineType('XL', TechBase.CLAN)).toBe(EngineType.XL_CLAN);
    });

    it('should map specific XL engines', () => {
      expect(mapEngineType('XL IS', TechBase.CLAN)).toBe(EngineType.XL_IS);
      expect(mapEngineType('XL Clan', TechBase.INNER_SPHERE)).toBe(EngineType.XL_CLAN);
    });

    it('should map other engine types', () => {
      expect(mapEngineType('Light', TechBase.INNER_SPHERE)).toBe(EngineType.LIGHT);
      expect(mapEngineType('XXL', TechBase.INNER_SPHERE)).toBe(EngineType.XXL);
      expect(mapEngineType('Compact', TechBase.INNER_SPHERE)).toBe(EngineType.COMPACT);
      expect(mapEngineType('ICE', TechBase.INNER_SPHERE)).toBe(EngineType.ICE);
      expect(mapEngineType('Internal Combustion', TechBase.INNER_SPHERE)).toBe(EngineType.ICE);
      expect(mapEngineType('Fuel Cell', TechBase.INNER_SPHERE)).toBe(EngineType.FUEL_CELL);
      expect(mapEngineType('Fission', TechBase.INNER_SPHERE)).toBe(EngineType.FISSION);
    });

    it('should default to standard for unknown types', () => {
      expect(mapEngineType('Unknown', TechBase.INNER_SPHERE)).toBe(EngineType.STANDARD);
    });
  });

  describe('mapGyroType', () => {
    it('should map gyro types', () => {
      expect(mapGyroType('XL')).toBe(GyroType.XL);
      expect(mapGyroType('Compact')).toBe(GyroType.COMPACT);
      expect(mapGyroType('Heavy Duty')).toBe(GyroType.HEAVY_DUTY);
      expect(mapGyroType('Standard')).toBe(GyroType.STANDARD);
    });

    it('should handle variations', () => {
      expect(mapGyroType('XL Gyro')).toBe(GyroType.XL);
      expect(mapGyroType('HD')).toBe(GyroType.HEAVY_DUTY);
    });
  });

  describe('mapStructureType', () => {
    it('should map standard and endo steel based on tech base', () => {
      expect(mapStructureType('Standard', TechBase.INNER_SPHERE)).toBe(InternalStructureType.STANDARD);
      expect(mapStructureType('Endo Steel', TechBase.INNER_SPHERE)).toBe(InternalStructureType.ENDO_STEEL_IS);
      expect(mapStructureType('Endo Steel', TechBase.CLAN)).toBe(InternalStructureType.ENDO_STEEL_CLAN);
    });

    it('should map specific endo steel types', () => {
      expect(mapStructureType('Endo Steel IS', TechBase.CLAN)).toBe(InternalStructureType.ENDO_STEEL_IS);
      expect(mapStructureType('Endo Steel Clan', TechBase.INNER_SPHERE)).toBe(InternalStructureType.ENDO_STEEL_CLAN);
    });

    it('should map advanced structure types', () => {
      expect(mapStructureType('Endo-Composite', TechBase.INNER_SPHERE)).toBe(InternalStructureType.ENDO_COMPOSITE);
      expect(mapStructureType('Reinforced', TechBase.INNER_SPHERE)).toBe(InternalStructureType.REINFORCED);
      expect(mapStructureType('Composite', TechBase.INNER_SPHERE)).toBe(InternalStructureType.COMPOSITE);
      expect(mapStructureType('Industrial', TechBase.INNER_SPHERE)).toBe(InternalStructureType.INDUSTRIAL);
    });
  });

  describe('mapCockpitType', () => {
    it('should map cockpit types', () => {
      expect(mapCockpitType('Standard')).toBe(CockpitType.STANDARD);
      expect(mapCockpitType('Small')).toBe(CockpitType.SMALL);
      expect(mapCockpitType('Command Console')).toBe(CockpitType.COMMAND_CONSOLE);
      expect(mapCockpitType('Torso Mounted')).toBe(CockpitType.TORSO_MOUNTED);
      expect(mapCockpitType('Primitive')).toBe(CockpitType.PRIMITIVE);
      expect(mapCockpitType('Industrial')).toBe(CockpitType.INDUSTRIAL);
      expect(mapCockpitType('Super Heavy')).toBe(CockpitType.SUPER_HEAVY);
    });
  });

  describe('mapHeatSinkType', () => {
    it('should map heat sink types', () => {
      expect(mapHeatSinkType('Single')).toBe(HeatSinkType.SINGLE);
      expect(mapHeatSinkType('Double')).toBe(HeatSinkType.DOUBLE_IS);
      expect(mapHeatSinkType('Double Clan')).toBe(HeatSinkType.DOUBLE_CLAN);
      expect(mapHeatSinkType('Laser')).toBe(HeatSinkType.LASER);
      expect(mapHeatSinkType('Compact')).toBe(HeatSinkType.COMPACT);
    });

    it('should handle variations', () => {
      expect(mapHeatSinkType('DHS')).toBe(HeatSinkType.DOUBLE_IS);
      expect(mapHeatSinkType('Double IS')).toBe(HeatSinkType.DOUBLE_IS);
    });
  });

  describe('mapArmorType', () => {
    it('should map armor types based on tech base', () => {
      expect(mapArmorType('Standard', TechBase.INNER_SPHERE)).toBe(ArmorTypeEnum.STANDARD);
      expect(mapArmorType('Ferro-Fibrous', TechBase.INNER_SPHERE)).toBe(ArmorTypeEnum.FERRO_FIBROUS_IS);
      expect(mapArmorType('Ferro-Fibrous', TechBase.CLAN)).toBe(ArmorTypeEnum.FERRO_FIBROUS_CLAN);
    });

    it('should map specific ferro types', () => {
      expect(mapArmorType('Ferro-Fibrous IS', TechBase.CLAN)).toBe(ArmorTypeEnum.FERRO_FIBROUS_IS);
      expect(mapArmorType('Ferro-Fibrous Clan', TechBase.INNER_SPHERE)).toBe(ArmorTypeEnum.FERRO_FIBROUS_CLAN);
      expect(mapArmorType('Light Ferro', TechBase.INNER_SPHERE)).toBe(ArmorTypeEnum.LIGHT_FERRO);
      expect(mapArmorType('Heavy Ferro', TechBase.INNER_SPHERE)).toBe(ArmorTypeEnum.HEAVY_FERRO);
    });

    it('should map advanced armor types', () => {
      expect(mapArmorType('Stealth', TechBase.INNER_SPHERE)).toBe(ArmorTypeEnum.STEALTH);
      expect(mapArmorType('Reactive', TechBase.INNER_SPHERE)).toBe(ArmorTypeEnum.REACTIVE);
      expect(mapArmorType('Reflective', TechBase.INNER_SPHERE)).toBe(ArmorTypeEnum.REFLECTIVE);
      expect(mapArmorType('Hardened', TechBase.INNER_SPHERE)).toBe(ArmorTypeEnum.HARDENED);
    });
  });

  describe('mapTechBase', () => {
    it('should map tech base strings', () => {
      expect(mapTechBase('Inner Sphere')).toBe(TechBase.INNER_SPHERE);
      expect(mapTechBase('Clan')).toBe(TechBase.CLAN);
      expect(mapTechBase('Mixed')).toBe(TechBase.INNER_SPHERE);
    });
  });

  describe('mapTechBaseMode', () => {
    it('should map tech base mode strings', () => {
      expect(mapTechBaseMode('Inner Sphere')).toBe(TechBaseMode.INNER_SPHERE);
      expect(mapTechBaseMode('Clan')).toBe(TechBaseMode.CLAN);
      expect(mapTechBaseMode('Mixed')).toBe(TechBaseMode.MIXED);
    });
  });

  describe('mapRulesLevel', () => {
    it('should map rules level strings', () => {
      expect(mapRulesLevel('Introductory')).toBe(RulesLevel.INTRODUCTORY);
      expect(mapRulesLevel('Standard')).toBe(RulesLevel.STANDARD);
      expect(mapRulesLevel('Advanced')).toBe(RulesLevel.ADVANCED);
      expect(mapRulesLevel('Experimental')).toBe(RulesLevel.EXPERIMENTAL);
    });

    it('should handle variations', () => {
      expect(mapRulesLevel('Intro')).toBe(RulesLevel.INTRODUCTORY);
    });
  });

  describe('mapMechLocation', () => {
    it('should map location strings and abbreviations', () => {
      expect(mapMechLocation('Head')).toBe(MechLocation.HEAD);
      expect(mapMechLocation('HD')).toBe(MechLocation.HEAD);
      expect(mapMechLocation('Center Torso')).toBe(MechLocation.CENTER_TORSO);
      expect(mapMechLocation('CT')).toBe(MechLocation.CENTER_TORSO);
      expect(mapMechLocation('Left Torso')).toBe(MechLocation.LEFT_TORSO);
      expect(mapMechLocation('LT')).toBe(MechLocation.LEFT_TORSO);
      expect(mapMechLocation('Right Torso')).toBe(MechLocation.RIGHT_TORSO);
      expect(mapMechLocation('RT')).toBe(MechLocation.RIGHT_TORSO);
      expect(mapMechLocation('Left Arm')).toBe(MechLocation.LEFT_ARM);
      expect(mapMechLocation('LA')).toBe(MechLocation.LEFT_ARM);
      expect(mapMechLocation('Right Arm')).toBe(MechLocation.RIGHT_ARM);
      expect(mapMechLocation('RA')).toBe(MechLocation.RIGHT_ARM);
      expect(mapMechLocation('Left Leg')).toBe(MechLocation.LEFT_LEG);
      expect(mapMechLocation('LL')).toBe(MechLocation.LEFT_LEG);
      expect(mapMechLocation('Right Leg')).toBe(MechLocation.RIGHT_LEG);
      expect(mapMechLocation('RL')).toBe(MechLocation.RIGHT_LEG);
    });

    it('should return undefined for unknown locations', () => {
      expect(mapMechLocation('Unknown')).toBeUndefined();
    });
  });

  describe('mapArmorAllocation', () => {
    it('should handle undefined allocation', () => {
      const result = mapArmorAllocation(undefined);
      expect(result[MechLocation.HEAD]).toBe(0);
    });

    it('should map simple numeric values', () => {
      const allocation = {
        'Head': 9,
        'Center Torso': 30,
      };
      const result = mapArmorAllocation(allocation);
      expect(result[MechLocation.HEAD]).toBe(9);
      expect(result[MechLocation.CENTER_TORSO]).toBe(30);
    });

    it('should map object values with front and rear', () => {
      const allocation = {
        'Center Torso': { front: 30, rear: 10 },
        'Left Torso': { front: 20, rear: 8 },
        'Right Torso': { front: 20, rear: 8 },
      };
      const result = mapArmorAllocation(allocation);
      expect(result[MechLocation.CENTER_TORSO]).toBe(30);
      expect(result.centerTorsoRear).toBe(10);
      expect(result[MechLocation.LEFT_TORSO]).toBe(20);
      expect(result.leftTorsoRear).toBe(8);
      expect(result[MechLocation.RIGHT_TORSO]).toBe(20);
      expect(result.rightTorsoRear).toBe(8);
    });

    it('should ignore unknown locations', () => {
      const allocation = {
        'Unknown': 10,
        'Head': 9,
      };
      const result = mapArmorAllocation(allocation);
      expect(result[MechLocation.HEAD]).toBe(9);
    });
  });
});
