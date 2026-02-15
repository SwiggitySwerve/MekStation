import { parseField } from './MTFParserHelpers';

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

export function parseArmor(lines: string[]): {
  type: string;
  allocation: Record<string, number | { front: number; rear: number }>;
} {
  const armorType = parseField(lines, 'armor') || 'Standard(Inner Sphere)';
  const allocation: Record<string, number | { front: number; rear: number }> =
    {};

  const armorFields: Record<string, string> = {
    'LA armor': 'LEFT_ARM',
    'RA armor': 'RIGHT_ARM',
    'LT armor': 'LEFT_TORSO',
    'RT armor': 'RIGHT_TORSO',
    'CT armor': 'CENTER_TORSO',
    'HD armor': 'HEAD',
    'LL armor': 'LEFT_LEG',
    'RL armor': 'RIGHT_LEG',
    'RTL armor': 'LEFT_TORSO_REAR',
    'RTR armor': 'RIGHT_TORSO_REAR',
    'RTC armor': 'CENTER_TORSO_REAR',
    'FLL armor': 'FRONT_LEFT_LEG',
    'FRL armor': 'FRONT_RIGHT_LEG',
    'RLL armor': 'REAR_LEFT_LEG',
    'RRL armor': 'REAR_RIGHT_LEG',
    'CL armor': 'CENTER_LEG',
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
