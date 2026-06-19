import { AerospaceLocation } from '@/types/construction/UnitLocation';
import { IBlkDocument } from '@/types/formats/BlkFormat';
import {
  AerospaceCockpitType,
  IAerospaceMountedEquipment,
} from '@/types/unit/AerospaceInterfaces';

import {
  mapLocationEquipment,
  type AerospaceUnitCoreFields,
} from './unitHandlerShared';

const AEROSPACE_LOCATION_ENTRIES: readonly (readonly [
  string,
  AerospaceLocation,
])[] = [
  ['nose', AerospaceLocation.NOSE],
  ['nose equipment', AerospaceLocation.NOSE],
  ['left wing', AerospaceLocation.LEFT_WING],
  ['left wing equipment', AerospaceLocation.LEFT_WING],
  ['right wing', AerospaceLocation.RIGHT_WING],
  ['right wing equipment', AerospaceLocation.RIGHT_WING],
  ['aft', AerospaceLocation.AFT],
  ['aft equipment', AerospaceLocation.AFT],
  ['fuselage', AerospaceLocation.FUSELAGE],
  ['fuselage equipment', AerospaceLocation.FUSELAGE],
  ['wings', AerospaceLocation.LEFT_WING],
  ['wings equipment', AerospaceLocation.LEFT_WING],
];

const AEROSPACE_LOCATION_MAP = Object.fromEntries(AEROSPACE_LOCATION_ENTRIES);

const COCKPIT_TYPE_BY_CODE: Record<number, AerospaceCockpitType> = {
  1: AerospaceCockpitType.SMALL,
  2: AerospaceCockpitType.PRIMITIVE,
  3: AerospaceCockpitType.COMMAND_CONSOLE,
};

const FIGHTER_COCKPIT_TYPE_BY_CODE: Record<number, AerospaceCockpitType> = {
  1: AerospaceCockpitType.SMALL,
  2: AerospaceCockpitType.PRIMITIVE,
};

export interface AerospaceArmorByArc {
  readonly nose: number;
  readonly leftWing: number;
  readonly rightWing: number;
  readonly aft: number;
}

export interface AerospaceBasics extends AerospaceUnitCoreFields {
  readonly engineType: number;
  readonly armorType: number;
  readonly armor: readonly number[];
  readonly armorByArc: AerospaceArmorByArc;
  readonly totalArmorPoints: number;
}

export function parseAerospaceBasics(
  document: IBlkDocument,
  defaultHeatSinks: number,
): AerospaceBasics {
  const safeThrust = document.safeThrust || 0;
  const armor = document.armor || [];

  return {
    movement: { safeThrust, maxThrust: Math.floor(safeThrust * 1.5) },
    fuel: document.fuel || 0,
    structuralIntegrity: document.structuralIntegrity || 0,
    heatSinks: document.heatsinks || defaultHeatSinks,
    heatSinkType: document.sinkType || 0,
    engineType: document.engineType || 0,
    armorType: document.armorType || 0,
    armor,
    armorByArc: parseAerospaceArmorByArc(armor),
    totalArmorPoints: armor.reduce((sum, val) => sum + val, 0),
  };
}

export function parseAerospaceArmorByArc(
  armor: readonly number[],
): AerospaceArmorByArc {
  const [nose = 0, leftWing = 0, rightWing = 0, aft = 0] = armor;
  return { nose, leftWing, rightWing, aft };
}

export function parseAerospaceCockpitType(
  document: IBlkDocument,
): AerospaceCockpitType {
  return (
    COCKPIT_TYPE_BY_CODE[document.cockpitType || 0] ||
    AerospaceCockpitType.STANDARD
  );
}

export function parseFighterCockpitType(
  document: IBlkDocument,
): AerospaceCockpitType {
  return (
    FIGHTER_COCKPIT_TYPE_BY_CODE[document.cockpitType || 0] ||
    AerospaceCockpitType.STANDARD
  );
}

export function parseAerospaceEquipment(
  document: IBlkDocument,
): readonly IAerospaceMountedEquipment[] {
  return mapLocationEquipment(
    document.equipmentByLocation,
    normalizeAerospaceLocation,
    ({ mountId, item, location }) => ({
      id: `mount-${mountId}`,
      equipmentId: item,
      name: item,
      location,
    }),
  );
}

export function hasBombEquipment(document: IBlkDocument): boolean {
  return Object.values(document.equipmentByLocation).some((items) =>
    items.some((item) => item.toLowerCase().includes('bomb')),
  );
}

export function normalizeAerospaceLocation(
  locationKey: string,
): AerospaceLocation {
  return (
    AEROSPACE_LOCATION_MAP[locationKey.toLowerCase()] ||
    AerospaceLocation.FUSELAGE
  );
}
