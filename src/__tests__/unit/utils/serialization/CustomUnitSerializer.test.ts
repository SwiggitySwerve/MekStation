import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { getEquipmentLookupService } from '@/services/equipment/EquipmentLookupService';
import { getEquipmentRegistry } from '@/services/equipment/EquipmentRegistry';
import {
  parseUnit,
  UnitLoaderService,
} from '@/services/units/unitLoaderService';
import { getUnitLibraryFingerprint } from '@/stores/unit/unitEditSnapshot';
import { createDefaultUnitState, type UnitState } from '@/stores/unitState';
import {
  CockpitType,
  getCockpitSourceTag,
} from '@/types/construction/CockpitType';
import { MechLocation } from '@/types/construction/CriticalSlotAllocation';
import { EngineType } from '@/types/construction/EngineType';
import { GyroType } from '@/types/construction/GyroType';
import { MovementEnhancementType } from '@/types/construction/MovementEnhancement';
import {
  TechBaseComponent,
  TechBaseMode,
} from '@/types/construction/TechBaseConfiguration';
import { UnitContract } from '@/types/contracts';
import { RulesLevel } from '@/types/enums/RulesLevel';
import { TechBase } from '@/types/enums/TechBase';
import { EquipmentCategory } from '@/types/equipment';
import { Era } from '@/types/temporal/Era';
import { JumpJetType } from '@/utils/construction/movementCalculations';
import { serializeCustomUnitState } from '@/utils/serialization/CustomUnitSerializer';

import crab from '../../../../../public/data/units/battlemechs/3-succession-wars/standard/King Crab KGC-0000.json';

jest.mock('@/services/equipment/EquipmentFileReader', () => ({
  readJsonFile: async (file: string) =>
    JSON.parse(
      readFileSync(
        join(process.cwd(), 'public/data/equipment/official', file),
        'utf8',
      ),
    ),
}));
beforeAll(async () => {
  await getEquipmentRegistry().initialize();
  await getEquipmentLookupService().initialize();
});

it.each(Object.values(CockpitType))(
  'saves and reopens %s with both split AC/20 mounts intact',
  (cockpitType) => {
    const loader = new UnitLoaderService();
    const state = { ...loader.mapToUnitState(crab, true), cockpitType };
    const serialized = serializeCustomUnitState(state, {
      id: state.id,
      chassis: state.chassis,
      variant: state.model,
      era: Era.LATE_SUCCESSION_WARS,
    });
    expect(serialized.criticalSlots[MechLocation.LEFT_ARM]?.slice(4)).toEqual(
      Array(8).fill('AC/20'),
    );
    const reopened = loader.mapToUnitState(parseUnit(serialized), false);
    expect(serialized.cockpit).toBe(getCockpitSourceTag(cockpitType));
    expect(reopened.cockpitType).toBe(cockpitType);
    const allocations = (unit: UnitState) =>
      unit.equipment
        .filter((item) => item.equipmentId === 'ac-20')
        .map(({ location, slots, splitSlots }) => ({
          location,
          slots,
          splitSlots,
        }));
    expect(allocations(reopened)).toEqual(allocations(state));
    expect(allocations(reopened)).toHaveLength(2);
  },
);

