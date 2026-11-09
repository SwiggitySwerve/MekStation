import { MechLocation } from '@/types/construction/CriticalSlotAllocation';
import { EngineType } from '@/types/construction/EngineType';
import { GyroType } from '@/types/construction/GyroType';
import { MechConfiguration } from '@/types/unit/BattleMechInterfaces';

import {
  buildCriticalSlotsFromEquipment,
  buildPreviewUnitConfig,
  type PreviewUnitState,
} from '../PreviewTab.builders';

const baseState = {
  name: 'Test Unit',
  chassis: 'Test',
  model: 'TST-1',
  tonnage: 50,
  techBase: 'Inner Sphere',
  rulesLevel: 'Standard',
  year: 3050,
  engineType: EngineType.STANDARD,
  engineRating: 250,
  gyroType: GyroType.STANDARD,
  internalStructureType: 'Standard',
  cockpitType: 'Standard',
  armorType: 'Standard',
  armorAllocation: {
    [MechLocation.HEAD]: 9,
    [MechLocation.CENTER_TORSO]: 20,
    centerTorsoRear: 6,
    [MechLocation.LEFT_TORSO]: 15,
    leftTorsoRear: 5,
    [MechLocation.RIGHT_TORSO]: 15,
    rightTorsoRear: 5,
    [MechLocation.LEFT_ARM]: 10,
    [MechLocation.RIGHT_ARM]: 10,
    [MechLocation.LEFT_LEG]: 14,
    [MechLocation.RIGHT_LEG]: 14,
    [MechLocation.FRONT_LEFT_LEG]: 11,
    [MechLocation.FRONT_RIGHT_LEG]: 12,
    [MechLocation.REAR_LEFT_LEG]: 13,
    [MechLocation.REAR_RIGHT_LEG]: 14,
    [MechLocation.CENTER_LEG]: 15,
  },
  heatSinkType: 'Single',
  heatSinkCount: 10,
  enhancement: null,
  jumpMP: 0,
  equipment: [],
};

function equipmentAt(
  location: MechLocation,
  slots: readonly number[],
): PreviewUnitState['equipment'][number] {
  return {
    equipmentId: 'medium-laser',
    instanceId: `laser-${location}`,
    name: 'Medium Laser',
    category: 'Energy Weapon',
    location,
    slots,
  } as PreviewUnitState['equipment'][number];
}

describe('PreviewTab builders', () => {
  it('projects the selected small cockpit head into Preview', () => {
    const result = buildPreviewUnitConfig(
      {
        ...baseState,
        configuration: MechConfiguration.BIPED,
        cockpitType: 'Small',
      },
      5,
      8,
      1000,
      2_000_000,
    );
    expect(
      result.criticalSlots?.[MechLocation.HEAD].map(
        (slot) => slot?.content ?? null,
      ),
    ).toEqual([
      'Life Support',
      'Sensors',
      'Small Cockpit',
      'Sensors',
      null,
      null,
    ]);
  });

  it('projects a selected torso cockpit into Preview head and torso cells', () => {
    const result = buildPreviewUnitConfig(
      {
        ...baseState,
        configuration: MechConfiguration.BIPED,
        cockpitType: 'Torso-Mounted',
      },
      5,
      8,
      1000,
      2_000_000,
    );
    expect(result.criticalSlots?.[MechLocation.HEAD].slice(2)).toEqual([
      null,
      null,
      null,
      null,
    ]);
    expect(
      result.criticalSlots?.[MechLocation.CENTER_TORSO]
        .slice(10)
        .map((slot) => slot?.content),
    ).toEqual(['Torso-Mounted Cockpit', 'Sensors']);
    expect(result.criticalSlots?.[MechLocation.LEFT_TORSO][0]?.content).toBe(
      'Life Support',
    );
  });

  it('builds the standard Biped location topology', () => {
    const result = buildCriticalSlotsFromEquipment(
      [equipmentAt(MechLocation.LEFT_ARM, [4])],
      MechConfiguration.BIPED,
      EngineType.STANDARD,
      GyroType.STANDARD,
    );

    expect(Object.keys(result)).toEqual([
      MechLocation.HEAD,
      MechLocation.CENTER_TORSO,
      MechLocation.LEFT_TORSO,
      MechLocation.RIGHT_TORSO,
      MechLocation.LEFT_ARM,
      MechLocation.RIGHT_ARM,
      MechLocation.LEFT_LEG,
      MechLocation.RIGHT_LEG,
    ]);
    expect(result[MechLocation.HEAD]).toHaveLength(6);
    expect(result[MechLocation.LEFT_ARM]).toHaveLength(12);
    expect(result[MechLocation.LEFT_ARM][0]).toMatchObject({
      content: 'Shoulder',
      isSystem: true,
    });
    expect(result[MechLocation.LEFT_ARM][4]?.content).toBe('Medium Laser');
  });

  it('keeps Quad armor locations in the exported record-sheet projection', () => {
    const result = buildPreviewUnitConfig(
      {
        ...baseState,
        configuration: MechConfiguration.QUAD,
        equipment: [equipmentAt(MechLocation.FRONT_LEFT_LEG, [4])],
      },
      5,
      8,
      1000,
      2_000_000,
    );

    expect(result.armor.allocation).toMatchObject({
      frontLeftLeg: 11,
      frontRightLeg: 12,
      rearLeftLeg: 13,
      rearRightLeg: 14,
    });
    expect(result.criticalSlots).not.toHaveProperty(MechLocation.LEFT_ARM);
    expect(result.criticalSlots?.[MechLocation.FRONT_LEFT_LEG]).toHaveLength(6);
    expect(
      result.criticalSlots?.[MechLocation.FRONT_LEFT_LEG][4]?.content,
    ).toBe('Medium Laser');
  });

  it('builds the Tripod center-leg topology and keeps its armor', () => {
    const state = {
      ...baseState,
      configuration: MechConfiguration.TRIPOD,
      equipment: [equipmentAt(MechLocation.CENTER_LEG, [4])],
    };
    const result = buildPreviewUnitConfig(state, 5, 8, 1000, 2_000_000);

    expect(result.armor.allocation.centerLeg).toBe(15);
    expect(result.criticalSlots?.[MechLocation.CENTER_LEG]).toHaveLength(6);
    expect(result.criticalSlots?.[MechLocation.CENTER_LEG][4]?.content).toBe(
      'Medium Laser',
    );
  });
  it('labels unassigned equipment honestly instead of inventing a torso mount', () => {
    const unassigned = {
      ...equipmentAt(MechLocation.LEFT_ARM, []),
      location: undefined,
    };
    const result = buildPreviewUnitConfig(
      {
        ...baseState,
        configuration: MechConfiguration.BIPED,
        equipment: [unassigned],
      },
      5,
      8,
      1000,
      2_000_000,
    );
    expect(result.equipment[0].location).toBe('Unassigned');
  });
});
