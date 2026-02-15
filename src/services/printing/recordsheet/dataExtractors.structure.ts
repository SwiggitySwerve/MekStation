import { MechLocation } from '@/types/construction/CriticalSlotAllocation';
import { STRUCTURE_POINTS_TABLE } from '@/types/construction/InternalStructureType';
import {
  IRecordSheetStructure,
  ILocationStructure,
  LOCATION_NAMES,
  LOCATION_ABBREVIATIONS,
} from '@/types/printing';

import type { IUnitConfig } from './types';

import { getMechType } from './mechTypeUtils';

export function extractStructure(unit: IUnitConfig): IRecordSheetStructure {
  const structurePoints =
    STRUCTURE_POINTS_TABLE[unit.tonnage] || STRUCTURE_POINTS_TABLE[50];
  const mechType = getMechType(unit.configuration);

  const baseLocations: ILocationStructure[] = [
    {
      location: LOCATION_NAMES[MechLocation.HEAD],
      abbreviation: LOCATION_ABBREVIATIONS[MechLocation.HEAD],
      points: structurePoints.head,
    },
    {
      location: LOCATION_NAMES[MechLocation.CENTER_TORSO],
      abbreviation: LOCATION_ABBREVIATIONS[MechLocation.CENTER_TORSO],
      points: structurePoints.centerTorso,
    },
    {
      location: LOCATION_NAMES[MechLocation.LEFT_TORSO],
      abbreviation: LOCATION_ABBREVIATIONS[MechLocation.LEFT_TORSO],
      points: structurePoints.sideTorso,
    },
    {
      location: LOCATION_NAMES[MechLocation.RIGHT_TORSO],
      abbreviation: LOCATION_ABBREVIATIONS[MechLocation.RIGHT_TORSO],
      points: structurePoints.sideTorso,
    },
  ];

  let limbLocations: ILocationStructure[];

  if (mechType === 'quad') {
    limbLocations = [
      {
        location: 'Front Left Leg',
        abbreviation: 'FLL',
        points: structurePoints.leg,
      },
      {
        location: 'Front Right Leg',
        abbreviation: 'FRL',
        points: structurePoints.leg,
      },
      {
        location: 'Rear Left Leg',
        abbreviation: 'RLL',
        points: structurePoints.leg,
      },
      {
        location: 'Rear Right Leg',
        abbreviation: 'RRL',
        points: structurePoints.leg,
      },
    ];
  } else if (mechType === 'tripod') {
    limbLocations = [
      {
        location: LOCATION_NAMES[MechLocation.LEFT_ARM],
        abbreviation: LOCATION_ABBREVIATIONS[MechLocation.LEFT_ARM],
        points: structurePoints.arm,
      },
      {
        location: LOCATION_NAMES[MechLocation.RIGHT_ARM],
        abbreviation: LOCATION_ABBREVIATIONS[MechLocation.RIGHT_ARM],
        points: structurePoints.arm,
      },
      {
        location: LOCATION_NAMES[MechLocation.LEFT_LEG],
        abbreviation: LOCATION_ABBREVIATIONS[MechLocation.LEFT_LEG],
        points: structurePoints.leg,
      },
      {
        location: LOCATION_NAMES[MechLocation.RIGHT_LEG],
        abbreviation: LOCATION_ABBREVIATIONS[MechLocation.RIGHT_LEG],
        points: structurePoints.leg,
      },
      {
        location: LOCATION_NAMES[MechLocation.CENTER_LEG],
        abbreviation: LOCATION_ABBREVIATIONS[MechLocation.CENTER_LEG],
        points: structurePoints.leg,
      },
    ];
  } else {
    limbLocations = [
      {
        location: LOCATION_NAMES[MechLocation.LEFT_ARM],
        abbreviation: LOCATION_ABBREVIATIONS[MechLocation.LEFT_ARM],
        points: structurePoints.arm,
      },
      {
        location: LOCATION_NAMES[MechLocation.RIGHT_ARM],
        abbreviation: LOCATION_ABBREVIATIONS[MechLocation.RIGHT_ARM],
        points: structurePoints.arm,
      },
      {
        location: LOCATION_NAMES[MechLocation.LEFT_LEG],
        abbreviation: LOCATION_ABBREVIATIONS[MechLocation.LEFT_LEG],
        points: structurePoints.leg,
      },
      {
        location: LOCATION_NAMES[MechLocation.RIGHT_LEG],
        abbreviation: LOCATION_ABBREVIATIONS[MechLocation.RIGHT_LEG],
        points: structurePoints.leg,
      },
    ];
  }

  const locations = [...baseLocations, ...limbLocations];
  const totalPoints = locations.reduce((sum, loc) => sum + loc.points, 0);

  return {
    type: unit.structure.type,
    totalPoints,
    locations,
  };
}