describe('serializeCustomUnitState', () => {
  it('includes cockpit identity and secondary split cells in the save fingerprint', () => {
    const state = new UnitLoaderService().mapToUnitState(crab, true);
    const before = getUnitLibraryFingerprint(state);
    expect(
      getUnitLibraryFingerprint({ ...state, cockpitType: CockpitType.SMALL }),
    ).not.toBe(before);
    const index = state.equipment.findIndex((item) => item.splitSlots);
    expect(index).toBeGreaterThanOrEqual(0);
    const equipment = state.equipment.map((item, candidate) =>
      candidate === index && item.splitSlots
        ? {
            ...item,
            splitSlots: {
              ...item.splitSlots,
              slots: item.splitSlots.slots.map((slot) => slot - 1),
            },
          }
        : item,
    );
    expect(getUnitLibraryFingerprint({ ...state, equipment })).not.toBe(before);
  });

  it.each([
    [JumpJetType.IMPROVED, MovementEnhancementType.MASC],
    [JumpJetType.MECHANICAL, MovementEnhancementType.SUPERCHARGER],
    [JumpJetType.STANDARD, MovementEnhancementType.TSM],
    [JumpJetType.STANDARD, MovementEnhancementType.PARTIAL_WING],
  ] as const)(
    'retains %s and %s through a saved definition',
    (jumpJetType, enhancement) => {
      const state = createDefaultUnitState({
        id: '98dcb1cd-2290-455d-9bc3-a3ab8e0368d6',
        name: 'Movement Fixture',
        tonnage: 50,
        techBase: TechBase.INNER_SPHERE,
      });
      const serialized = serializeCustomUnitState(
        { ...state, jumpJetType, enhancement, jumpMP: 3 },
        {
          id: state.id,
          chassis: 'Movement Fixture',
          variant: 'M-1',
          era: Era.RENAISSANCE,
        },
      );
      const reloaded = new UnitLoaderService().mapToUnitState(
        parseUnit(serialized),
        false,
      );
      expect(reloaded).toMatchObject({ jumpJetType, enhancement, jumpMP: 3 });
    },
  );

  it.each(['12-34', '002401', '-1', '2401', '9007199254740993'])(
    'preserves supported MUL identity %s through schema and loader',
    (mulId) => {
      const state = createDefaultUnitState({
        id: '98dcb1cd-2290-455d-9bc3-a3ab8e0368d6',
        name: 'Warhammer WHM-6R',
        tonnage: 70,
        techBase: TechBase.INNER_SPHERE,
      });
      const serialized = serializeCustomUnitState(
        {
          ...state,
          mulId,
          sourceDefinition: {
            source: 'custom',
            id: 'original-design',
            version: 3,
          },
        },
        {
          id: state.id,
          chassis: 'Warhammer',
          variant: 'WHM-6R',
          era: Era.RENAISSANCE,
        },
      );
      expect(UnitContract.safeParse(serialized).success).toBe(true);
      const reloaded = new UnitLoaderService().mapToUnitState(
        parseUnit(serialized),
        false,
      );
      expect(reloaded.mulId).toBe(mulId);
      expect(reloaded.id).not.toBe(state.id);
      expect(reloaded.sourceDefinition).toEqual({
        source: 'custom',
        id: 'original-design',
        version: 3,
      });
    },
  );

  it('produces the canonical payload required to reload customized combat state', () => {
    const baseState = createDefaultUnitState({
      id: '98dcb1cd-2290-455d-9bc3-a3ab8e0368d6',
      name: 'Warhammer WHM-6R',
      tonnage: 70,
      techBase: TechBase.INNER_SPHERE,
    });
    const customizedState: UnitState = {
      ...baseState,
      chassis: 'Warhammer',
      clanName: 'Hammerhands',
      model: 'WHM-6R',
      mulId: '2401',
      role: 'Brawler',
      fluff: {
        overview: 'A storied heavy BattleMech.',
        history: 'Refitted for the Night Watch.',
      },
      year: 3025,
      rulesLevel: RulesLevel.INTRODUCTORY,
      techBaseMode: TechBaseMode.INNER_SPHERE,
      engineType: EngineType.STANDARD,
      engineRating: 280,
      heatSinkCount: 18,
      armorTonnage: 12,
      armorAllocation: {
        ...baseState.armorAllocation,
        [MechLocation.HEAD]: 9,
        [MechLocation.CENTER_TORSO]: 30,
        centerTorsoRear: 10,
      },
      equipment: [
        {
          instanceId: 'medium-laser-1',
          equipmentId: 'medium-laser',
          name: 'Medium Laser',
          category: EquipmentCategory.ENERGY_WEAPON,
          weight: 1,
          criticalSlots: 1,
          heat: 3,
          techBase: TechBase.INNER_SPHERE,
          location: MechLocation.RIGHT_ARM,
          slots: [4],
          isRearMounted: false,
          isRemovable: true,
          isOmniPodMounted: true,
        },
        {
          instanceId: 'external-single-heat-sink-1',
          equipmentId: 'single-heat-sink',
          name: 'Single Heat Sink',
          category: EquipmentCategory.MISC_EQUIPMENT,
          weight: 1,
          criticalSlots: 1,
          heat: 0,
          techBase: TechBase.INNER_SPHERE,
          location: MechLocation.LEFT_TORSO,
          slots: [4],
          isRearMounted: false,
          isRemovable: false,
          isOmniPodMounted: false,
        },
      ],
    };

    const serialized = serializeCustomUnitState(customizedState, {
      id: customizedState.id,
      chassis: 'Warhammer',
      variant: 'WHM-6R Night Watch',
      era: Era.RENAISSANCE,
    });

    const contractResult = UnitContract.safeParse(serialized);
    expect(contractResult.success ? [] : contractResult.error.issues).toEqual(
      [],
    );
    expect(serialized).toMatchObject({
      chassis: 'Warhammer',
      clanName: 'Hammerhands',
      model: 'WHM-6R Night Watch',
      mulId: 2401,
      role: 'Brawler',
      fluff: {
        overview: 'A storied heavy BattleMech.',
        history: 'Refitted for the Night Watch.',
      },
      tonnage: 70,
      techBase: 'INNER_SPHERE',
      rulesLevel: 'INTRODUCTORY',
      engine: { type: 'FUSION', rating: 280 },
      heatSinks: { type: 'SINGLE', count: 18 },
      armor: {
        type: 'STANDARD',
        allocation: {
          Head: 9,
          'Center Torso': { front: 30, rear: 10 },
        },
      },
      movement: { walk: 4, jump: 0, jumpJetType: 'STANDARD' },
      equipment: [
        {
          id: 'medium-laser',
          location: 'Right Arm',
          slots: [4],
          isRearMounted: false,
          isRemovable: true,
          isOmniPodMounted: true,
        },
        {
          id: 'single-heat-sink',
          location: 'Left Torso',
          slots: [4],
          isRearMounted: false,
          isRemovable: false,
          isOmniPodMounted: false,
        },
      ],
    });
    expect(serialized.criticalSlots['Right Arm']?.[4]).toBe('Medium Laser');

    const reloaded = new UnitLoaderService().mapToUnitState(
      parseUnit(serialized),
      false,
    );
    expect(reloaded).toMatchObject({
      chassis: 'Warhammer',
      clanName: 'Hammerhands',
      model: 'WHM-6R Night Watch',
      mulId: '2401',
      role: 'Brawler',
      fluff: {
        overview: 'A storied heavy BattleMech.',
        history: 'Refitted for the Night Watch.',
      },
      tonnage: 70,
      engineRating: 280,
      heatSinkCount: 18,
      equipment: [
        {
          equipmentId: 'medium-laser',
          location: MechLocation.RIGHT_ARM,
          isRemovable: true,
          isOmniPodMounted: true,
        },
        {
          equipmentId: 'single-heat-sink',
          location: MechLocation.LEFT_TORSO,
          isRemovable: false,
          isOmniPodMounted: false,
        },
      ],
    });
    expect(reloaded.armorAllocation[MechLocation.CENTER_TORSO]).toBe(30);
    expect(reloaded.armorAllocation.centerTorsoRear).toBe(10);
  });

  it('preserves a 105-ton SUPERHEAVY gyro through custom serialize and load', () => {
    const baseState = createDefaultUnitState({
      id: 'b7af56ba-8e79-4c5e-8fe4-eae8dd3f1b05',
      name: 'Atlas AS7-SH',
      tonnage: 105,
      techBase: TechBase.INNER_SPHERE,
    });
    const customizedState: UnitState = {
      ...baseState,
      chassis: 'Atlas',
      model: 'AS7-SH',
      tonnage: 105,
      techBaseMode: TechBaseMode.INNER_SPHERE,
      engineType: EngineType.STANDARD,
      engineRating: 315,
      gyroType: GyroType.SUPERHEAVY,
      armorAllocation: {
        ...baseState.armorAllocation,
        [MechLocation.HEAD]: 9,
        [MechLocation.CENTER_TORSO]: 40,
        centerTorsoRear: 20,
      },
      equipment: [
        {
          instanceId: 'ac-20-1',
          equipmentId: 'ac-20',
          name: 'AC/20',
          category: EquipmentCategory.BALLISTIC_WEAPON,
          weight: 14,
          criticalSlots: 10,
          heat: 7,
          techBase: TechBase.INNER_SPHERE,
          location: MechLocation.RIGHT_TORSO,
          slots: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
          isRearMounted: true,
          linkedAmmoId: 'ac-20-ammo-1',
          isRemovable: true,
          isOmniPodMounted: false,
        },
      ],
    };

    const serialized = serializeCustomUnitState(customizedState, {
      id: customizedState.id,
      chassis: 'Atlas',
      variant: 'AS7-SH',
      era: Era.RENAISSANCE,
    });

    expect(serialized.gyro).toEqual({ type: 'SUPERHEAVY' });
    expect(UnitContract.safeParse(serialized).success).toBe(true);

    const reloaded = new UnitLoaderService().mapToUnitState(
      parseUnit(serialized),
      false,
    );
    expect(reloaded).toMatchObject({
      tonnage: 105,
      techBase: TechBase.INNER_SPHERE,
      techBaseMode: TechBaseMode.INNER_SPHERE,
      engineType: EngineType.STANDARD,
      engineRating: 315,
      gyroType: GyroType.SUPERHEAVY,
      equipment: [
        {
          equipmentId: 'ac-20',
          location: MechLocation.RIGHT_TORSO,
          slots: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
          isRearMounted: true,
          linkedAmmoId: 'ac-20-ammo-1',
        },
      ],
    });
    expect(reloaded.armorAllocation[MechLocation.HEAD]).toBe(9);
    expect(reloaded.armorAllocation[MechLocation.CENTER_TORSO]).toBe(40);
    expect(reloaded.armorAllocation.centerTorsoRear).toBe(20);
    expect(serialized.criticalSlots[MechLocation.RIGHT_TORSO]).toEqual([
      'AC/20',
      'AC/20',
      'AC/20',
      'AC/20',
      'AC/20',
      'AC/20',
      'AC/20',
      'AC/20',
      'AC/20',
      'AC/20',
      null,
      null,
    ]);
  });

  it('keeps Mixed per-component tech bases through save and reopen', () => {
    const state = createDefaultUnitState({
      id: '0f2b6f4e-8a1c-4d39-9a77-5f3f1c2d9e10',
      name: 'Mixed Fixture',
      tonnage: 50,
      techBase: TechBase.INNER_SPHERE,
    });
    const componentTechBases = {
      ...state.componentTechBases,
      [TechBaseComponent.ENGINE]: TechBase.CLAN,
      [TechBaseComponent.HEATSINK]: TechBase.CLAN,
      [TechBaseComponent.TARGETING]: TechBase.CLAN,
    };
    const serialized = serializeCustomUnitState(
      { ...state, techBaseMode: TechBaseMode.MIXED, componentTechBases },
      {
        id: state.id,
        chassis: 'Mixed Fixture',
        variant: 'MX-1',
        era: Era.RENAISSANCE,
      },
    );
    expect(UnitContract.safeParse(serialized).success).toBe(true);

    const reloaded = new UnitLoaderService().mapToUnitState(
      parseUnit(serialized),
      false,
    );
    expect(reloaded.techBaseMode).toBe(TechBaseMode.MIXED);
    expect(reloaded.componentTechBases).toEqual(componentTechBases);
  });

  it('rejects a saved component tech base outside Inner Sphere and Clan', () => {
    const state = createDefaultUnitState({
      id: '0f2b6f4e-8a1c-4d39-9a77-5f3f1c2d9e11',
      name: 'Mixed Fixture',
      tonnage: 50,
      techBase: TechBase.INNER_SPHERE,
    });
    const serialized = serializeCustomUnitState(
      { ...state, techBaseMode: TechBaseMode.MIXED },
      {
        id: state.id,
        chassis: 'Mixed Fixture',
        variant: 'MX-2',
        era: Era.RENAISSANCE,
      },
    );
    expect(
      UnitContract.safeParse({
        ...serialized,
        componentTechBases: { engine: 'MIXED' },
      }).success,
    ).toBe(false);
  });
});
