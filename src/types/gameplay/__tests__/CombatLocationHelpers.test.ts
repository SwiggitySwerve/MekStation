import type { CombatLocation } from '@/types/gameplay/CombatLocationTypes';

import { MechLocation } from '@/types/construction/CriticalSlotAllocation';
import {
  getFrontCombatLocation,
  getTransferCombatLocation,
  getTransferLocation,
  isLimbLocation,
  isRearCombatLocation,
  isTorsoLocation,
} from '@/types/gameplay/CombatLocationHelpers';

describe('combat location helpers', () => {
  it('identifies rear combat locations', () => {
    expect(isRearCombatLocation('center_torso_rear')).toBe(true);
    expect(isRearCombatLocation('left_torso_rear')).toBe(true);
    expect(isRearCombatLocation('right_torso_rear')).toBe(true);
    expect(isRearCombatLocation('center_torso')).toBe(false);
  });

  it('identifies limb and torso construction locations', () => {
    expect(isLimbLocation(MechLocation.LEFT_ARM)).toBe(true);
    expect(isLimbLocation(MechLocation.RIGHT_LEG)).toBe(true);
    expect(isLimbLocation(MechLocation.CENTER_TORSO)).toBe(false);

    expect(isTorsoLocation(MechLocation.CENTER_TORSO)).toBe(true);
    expect(isTorsoLocation(MechLocation.LEFT_TORSO)).toBe(true);
    expect(isTorsoLocation(MechLocation.RIGHT_TORSO)).toBe(true);
    expect(isTorsoLocation(MechLocation.HEAD)).toBe(false);
  });

  it.each<readonly [CombatLocation, CombatLocation]>([
    ['center_torso_rear', 'center_torso'],
    ['left_torso_rear', 'left_torso'],
    ['right_torso_rear', 'right_torso'],
    ['head', 'head'],
  ])('maps %s to front combat location %s', (input, expected) => {
    expect(getFrontCombatLocation(input)).toBe(expected);
  });

  it.each<readonly [MechLocation, MechLocation | null]>([
    [MechLocation.LEFT_ARM, MechLocation.LEFT_TORSO],
    [MechLocation.RIGHT_ARM, MechLocation.RIGHT_TORSO],
    [MechLocation.LEFT_LEG, MechLocation.LEFT_TORSO],
    [MechLocation.RIGHT_LEG, MechLocation.RIGHT_TORSO],
    [MechLocation.LEFT_TORSO, MechLocation.CENTER_TORSO],
    [MechLocation.RIGHT_TORSO, MechLocation.CENTER_TORSO],
    [MechLocation.HEAD, null],
    [MechLocation.CENTER_TORSO, null],
  ])('maps %s to construction transfer location %s', (input, expected) => {
    expect(getTransferLocation(input)).toBe(expected);
  });

  it.each<readonly [CombatLocation, CombatLocation | null]>([
    ['left_arm', 'left_torso'],
    ['right_arm', 'right_torso'],
    ['left_leg', 'left_torso'],
    ['right_leg', 'right_torso'],
    ['left_torso', 'center_torso'],
    ['left_torso_rear', 'center_torso'],
    ['right_torso', 'center_torso'],
    ['right_torso_rear', 'center_torso'],
    ['head', null],
    ['center_torso', null],
    ['center_torso_rear', null],
  ])('maps %s to combat transfer location %s', (input, expected) => {
    expect(getTransferCombatLocation(input)).toBe(expected);
  });
});
