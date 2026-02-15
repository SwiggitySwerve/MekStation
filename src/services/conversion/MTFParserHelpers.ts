import { ISerializedFluff } from '@/types/unit/UnitSerialization';

import { normalizeEquipmentId, normalizeLocation } from './MTFParser.mapping';

export {
  parseEngine,
  parseHeatSinks,
  parseArmor,
} from './MTFParser.components';
export {
  mapEraFromYear,
  mapTechBase,
  mapRulesLevel,
  mapEngineType,
  mapStructureType,
  mapArmorType,
  normalizeEquipmentId,
  normalizeLocation,
  generateUnitId,
} from './MTFParser.mapping';

const LOCATION_HEADERS: Record<string, string> = {
  'Left Arm:': 'LEFT_ARM',
  'Right Arm:': 'RIGHT_ARM',
  'Left Torso:': 'LEFT_TORSO',
  'Right Torso:': 'RIGHT_TORSO',
  'Center Torso:': 'CENTER_TORSO',
  'Head:': 'HEAD',
  'Left Leg:': 'LEFT_LEG',
  'Right Leg:': 'RIGHT_LEG',
  'Front Left Leg:': 'FRONT_LEFT_LEG',
  'Front Right Leg:': 'FRONT_RIGHT_LEG',
  'Rear Left Leg:': 'REAR_LEFT_LEG',
  'Rear Right Leg:': 'REAR_RIGHT_LEG',
  'Center Leg:': 'CENTER_LEG',
};

const SLOT_COUNTS: Record<string, number> = {
  HEAD: 6,
  CENTER_TORSO: 12,
  LEFT_TORSO: 12,
  RIGHT_TORSO: 12,
  LEFT_ARM: 12,
  RIGHT_ARM: 12,
  LEFT_LEG: 6,
  RIGHT_LEG: 6,
  FRONT_LEFT_LEG: 6,
  FRONT_RIGHT_LEG: 6,
  REAR_LEFT_LEG: 6,
  REAR_RIGHT_LEG: 6,
  CENTER_LEG: 6,
};

export interface ParsedMTFHeader {
  chassis: string;
  model: string;
  config: string;
  techBase: string;
  year: number;
  rulesLevel: string;
  mulId?: number;
  role?: string;
  source?: string;
  clanname?: string;
  isOmni: boolean;
  baseChassisHeatSinks?: number;
}

export function parseField(
  lines: string[],
  fieldName: string,
): string | undefined {
  const pattern = new RegExp(`^${fieldName}:(.*)$`, 'i');
  for (const line of lines) {
    const match = line.match(pattern);
    if (match) {
      return match[1].trim();
    }
  }
  return undefined;
}

export function parseHeader(lines: string[]): ParsedMTFHeader {
  const chassis = parseField(lines, 'chassis') || '';
  const model = parseField(lines, 'model');
  const clanname = parseField(lines, 'clanname');
  const config = parseField(lines, 'Config') || 'Biped';

  const isOmni = config.toLowerCase().includes('omnimech');
  const baseHSField = parseField(lines, 'Base Chassis Heat Sinks');
  const baseChassisHeatSinks = baseHSField
    ? parseInt(baseHSField, 10)
    : undefined;

  return {
    chassis,
    model: model || '',
    config,
    techBase: parseField(lines, 'techbase') || 'Inner Sphere',
    year: parseInt(parseField(lines, 'era') || '3025', 10),
    rulesLevel: parseField(lines, 'rules level') || '2',
    mulId: parseInt(parseField(lines, 'mul id') || '0', 10) || undefined,
    role: parseField(lines, 'role') || undefined,
    source: parseField(lines, 'source') || undefined,
    clanname,
    isOmni,
    baseChassisHeatSinks,
  };
}

