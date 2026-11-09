import type { ISerializedStructure } from '@/types/unit/UnitSerialization';

import { mapStructureType } from './MTFParser.mapping';
import { parseField } from './MTFParser.types';

export function parseEngine(lines: string[]): { type: string; rating: number } {
  const engineLine = parseField(lines, 'engine');
  if (!engineLine) {
    return { type: 'Fusion', rating: 0 };
  }

  const match = engineLine.match(/^(\d+)\s+(.+)$/);
  if (match) {
    return {
      rating: parseInt(match[1], 10),
      type: match[2].trim(),
    };
  }

  return { type: engineLine, rating: 0 };
}

export function parseHeatSinks(lines: string[]): {
  type: string;
  count: number;
} {
  const hsLine = parseField(lines, 'heat sinks');
  if (!hsLine) {
    return { type: 'Single', count: 10 };
  }

  const match = hsLine.match(/^(\d+)\s+(.+)$/);
  if (match) {
    return {
      count: parseInt(match[1], 10),
      type: match[2].trim(),
    };
  }

  return { type: 'Single', count: 10 };
}

/** MTF location codes for mek body locations (armor and structure lines). */
const MTF_LOCATION_CODES: Readonly<Record<string, string>> = {
  LA: 'LEFT_ARM',
  RA: 'RIGHT_ARM',
  LT: 'LEFT_TORSO',
  RT: 'RIGHT_TORSO',
  CT: 'CENTER_TORSO',
  HD: 'HEAD',
  LL: 'LEFT_LEG',
  RL: 'RIGHT_LEG',
  FLL: 'FRONT_LEFT_LEG',
  FRL: 'FRONT_RIGHT_LEG',
  RLL: 'REAR_LEFT_LEG',
  RRL: 'REAR_RIGHT_LEG',
  CL: 'CENTER_LEG',
};

/** FrankenMek structure tonnage per location (MtfFile.java:362-411,669-702).
 * Hybrid structure, or a value with its own type, is `<type>:<tonnage>`;
 * otherwise the value is the tonnage. Internal points come from
 * calcTotalStructure, the single owner of the per-location table.
 */
export function parseStructure(
  lines: string[],
  config: string,
  structure: string,
): ISerializedStructure {
  const type = mapStructureType(structure);
  if (!config.includes('FrankenMek')) return { type };
  const hybrid = structure.trim().toLowerCase() === 'hybrid';
  const tonnage: Record<string, number> = {};
  const typeByLocation: Record<string, string> = {};
  const clan = /^(?:Clan|Mixed\s*\(Clan Chassis\))$/i.test(
    parseField(lines, 'techbase') ?? '',
  );
  for (const [code, location] of Object.entries(MTF_LOCATION_CODES)) {
    const value = parseField(lines, `${code} structure`);
    if (!value) continue;
    const raw = hybrid || value.includes(':') ? value.split(':').pop() : value;
    if (!/^\s*\d+\s*$/.test(raw ?? ''))
      throw new Error(
        `Invalid FrankenMek structure tonnage for ${code}: ${raw}`,
      );
    tonnage[location] = Number(raw);
    const split = value.lastIndexOf(':');
    // Java ignores scalar Hybrid entries and initializes missing donors to Standard.
    if (split >= 0 || !hybrid) {
      const name = split >= 0 ? value.slice(0, split).trim() : structure.trim();
      typeByLocation[location] = mapStructureType(name, code, clan);
    }
  }
  return {
    type,
    ...(Object.keys(tonnage).length ? { locationTonnage: tonnage } : {}),
    typeByLocation,
  };
}

export function parseFrankenStructureTonnage(
  lines: string[],
  config: string,
  structure: string,
): Record<string, number> | undefined {
  return parseStructure(lines, config, structure).locationTonnage;
}

export function parseArmor(lines: string[]): {
  type: string;
  allocation: Record<string, number | { front: number; rear: number }>;
} {
  const armorType = parseField(lines, 'armor') || 'Standard(Inner Sphere)';
  const allocation: Record<string, number | { front: number; rear: number }> =
    {};

  const armorFields: Record<string, string> = {
    ...Object.fromEntries(
      Object.entries(MTF_LOCATION_CODES).map(([code, location]) => [
        `${code} armor`,
        location,
      ]),
    ),
    'RTL armor': 'LEFT_TORSO_REAR',
    'RTR armor': 'RIGHT_TORSO_REAR',
    'RTC armor': 'CENTER_TORSO_REAR',
  };

  const frontValues: Record<string, number> = {};
  const rearValues: Record<string, number> = {};

  for (const [field, location] of Object.entries(armorFields)) {
    const value = parseField(lines, field);
    if (value) {
      let numValue: number;
      if (value.includes(':')) {
        const parts = value.split(':');
        numValue = parseInt(parts[parts.length - 1], 10);
      } else {
        numValue = parseInt(value, 10);
      }

      if (location.endsWith('_REAR')) {
        const baseLocation = location.replace('_REAR', '');
        rearValues[baseLocation] = numValue;
      } else {
        frontValues[location] = numValue;
      }
    }
  }

  for (const [location, front] of Object.entries(frontValues)) {
    if (['LEFT_TORSO', 'RIGHT_TORSO', 'CENTER_TORSO'].includes(location)) {
      allocation[location] = {
        front,
        rear: rearValues[location] || 0,
      };
    } else {
      allocation[location] = front;
    }
  }

  return { type: armorType, allocation };
}
