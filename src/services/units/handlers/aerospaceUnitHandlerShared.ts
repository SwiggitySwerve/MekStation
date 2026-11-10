import { AerospaceLocation } from '@/types/construction/UnitLocation';
import armorOrder from '@/types/formats/blk-aerospace-armor.json';
import cockpitCodes from '@/types/formats/blk-aerospace-cockpit.json';
import { IBlkDocument } from '@/types/formats/BlkFormat';
import {
  AerospaceCockpitType,
  IAerospaceMountedEquipment,
} from '@/types/unit/AerospaceInterfaces';
import { calculateMaxThrust } from '@/utils/construction/aerospace/thrustCalculations';

import { resolveAerospaceStructuralIntegrity } from '../../conversion/BlkParserService.helpers';
import {
  mapLocationEquipment,
  getRawTagString,
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

const COCKPIT_TYPE_BY_CODE: Readonly<Record<number, AerospaceCockpitType>> =
  Object.fromEntries(
    Object.entries(cockpitCodes).map(([code, name]) => {
      const type = Object.entries(AerospaceCockpitType).find(
        ([key]) => key === name,
      )?.[1];
      if (type === undefined)
        throw new Error(`Unknown shared aerospace cockpit identity: ${name}`);
      return [Number(code), type];
    }),
  );

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
  readonly armorTypeByArc?: Readonly<Record<string, number>>;
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
  // BLKAeroSpaceFighterFile.java:148-164, pin 48fcb2f64; retain native per-arc codes.
  const armorTypeByArc: Record<string, number> = {};
  for (const key of Object.keys(document.rawTags)) {
    if (!key.endsWith('_armor_type')) continue;
    const raw = getRawTagString(document.rawTags, key);
    const code = Number(raw);
    if (!raw?.trim() || !Number.isInteger(code))
      throw new TypeError(`Invalid aerospace armor type: ${key}`);
    armorTypeByArc[key.slice(0, -11).toUpperCase().replace(/ /g, '_')] = code;
  }

  return {
    movement: { safeThrust, maxThrust: calculateMaxThrust(safeThrust) },
    fuel: document.fuel || 0,
    structuralIntegrity: resolveAerospaceStructuralIntegrity(document),
    heatSinks: document.heatsinks ?? defaultHeatSinks,
    heatSinkType: document.sinkType || 0,
    engineType: document.engineType || 0,
    armorType: document.armorType || 0,
    ...(Object.keys(armorTypeByArc).length ? { armorTypeByArc } : {}),
    armor,
    armorByArc: parseAerospaceArmorByArc(armor),
    totalArmorPoints: armor.reduce((sum, val) => sum + val, 0),
  };
}

export function parseAerospaceArmorByArc(
  armor: readonly number[],
): AerospaceArmorByArc {
  const nose = armor[armorOrder.fighter.indexOf('NOSE')] ?? 0;
  const leftWing = armor[armorOrder.fighter.indexOf('LEFT_WING')] ?? 0;
  const rightWing = armor[armorOrder.fighter.indexOf('RIGHT_WING')] ?? 0;
  const aft = armor[armorOrder.fighter.indexOf('AFT')] ?? 0;
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
