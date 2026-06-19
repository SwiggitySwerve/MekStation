import { MechLocation } from '@/types/construction/CriticalSlotAllocation';

import { getFixedSlotContent } from '../criticalSlotUtils';

const NO_SIDE_TORSO_ENGINE = { ct: 6, sideTorso: 0 };

describe('criticalSlotUtils', () => {
  describe('getFixedSlotContent', () => {
    it('maps head fixed systems and empty fourth slot', () => {
      const headSlots = Array.from({ length: 7 }, (_, slotIndex) =>
        getFixedSlotContent(
          MechLocation.HEAD,
          slotIndex,
          NO_SIDE_TORSO_ENGINE,
          4,
        ),
      );

      expect(headSlots).toEqual([
        'Life Support',
        'Sensors',
        'Cockpit',
        null,
        'Sensors',
        'Life Support',
        null,
      ]);
    });

    it('maps center torso engine and standard gyro bands', () => {
      const centerTorsoSlots = Array.from({ length: 11 }, (_, slotIndex) =>
        getFixedSlotContent(
          MechLocation.CENTER_TORSO,
          slotIndex,
          NO_SIDE_TORSO_ENGINE,
          4,
        ),
      );

      expect(centerTorsoSlots).toEqual([
        'ENGINE_PLACEHOLDER',
        'ENGINE_PLACEHOLDER',
        'ENGINE_PLACEHOLDER',
        'Gyro',
        'Gyro',
        'Gyro',
        'Gyro',
        'ENGINE_PLACEHOLDER',
        'ENGINE_PLACEHOLDER',
        'ENGINE_PLACEHOLDER',
        null,
      ]);
    });

    it('adjusts center torso bands for compact gyro slots', () => {
      const compactGyroSlots = Array.from({ length: 9 }, (_, slotIndex) =>
        getFixedSlotContent(
          MechLocation.CENTER_TORSO,
          slotIndex,
          NO_SIDE_TORSO_ENGINE,
          2,
        ),
      );

      expect(compactGyroSlots).toEqual([
        'ENGINE_PLACEHOLDER',
        'ENGINE_PLACEHOLDER',
        'ENGINE_PLACEHOLDER',
        'Gyro',
        'Gyro',
        'ENGINE_PLACEHOLDER',
        'ENGINE_PLACEHOLDER',
        'ENGINE_PLACEHOLDER',
        null,
      ]);
    });

    it('maps side torso engine slots from engine requirements', () => {
      const xlEngineSlots = { ct: 6, sideTorso: 3 };

      expect(
        getFixedSlotContent(MechLocation.LEFT_TORSO, 0, xlEngineSlots, 4),
      ).toBe('ENGINE_PLACEHOLDER');
      expect(
        getFixedSlotContent(MechLocation.RIGHT_TORSO, 2, xlEngineSlots, 4),
      ).toBe('ENGINE_PLACEHOLDER');
      expect(
        getFixedSlotContent(MechLocation.LEFT_TORSO, 3, xlEngineSlots, 4),
      ).toBeNull();
    });

    it('maps arm actuators for both arms', () => {
      const expectedArmSlots = [
        'Shoulder',
        'Upper Arm Actuator',
        'Lower Arm Actuator',
        'Hand Actuator',
        null,
      ];

      for (const location of [MechLocation.LEFT_ARM, MechLocation.RIGHT_ARM]) {
        expect(
          Array.from({ length: 5 }, (_, slotIndex) =>
            getFixedSlotContent(location, slotIndex, NO_SIDE_TORSO_ENGINE, 4),
          ),
        ).toEqual(expectedArmSlots);
      }
    });

    it('maps biped, tripod, and quad leg actuators', () => {
      const legLocations = [
        MechLocation.LEFT_LEG,
        MechLocation.RIGHT_LEG,
        MechLocation.CENTER_LEG,
        MechLocation.FRONT_LEFT_LEG,
        MechLocation.FRONT_RIGHT_LEG,
        MechLocation.REAR_LEFT_LEG,
        MechLocation.REAR_RIGHT_LEG,
      ];
      const expectedLegSlots = [
        'Hip',
        'Upper Leg Actuator',
        'Lower Leg Actuator',
        'Foot Actuator',
        null,
      ];

      for (const location of legLocations) {
        expect(
          Array.from({ length: 5 }, (_, slotIndex) =>
            getFixedSlotContent(location, slotIndex, NO_SIDE_TORSO_ENGINE, 4),
          ),
        ).toEqual(expectedLegSlots);
      }
    });

    it('returns null for non-critical LAM fighter locations', () => {
      expect(
        getFixedSlotContent(MechLocation.NOSE, 0, NO_SIDE_TORSO_ENGINE, 4),
      ).toBeNull();
    });
  });
});
