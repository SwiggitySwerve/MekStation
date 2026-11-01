import { GroundMotionType } from '@/types/unit/BaseUnitInterfaces';

import type { VehicleBVInput } from './vehicleBVTypes';

type ChassisModification =
  | 'fully-amphibious'
  | 'sealing'
  | 'flotation'
  | 'other';

/** Java MiscType names/aliases and their normalized converter identifiers. */
function chassisModification(id: string): ChassisModification | undefined {
  const key = id
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .replace(/^(clan|is|cl)/, '')
    .replace(/^combatvehiclechassismod/, '');
  switch (key) {
    case 'fullyamphibious':
    case 'fullyamphibiouschassis':
      return 'fully-amphibious';
    case 'environmentalsealedchassis':
    case 'environmentalsealingchassismod':
    case 'environmentalsealing':
    case 'environmentalsealingmech':
    case 'vacuumprotection':
      return 'sealing';
    case 'flotationhull':
      return 'flotation';
    case 'limitedamphibious':
    case 'limitedamphibiouschassis':
    case 'dunebuggy':
    case 'cvdunebuggy':
    case 'cvdunebuggychassis':
    case 'armoredmotivesystem':
      return 'other';
    default:
      return undefined;
  }
}

/** @spec establish-all-unit-data-parity/battle-value-system */
export function getVehicleDefensiveTypeModifier(input: VehicleBVInput): number {
  let modifier: number;
  switch (input.motionType) {
    case GroundMotionType.TRACKED:
      modifier = 0.9;
      break;
    case GroundMotionType.WHEELED:
      modifier = 0.8;
      break;
    case GroundMotionType.HOVER:
    case GroundMotionType.VTOL:
    case GroundMotionType.WIGE:
      modifier = 0.7;
      break;
    default:
      modifier = 0.6;
  }
  if (input.isSupportVehicle) return modifier;

  const modifications = (input.chassisEquipment ?? []).map(chassisModification);
  for (const modification of modifications) {
    if (modification !== undefined) {
      modifier += modification === 'fully-amphibious' ? 0.2 : 0.1;
    }
  }
  // Store flags describe the same installed equipment: do not count it twice.
  if (input.hasEnvironmentalSealing && !modifications.includes('sealing')) {
    modifier += 0.1;
  }
  if (input.hasFlotationHull && !modifications.includes('flotation')) {
    modifier += 0.1;
  }
  return modifier;
}