export function parseWeapons(
  lines: string[],
): Array<{ id: string; location: string; isOmniPodMounted?: boolean }> {
  const weapons: Array<{
    id: string;
    location: string;
    isOmniPodMounted?: boolean;
  }> = [];

  let inWeaponsSection = false;
  let _weaponCount = 0;

  for (const line of lines) {
    if (line.startsWith('Weapons:')) {
      const match = line.match(/Weapons:(\d+)/);
      if (match) {
        _weaponCount = parseInt(match[1], 10);
      }
      inWeaponsSection = true;
      continue;
    }

    if (inWeaponsSection) {
      if (line.trim() === '' || line.endsWith(':')) {
        break;
      }

      const match = line.match(/^(.+),\s*(.+)$/);
      if (match) {
        let weaponName = match[1].trim();
        const location = normalizeLocation(match[2].trim());

        const isOmniPodMounted = weaponName.toLowerCase().includes('(omnipod)');
        if (isOmniPodMounted) {
          weaponName = weaponName.replace(/\s*\(omnipod\)\s*/i, '').trim();
        }

        weapons.push({
          id: normalizeEquipmentId(weaponName),
          location,
          ...(isOmniPodMounted && { isOmniPodMounted: true }),
        });
      }
    }
  }

  return weapons;
}

function padSlots(
  slots: (string | null)[],
  location: string,
): (string | null)[] {
  const expectedCount = SLOT_COUNTS[location] || 12;
  const result = [...slots];

  if (result.length > expectedCount) {
    return result.slice(0, expectedCount);
  }

  while (result.length < expectedCount) {
    result.push(null);
  }

  return result;
}

export function parseCriticalSlots(
  lines: string[],
): Record<string, (string | null)[]> {
  const criticalSlots: Record<string, (string | null)[]> = {};

  let currentLocation: string | null = null;
  let currentSlots: (string | null)[] = [];

  for (const line of lines) {
    for (const [header, location] of Object.entries(LOCATION_HEADERS)) {
      if (line.trim() === header) {
        if (currentLocation) {
          criticalSlots[currentLocation] = padSlots(
            currentSlots,
            currentLocation,
          );
        }
        currentLocation = location;
        currentSlots = [];
        break;
      }
    }

    if (currentLocation && !line.endsWith(':') && line.trim() !== '') {
      const slotContent = line.trim();

      if (slotContent.startsWith('#')) {
        continue;
      }

      if (
        slotContent.includes(':') &&
        !slotContent.startsWith('-') &&
        !slotContent.includes('(')
      ) {
        if (currentLocation) {
          criticalSlots[currentLocation] = padSlots(
            currentSlots,
            currentLocation,
          );
        }
        currentLocation = null;
        continue;
      }

      if (slotContent === '-Empty-') {
        currentSlots.push(null);
      } else {
        currentSlots.push(slotContent);
      }
    }
  }

  if (currentLocation) {
    criticalSlots[currentLocation] = padSlots(currentSlots, currentLocation);
  }

  return criticalSlots;
}

export function parseQuirks(lines: string[]): string[] {
  const quirks: string[] = [];

  for (const line of lines) {
    if (line.startsWith('quirk:')) {
      const quirk = line.substring(6).trim();
      if (quirk) {
        quirks.push(quirk);
      }
    }
  }

  return quirks;
}

export function parseWeaponQuirks(lines: string[]): Record<string, string[]> {
  const result: Record<string, string[]> = {};

  for (const line of lines) {
    if (!line.startsWith('weapon_quirk:')) continue;

    const parts = line.substring('weapon_quirk:'.length).split(':');
    if (parts.length < 2) continue;

    const quirkName = parts[0].trim();
    const weaponName = parts[1].trim();

    if (!quirkName || !weaponName) continue;

    if (!result[weaponName]) {
      result[weaponName] = [];
    }
    result[weaponName].push(quirkName);
  }

  return result;
}

export function parseFluff(lines: string[]): ISerializedFluff {
  const fluff: Record<string, string | Record<string, string>> = {};

  const fluffFields = [
    'overview',
    'capabilities',
    'history',
    'deployment',
    'manufacturer',
    'primaryfactory',
  ];

  for (const field of fluffFields) {
    const value = parseField(lines, field);
    if (value) {
      const key = field === 'primaryfactory' ? 'primaryFactory' : field;
      fluff[key] = value;
    }
  }

  const systemManufacturer: Record<string, string> = {};
  for (const line of lines) {
    if (line.startsWith('systemmanufacturer:')) {
      const content = line.substring(19).trim();
      const match = content.match(/^([A-Z]+):(.+)$/);
      if (match) {
        systemManufacturer[match[1]] = match[2].trim();
      }
    }
  }

  if (Object.keys(systemManufacturer).length > 0) {
    fluff.systemManufacturer = systemManufacturer;
  }

  return fluff as ISerializedFluff;
}
