import {
  parseUnit,
  UnitLoaderService,
} from '@/services/units/unitLoaderService';
import { createDefaultUnitState, type UnitState } from '@/stores/unitState';
import { MechLocation } from '@/types/construction/CriticalSlotAllocation';
import { EngineType } from '@/types/construction/EngineType';
import { GyroType } from '@/types/construction/GyroType';
import { TechBaseMode } from '@/types/construction/TechBaseConfiguration';
import { UnitContract } from '@/types/contracts';
import { RulesLevel } from '@/types/enums/RulesLevel';
import { TechBase } from '@/types/enums/TechBase';
import { EquipmentCategory } from '@/types/equipment';
import { Era } from '@/types/temporal/Era';
import { serializeCustomUnitState } from '@/utils/serialization/CustomUnitSerializer';

describe('serializeCustomUnitState', () => {
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
      model: 'WHM-6R',
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
      model: 'WHM-6R Night Watch',
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
      model: 'WHM-6R Night Watch',
      tonnage: 70,
      engineRating: 280,
      heatSinkCount: 18,
      equipment: [
        {
          equipmentId: 'medium-laser',
          location: MechLocation.RIGHT_ARM,
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
});
