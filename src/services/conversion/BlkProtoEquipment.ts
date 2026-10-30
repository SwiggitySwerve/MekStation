import { ProtoMechLocation } from '@/types/construction/UnitLocation';

import { readBlkProtoEquipmentName } from './BlkProtoEquipmentEntry';

/**
 * Native BLK aliases of every MiscType with F_MASC at MegaMek 48fcb2f6.
 * These source identities intentionally do not use the fuzzy catalog resolver.
 * See BLK_PROTOMEK_EQUIPMENT.md for the loader contract and its limits.
 */
const BOOSTER_DISPLAY_NAMES = [
  'MASC',
  'Supercharger',
  'VTOL Jet Booster',
  'Protomek Myomer Booster',
  'BA Myomer Booster',
];

const BOOSTER_NAMES = new Set(
  [
    ...BOOSTER_DISPLAY_NAMES,
    'ISMASC',
    'IS MASC',
    'CLMASC',
    'Clan MASC',
    'IS Super Charger',
    'ISSuperCharger',
    'CLSuperCharger',
    'CL SuperCharger',
    'CL Super Charger',
    'ISVTOLJetBooster',
    'CLVTOLJetBooster',
    'CLMyomerBooster',
    'CLBAMyomerBooster',
    'CLBAMB',
    'BAMyomerBooster',
  ].map((name) => name.toLowerCase()),
);

function isBoosterName(name: string): boolean {
  if (BOOSTER_NAMES.has(name)) return true;
  // Native display names are ASCII. Length guards reject JS full-case expansions;
  // upper/lower folding retains Java's long-S and Kelvin-sign display matches.
  const folded = name.toUpperCase().toLowerCase();
  return (
    folded.length === name.length &&
    BOOSTER_DISPLAY_NAMES.some((display) => display.toLowerCase() === folded)
  );
}

/** Derive the undamaged source effect without mutating or resolving raw mounts. */
export function readBlkProtoBooster(
  equipmentByLocation: Readonly<Record<string, readonly string[]>>,
  hasMainGun: boolean,
  sourceType: string,
): { readonly hasMyomerBooster: boolean; readonly errors: readonly string[] } {
  const locations = new Set([
    'body',
    ...Object.values(ProtoMechLocation)
      .filter(
        (location) => hasMainGun || location !== ProtoMechLocation.MAIN_GUN,
      )
      .map((location) => location.toLowerCase()),
  ]);
  const errors: string[] = [];
  const visited = new Set<string>();
  const technologyPrefix = /^Clan /i.test(sourceType) ? 'clan ' : 'is ';
  // BLKProtoMekFile uses T_CLAN_TW specifically, not all Clan rules levels.
  const fallbackPrefix = /^Clan Level 2$/i.test(sourceType) ? 'clan ' : 'is ';
  let hasMyomerBooster = false;
  for (const [location, entries] of Object.entries(equipmentByLocation)) {
    // The parser retains the suffix for differently-cased Equipment block keys.
    const normalized = location.replace(/ equipment$/i, '').toLowerCase();
    if (!locations.has(normalized) || visited.has(normalized)) continue;
    visited.add(normalized);
    for (const entry of entries) {
      const name = readBlkProtoEquipmentName(entry, errors)?.toLowerCase();
      if (
        name !== undefined &&
        ((!/^(clan|is) /.test(name) &&
          isBoosterName(technologyPrefix + name)) ||
          isBoosterName(name) ||
          isBoosterName(fallbackPrefix + name))
      ) {
        hasMyomerBooster = true;
      }
    }
  }
  return { hasMyomerBooster, errors };
}

interface IBlkProtoEquipmentEntry {
  readonly name: string;
  readonly location?: string;
}

/** Project the exact equipment blocks emitted by the existing ProtoMech writer. */
export function getBlkProtoEquipmentByLocation(
  equipment: readonly IBlkProtoEquipmentEntry[],
): Record<string, string[]> {
  const locationMap: Record<string, string[]> = {};
  for (const entry of equipment) {
    const location = entry.location || ProtoMechLocation.TORSO;
    if (!locationMap[location]) locationMap[location] = [];
    locationMap[location].push(entry.name);
  }

  const emitted: Record<string, string[]> = {};
  const order = [
    ProtoMechLocation.HEAD,
    ProtoMechLocation.TORSO,
    ProtoMechLocation.MAIN_GUN,
    ProtoMechLocation.LEFT_ARM,
    ProtoMechLocation.RIGHT_ARM,
    ProtoMechLocation.LEGS,
  ];
  for (const location of order) {
    const items = locationMap[location];
    if (items && items.length > 0) emitted[location] = items;
  }
  return emitted;
}

/** Refuse exports whose emitted mounts cannot retain the declared booster effect. */
export function getBlkProtoEquipmentExportErrors(
  equipment: readonly IBlkProtoEquipmentEntry[],
  hasMainGun: boolean,
  hasMyomerBooster: boolean,
  sourceType: string,
): readonly string[] {
  const emitted = getBlkProtoEquipmentByLocation(equipment);
  const errors: string[] = [];
  for (const names of Object.values(emitted)) {
    for (const name of names) {
      // Line breaks and tags change the block structure rather than name a mount.
      if (/[\r\n<>]/.test(name)) {
        errors.push(
          `ProtoMek equipment must be a single BLK line without tags: ${JSON.stringify(name)}`,
        );
      }
    }
  }
  if (errors.length > 0) return errors;

  const booster = readBlkProtoBooster(emitted, hasMainGun, sourceType);
  errors.push(...booster.errors);
  if (booster.hasMyomerBooster !== hasMyomerBooster) {
    errors.push(
      'ProtoMek myomer booster flag disagrees with emitted equipment; reconcile the flag and mounts before export',
    );
  }
  return errors;
}
