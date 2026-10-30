import { ProtoMechLocation } from '@/types/construction/UnitLocation';

/**
 * Native BLK aliases of every MiscType with F_MASC at MegaMek 48fcb2f6.
 * These source identities intentionally do not use the fuzzy catalog resolver.
 * See BLK_PROTOMEK_EQUIPMENT.md for the loader contract and its limits.
 */
const BOOSTER_NAMES = new Set(
  [
    'ISMASC',
    'IS MASC',
    'CLMASC',
    'Clan MASC',
    'MASC',
    'Supercharger',
    'IS Super Charger',
    'ISSuperCharger',
    'CLSuperCharger',
    'CL SuperCharger',
    'CL Super Charger',
    'ISVTOLJetBooster',
    'CLVTOLJetBooster',
    'VTOL Jet Booster',
    'CLMyomerBooster',
    'Protomek Myomer Booster',
    'CLBAMyomerBooster',
    'CLBAMB',
    'BAMyomerBooster',
    'BA Myomer Booster',
  ].map((name) => name.toLowerCase()),
);

function equipmentName(raw: string, errors: string[]): string | undefined {
  let name = raw.trim();
  const sizeIndex = name.toUpperCase().indexOf(':SIZE:');
  if (sizeIndex > 0) {
    const size = name.slice(sizeIndex + 6).trim();
    const decimal = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?[df]?$/i;
    if (
      !decimal.test(size) ||
      !Number.isFinite(Number(size.replace(/[df]$/i, '')))
    ) {
      errors.push(`Invalid ProtoMek equipment size: ${raw}`);
      return undefined;
    }
    name = name.slice(0, sizeIndex);
  }
  if (name.startsWith('(R) ')) name = name.slice(4);
  const shotsIndex = name.lastIndexOf(' (');
  if (shotsIndex > 0) {
    const shots = name.slice(shotsIndex + 2, -1);
    const count = Number(shots);
    if (
      !/^[+-]?\d+$/.test(shots) ||
      !Number.isInteger(count) ||
      count < 0 ||
      count > 2147483647
    ) {
      errors.push(`Invalid ProtoMek equipment shot count: ${raw}`);
      return undefined;
    }
    name = name.slice(0, shotsIndex);
  }
  return name;
}

/** Derive the undamaged source effect without mutating or resolving raw mounts. */
export function readBlkProtoBooster(
  equipmentByLocation: Readonly<Record<string, readonly string[]>>,
  hasMainGun: boolean,
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
  let hasMyomerBooster = false;
  for (const [location, entries] of Object.entries(equipmentByLocation)) {
    // The parser retains the suffix for differently-cased Equipment block keys.
    if (!locations.has(location.replace(/ equipment$/i, '').toLowerCase()))
      continue;
    for (const entry of entries) {
      const name = equipmentName(entry, errors);
      if (name !== undefined && BOOSTER_NAMES.has(name.toLowerCase())) {
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

  const booster = readBlkProtoBooster(emitted, hasMainGun);
  errors.push(...booster.errors);
  if (booster.hasMyomerBooster !== hasMyomerBooster) {
    errors.push(
      'ProtoMek myomer booster flag disagrees with emitted equipment; reconcile the flag and mounts before export',
    );
  }
  return errors;
}
