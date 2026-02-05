import { createEmptySelectionMemory } from '@/stores/unitState';
import { ArmorTypeEnum } from '@/types/construction/ArmorType';
import { CockpitType } from '@/types/construction/CockpitType';
import { EngineType } from '@/types/construction/EngineType';
import { GyroType } from '@/types/construction/GyroType';
import { HeatSinkType } from '@/types/construction/HeatSinkType';
import { InternalStructureType } from '@/types/construction/InternalStructureType';
import {
  TechBaseComponent,
  createDefaultComponentTechBases,
} from '@/types/construction/TechBaseConfiguration';
import { TechBase } from '@/types/enums/TechBase';
import {
  getValidatedSelectionUpdates,
  getValidEngineTypes,
  getSelectionWithMemory,
  getFullyValidatedSelections,
  isHeatSinkTypeValid,
  ComponentSelections,
} from '@/utils/techBaseValidation';

describe('techBaseValidation', () => {
  const createSelections = (
    overrides?: Partial<ComponentSelections>,
  ): ComponentSelections => ({
    engineType: EngineType.STANDARD,
    gyroType: GyroType.STANDARD,
    internalStructureType: InternalStructureType.STANDARD,
    cockpitType: CockpitType.STANDARD,
    heatSinkType: HeatSinkType.SINGLE,
    armorType: ArmorTypeEnum.STANDARD,
    ...overrides,
  });

  describe('getValidatedSelectionUpdates()', () => {
    it('should return empty updates when selections are valid', () => {
      const selections = createSelections();
      const updates = getValidatedSelectionUpdates(
        TechBaseComponent.ENGINE,
        TechBase.INNER_SPHERE,
        selections,
      );

      expect(Object.keys(updates).length).toBe(0);
    });

    it('should update engine type when invalid', () => {
      const selections = createSelections({
        engineType: EngineType.XL_CLAN, // Clan engine
      });
      const updates = getValidatedSelectionUpdates(
        TechBaseComponent.ENGINE,
        TechBase.INNER_SPHERE,
        selections,
      );

      // Should update to valid IS engine
      expect(updates.engineType).toBeDefined();
    });

    it('should update gyro type when invalid', () => {
      const selections = createSelections();
      const updates = getValidatedSelectionUpdates(
        TechBaseComponent.GYRO,
        TechBase.INNER_SPHERE,
        selections,
      );

      expect(updates).toBeDefined();
    });

    it('should update structure type when invalid', () => {
      const selections = createSelections({
        internalStructureType: InternalStructureType.ENDO_STEEL_CLAN, // Clan structure
      });
      const updates = getValidatedSelectionUpdates(
        TechBaseComponent.CHASSIS,
        TechBase.INNER_SPHERE,
        selections,
      );

      expect(updates).toBeDefined();
    });

    it('should update heat sink type when invalid', () => {
      const selections = createSelections({
        heatSinkType: HeatSinkType.DOUBLE_CLAN, // Clan heat sink
      });
      const updates = getValidatedSelectionUpdates(
        TechBaseComponent.HEATSINK,
        TechBase.INNER_SPHERE,
        selections,
      );

      expect(updates).toBeDefined();
    });

    it('should update armor type when invalid', () => {
      const selections = createSelections();
      const updates = getValidatedSelectionUpdates(
        TechBaseComponent.ARMOR,
        TechBase.INNER_SPHERE,
        selections,
      );

      expect(updates).toBeDefined();
    });

    it('should return empty object for components without mapped selections', () => {
      const updates = getValidatedSelectionUpdates(
        TechBaseComponent.TARGETING,
        TechBase.CLAN,
        createSelections(),
      );

      expect(updates).toEqual({});
    });
  });

  describe('component filtering helpers', () => {
    it('should filter engine types by tech base per TechManual availability', () => {
      const innerSphereEngines = getValidEngineTypes(TechBase.INNER_SPHERE);
      const clanEngines = getValidEngineTypes(TechBase.CLAN);

      expect(innerSphereEngines).toEqual([
        EngineType.STANDARD,
        EngineType.XL_IS,
        EngineType.LIGHT,
        EngineType.XXL,
        EngineType.COMPACT,
        EngineType.ICE,
        EngineType.FUEL_CELL,
        EngineType.FISSION,
      ]);

      expect(clanEngines).toEqual([
        EngineType.STANDARD,
        EngineType.XL_CLAN,
        EngineType.XXL,
        EngineType.COMPACT,
      ]);
    });

    it('should enforce heat sink tech base restrictions', () => {
      expect(isHeatSinkTypeValid(HeatSinkType.DOUBLE_CLAN, TechBase.CLAN)).toBe(
        true,
      );
      expect(
        isHeatSinkTypeValid(HeatSinkType.DOUBLE_CLAN, TechBase.INNER_SPHERE),
      ).toBe(false);
    });
  });

  describe('getSelectionWithMemory()', () => {
    it('should restore per-tech-base memory when switching to Clan', () => {
      const memory = createEmptySelectionMemory();
      memory.engine[TechBase.CLAN] = EngineType.XL_CLAN;
      memory.armor[TechBase.CLAN] = ArmorTypeEnum.FERRO_FIBROUS_CLAN;

      const updates = getSelectionWithMemory(
        TechBaseComponent.ENGINE,
        TechBase.CLAN,
        createSelections({ engineType: EngineType.XL_IS }),
        memory,
      );

      expect(updates.engineType).toBe(EngineType.XL_CLAN);
    });

    it('should fall back to defaults when memory is invalid for the new tech base', () => {
      const memory = createEmptySelectionMemory();
      memory.structure[TechBase.CLAN] = InternalStructureType.ENDO_STEEL_IS;

      const updates = getSelectionWithMemory(
        TechBaseComponent.CHASSIS,
        TechBase.CLAN,
        createSelections({
          internalStructureType: InternalStructureType.ENDO_STEEL_IS,
        }),
        memory,
      );

      expect(updates.internalStructureType).toBe(
        InternalStructureType.STANDARD,
      );
    });
  });

  describe('getFullyValidatedSelections()', () => {
    it('should replace invalid selections with defaults when no memory is provided', () => {
      const componentTechBases = createDefaultComponentTechBases(TechBase.CLAN);

      const result = getFullyValidatedSelections(
        componentTechBases,
        createSelections({
          engineType: EngineType.XL_IS,
          internalStructureType: InternalStructureType.ENDO_STEEL_IS,
          heatSinkType: HeatSinkType.DOUBLE_IS,
          armorType: ArmorTypeEnum.FERRO_FIBROUS_IS,
        }),
      );

      expect(result.engineType).toBe(EngineType.STANDARD);
      expect(result.internalStructureType).toBe(InternalStructureType.STANDARD);
      expect(result.heatSinkType).toBe(HeatSinkType.SINGLE);
      expect(result.armorType).toBe(ArmorTypeEnum.STANDARD);
    });

    it('should restore selections from memory when available for the target tech base', () => {
      const componentTechBases = createDefaultComponentTechBases(TechBase.CLAN);
      const memory = createEmptySelectionMemory();
      memory.engine[TechBase.CLAN] = EngineType.XL_CLAN;
      memory.gyro[TechBase.CLAN] = GyroType.XL;
      memory.structure[TechBase.CLAN] = InternalStructureType.ENDO_STEEL_CLAN;
      memory.cockpit[TechBase.CLAN] = CockpitType.SMALL;
      memory.heatSink[TechBase.CLAN] = HeatSinkType.DOUBLE_CLAN;
      memory.armor[TechBase.CLAN] = ArmorTypeEnum.FERRO_FIBROUS_CLAN;

      const result = getFullyValidatedSelections(
        componentTechBases,
        createSelections(),
        memory,
        TechBase.CLAN,
      );

      expect(result.engineType).toBe(EngineType.XL_CLAN);
      expect(result.gyroType).toBe(GyroType.XL);
      expect(result.internalStructureType).toBe(
        InternalStructureType.ENDO_STEEL_CLAN,
      );
      expect(result.cockpitType).toBe(CockpitType.SMALL);
      expect(result.heatSinkType).toBe(HeatSinkType.DOUBLE_CLAN);
      expect(result.armorType).toBe(ArmorTypeEnum.FERRO_FIBROUS_CLAN);
    });
  });
});
