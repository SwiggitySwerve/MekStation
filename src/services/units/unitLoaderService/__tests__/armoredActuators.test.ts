import { MechLocation } from '@/types/construction/CriticalSlotAllocation';
import { getFixedSlotNames } from '@/utils/construction/slotOperations/topology';

import muse from '../../../../../public/data/units/battlemechs/5-civil-war/standard/Devastator DVS-X10 MUSE EARTH.json';
import devastator from '../../../../../public/data/units/battlemechs/6-dark-age/experimental/Devastator DVS-10.json';
import { normalizeUnitConfiguration } from '../normalizeUnitConfiguration';
import { parseUnit } from '../unitContractAdapter';

// MegaMek 48fcb2f64 MtfFile.java:952-956 strips (ARMORED); TestMek.java:438-477.
it.each([devastator, muse])(
  'retains omitted lower-arm and hand actuators for $model',
  (source) => {
    const state = normalizeUnitConfiguration(parseUnit(source), []);
    for (const location of [
      MechLocation.LEFT_ARM,
      MechLocation.RIGHT_ARM,
    ] as const) {
      expect(state.armActuators?.[location]).toEqual({
        lowerArm: false,
        hand: false,
      });
      const fixed = getFixedSlotNames(
        location,
        state.engineType,
        state.gyroType,
        state.armActuators,
      );
      expect([...fixed.keys()]).toEqual([0, 1]);
    }
  },
);

it('retains explicitly installed armored lower-arm and hand actuators', () => {
  const source = {
    ...devastator,
    criticalSlots: {
      LEFT_ARM: [
        'Shoulder (ARMORED)',
        'Upper Arm Actuator',
        'Lower Arm Actuator (ARMORED)',
        'Hand Actuator (ARMORED)',
      ],
    },
  };
  expect(
    normalizeUnitConfiguration(parseUnit(source), []).armActuators?.[
      MechLocation.LEFT_ARM
    ],
  ).toEqual({ lowerArm: true, hand: true });
});

it('retains legacy defaults when an equipment-only save lacks system evidence', () => {
  expect(
    normalizeUnitConfiguration(
      parseUnit({
        ...devastator,
        criticalSlots: { LEFT_ARM: ['ISLargeLaser'] },
      }),
      [],
    ).armActuators,
  ).toEqual({});
});
