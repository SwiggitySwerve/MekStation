import { ProtoMechLocation } from '@/types/construction/UnitLocation';

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

// Decimal zeroes from the pinned Java 21 Character.digit(char, 10) table.
// Integer.parseInt reads UTF-16 chars, so supplementary digits are not admitted.
const JAVA_DECIMAL_ZEROES = [
  0x30, 0x660, 0x6f0, 0x7c0, 0x966, 0x9e6, 0xa66, 0xae6, 0xb66, 0xbe6, 0xc66,
  0xce6, 0xd66, 0xde6, 0xe50, 0xed0, 0xf20, 0x1040, 0x1090, 0x17e0, 0x1810,
  0x1946, 0x19d0, 0x1a80, 0x1a90, 0x1b50, 0x1bb0, 0x1c40, 0x1c50, 0xa620,
  0xa8d0, 0xa900, 0xa9d0, 0xa9f0, 0xaa50, 0xabf0, 0xff10,
];

function normalizeShotDigits(shots: string): string {
  return shots.replace(/[\u0080-\uffff]/g, (character) => {
    const code = character.charCodeAt(0);
    const zero = JAVA_DECIMAL_ZEROES.find(
      (start) => code >= start && code < start + 10,
    );
    return zero === undefined ? character : String(code - zero);
  });
}

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
    const shots = normalizeShotDigits(name.slice(shotsIndex + 2, -1));
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
      const name = equipmentName(entry, errors)?.toLowerCase();
      if (
        name !== undefined &&
        ((!/^(clan|is) /.test(name) &&
          BOOSTER_NAMES.has(technologyPrefix + name)) ||
          BOOSTER_NAMES.has(name) ||
          BOOSTER_NAMES.has(fallbackPrefix + name))
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
