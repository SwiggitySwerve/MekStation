import { MechLocation } from '@/types/construction/CriticalSlotAllocation';
import { STRUCTURE_POINTS_TABLE } from '@/types/construction/InternalStructureType';
import {
  IRecordSheetArmor,
  ILocationArmor,
  LOCATION_NAMES,
  LOCATION_ABBREVIATIONS,
} from '@/types/printing';

import type { IUnitConfig } from './types';

import { getMechType } from './mechTypeUtils';

export function extractArmor(unit: IUnitConfig): IRecordSheetArmor {
  const { armor, tonnage, configuration } = unit;
  const structurePoints =
    STRUCTURE_POINTS_TABLE[tonnage] || STRUCTURE_POINTS_TABLE[50];
  const mechType = getMechType(configuration);

  const baseLocations: ILocationArmor[] = [
    {
      location: LOCATION_NAMES[MechLocation.HEAD],
      abbreviation: LOCATION_ABBREVIATIONS[MechLocation.HEAD],
      current: armor.allocation.head,
      maximum: 9,
    },
    {
      location: LOCATION_NAMES[MechLocation.CENTER_TORSO],
      abbreviation: LOCATION_ABBREVIATIONS[MechLocation.CENTER_TORSO],
      current: armor.allocation.centerTorso,
      maximum: structurePoints.centerTorso * 2,
      rear: armor.allocation.centerTorsoRear,
      rearMaximum: structurePoints.centerTorso,
    },
    {
      location: LOCATION_NAMES[MechLocation.LEFT_TORSO],
      abbreviation: LOCATION_ABBREVIATIONS[MechLocation.LEFT_TORSO],
      current: armor.allocation.leftTorso,
      maximum: structurePoints.sideTorso * 2,
      rear: armor.allocation.leftTorsoRear,
      rearMaximum: structurePoints.sideTorso,
    },
    {
      location: LOCATION_NAMES[MechLocation.RIGHT_TORSO],
      abbreviation: LOCATION_ABBREVIATIONS[MechLocation.RIGHT_TORSO],
      current: armor.allocation.rightTorso,
      maximum: structurePoints.sideTorso * 2,
      rear: armor.allocation.rightTorsoRear,
      rearMaximum: structurePoints.sideTorso,
    },
  ];

  let limbLocations: ILocationArmor[];

  if (mechType === 'quad') {
    limbLocations = [
      {
        location: 'Front Left Leg',
        abbreviation: 'FLL',
        current: armor.allocation.frontLeftLeg ?? 0,
        maximum: structurePoints.leg * 2,
      },
      {
        location: 'Front Right Leg',
        abbreviation: 'FRL',
        current: armor.allocation.frontRightLeg ?? 0,
        maximum: structurePoints.leg * 2,
      },
      {
        location: 'Rear Left Leg',
        abbreviation: 'RLL',
        current: armor.allocation.rearLeftLeg ?? 0,
        maximum: structurePoints.leg * 2,
      },
      {
        location: 'Rear Right Leg',
        abbreviation: 'RRL',
        current: armor.allocation.rearRightLeg ?? 0,
        maximum: structurePoints.leg * 2,
      },
    ];
  } else if (mechType === 'tripod') {
    limbLocations = [
      {
        location: LOCATION_NAMES[MechLocation.LEFT_ARM],
        abbreviation: LOCATION_ABBREVIATIONS[MechLocation.LEFT_ARM],
        current: armor.allocation.leftArm,
        maximum: structurePoints.arm * 2,
      },
      {
        location: LOCATION_NAMES[MechLocation.RIGHT_ARM],
        abbreviation: LOCATION_ABBREVIATIONS[MechLocation.RIGHT_ARM],
        current: armor.allocation.rightArm,
        maximum: structurePoints.arm * 2,
      },
      {
        location: LOCATION_NAMES[MechLocation.LEFT_LEG],
        abbreviation: LOCATION_ABBREVIATIONS[MechLocation.LEFT_LEG],
        current: armor.allocation.leftLeg,
        maximum: structurePoints.leg * 2,
      },
      {
        location: LOCATION_NAMES[MechLocation.RIGHT_LEG],
        abbreviation: LOCATION_ABBREVIATIONS[MechLocation.RIGHT_LEG],
        current: armor.allocation.rightLeg,
        maximum: structurePoints.leg * 2,
      },
      {
        location: LOCATION_NAMES[MechLocation.CENTER_LEG],
        abbreviation: LOCATION_ABBREVIATIONS[MechLocation.CENTER_LEG],
        current: armor.allocation.centerLeg ?? 0,
        maximum: structurePoints.leg * 2,
      },
    ];
  } else {
    limbLocations = [
      {
        location: LOCATION_NAMES[MechLocation.LEFT_ARM],
        abbreviation: LOCATION_ABBREVIATIONS[MechLocation.LEFT_ARM],
        current: armor.allocation.leftArm,
        maximum: structurePoints.arm * 2,
      },
      {
        location: LOCATION_NAMES[MechLocation.RIGHT_ARM],
        abbreviation: LOCATION_ABBREVIATIONS[MechLocation.RIGHT_ARM],
        current: armor.allocation.rightArm,
        maximum: structurePoints.arm * 2,
      },
      {
        location: LOCATION_NAMES[MechLocation.LEFT_LEG],
        abbreviation: LOCATION_ABBREVIATIONS[MechLocation.LEFT_LEG],
        current: armor.allocation.leftLeg,
        maximum: structurePoints.leg * 2,
      },
      {
        location: LOCATION_NAMES[MechLocation.RIGHT_LEG],
        abbreviation: LOCATION_ABBREVIATIONS[MechLocation.RIGHT_LEG],
        current: armor.allocation.rightLeg,
        maximum: structurePoints.leg * 2,
      },
    ];
  }

  const locations = [...baseLocations, ...limbLocations];

  const totalPoints = locations.reduce((sum, loc) => {
    return sum + loc.current + (loc.rear || 0);
  }, 0);

  return {
    type: armor.type,
    totalPoints,
    locations,
  };
}
