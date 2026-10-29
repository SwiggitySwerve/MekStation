import { normalizeEquipmentId as normalizeCatalogEquipmentId } from '@/utils/construction/equipmentBV/normalization';

export function mapEraFromYear(year: number): string {
  if (year < 2005) return 'EARLY_SPACEFLIGHT';
  if (year < 2570) return 'AGE_OF_WAR';
  if (year < 2781) return 'STAR_LEAGUE';
  if (year < 2901) return 'EARLY_SUCCESSION_WARS';
  if (year < 3020) return 'LATE_SUCCESSION_WARS';
  if (year < 3050) return 'RENAISSANCE';
  if (year < 3061) return 'CLAN_INVASION';
  if (year < 3068) return 'CIVIL_WAR';
  if (year < 3081) return 'JIHAD';
  if (year < 3151) return 'DARK_AGE';
  return 'IL_CLAN';
}

export function mapTechBase(techBase: string): string {
  const lower = techBase.toLowerCase();
  if (lower.includes('mixed')) return 'MIXED';
  if (lower.includes('clan')) return 'CLAN';
  return 'INNER_SPHERE';
}

export function mapRulesLevel(level: string): string {
  const levelMap: Record<string, string> = {
    '1': 'INTRODUCTORY',
    '2': 'STANDARD',
    '3': 'ADVANCED',
    '4': 'EXPERIMENTAL',
  };
  return levelMap[level] || 'STANDARD';
}

export function mapEngineType(engineType: string): string {
  const lower = engineType.toLowerCase();
  const normalized = lower
    .replace(/\./g, '')
    .replace(/^\d+\s+/, '')
    .replace(/\((?:clan|is|inner sphere)\)/g, '')
    .replace(/\b(?:clan|is|inner sphere|large|fusion|engine)\b/g, '')
    .trim()
    .replace(/\s+/g, ' ');
  if (normalized === 'xl') return lower.includes('clan') ? 'CLAN_XL' : 'XL';
  const types: Record<string, string> = {
    xxl: 'XXL',
    light: 'LIGHT',
    compact: 'COMPACT',
    ice: 'ICE',
    'fuel cell': 'FUEL_CELL',
    'fuel-cell': 'FUEL_CELL',
    fission: 'FISSION',
    standard: 'FUSION',
    battery: 'BATTERY',
  };
  if (Object.prototype.hasOwnProperty.call(types, normalized))
    return types[normalized];
  if (!normalized && /\bfusion\b/.test(lower)) return 'FUSION';
  return `UNSUPPORTED_ENGINE:${engineType}`;
}

export function mapStructureType(structure: string): string {
  const lower = structure.toLowerCase();
  if (lower.includes('endo') && lower.includes('composite'))
    return 'ENDO_COMPOSITE';
  if (lower.includes('endo') && lower.includes('clan'))
    return 'ENDO_STEEL_CLAN';
  if (lower.includes('endo')) return 'ENDO_STEEL';
  if (lower.includes('reinforced')) return 'REINFORCED';
  if (lower.includes('composite')) return 'COMPOSITE';
  if (lower.includes('industrial')) return 'INDUSTRIAL';
  return 'STANDARD';
}

export function mapArmorType(armorType: string): string {
  const lower = armorType.toLowerCase();
  const name = lower
    .replace(/\((?:clan|inner sphere)\)\s*$/, '')
    .replace(/^(?:clan|is)\s+/, '')
    .trim();
  // MtfFile resolves the complete armor name, not a substring. Prototype,
  // patchwork and unrepresented armor must not masquerade as ordinary ferro.
  const types: Record<string, string> = {
    '': 'STANDARD',
    standard: 'STANDARD',
    'ferro-fibrous': 'FERRO_FIBROUS',
    'light ferro-fibrous': 'LIGHT_FERRO_FIBROUS',
    'heavy ferro-fibrous': 'HEAVY_FERRO_FIBROUS',
    stealth: 'STEALTH',
    reactive: 'REACTIVE',
    reflective: 'REFLECTIVE',
    hardened: 'HARDENED',
    primitive: 'PRIMITIVE',
    industrial: 'INDUSTRIAL',
    'heavy industrial': 'HEAVY_INDUSTRIAL',
    commercial: 'COMMERCIAL',
    'impact-resistant': 'IMPACT_RESISTANT',
    'ferro-lamellor': 'FERRO_LAMELLOR',
  };
  const type = Object.prototype.hasOwnProperty.call(types, name)
    ? types[name]
    : undefined;
  if (!type) return `UNSUPPORTED_ARMOR:${armorType}`;
  if (
    lower.includes('clan') &&
    ['FERRO_FIBROUS', 'REACTIVE', 'REFLECTIVE'].includes(type)
  ) {
    return `${type}_CLAN`;
  }
  return type;
}

export function mapConfiguration(configuration: string): string {
  // Only the recognized Omni suffix is removable. FrankenMek carries location
  // structure/source-mass rules absent from the current serialized model.
  return configuration.replace(
    /^(Biped|Quad|Tripod|LAM|QuadVee)\s+omni(?:mek|mech)$/i,
    '$1',
  );
}

function slugEquipmentId(name: string): string {
  return name
    .toLowerCase()
    .replace(/[()]/g, '')
    .replace(/\//g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export function normalizeEquipmentId(name: string): string {
  const normalized = normalizeCatalogEquipmentId(name);
  return /[\s()]/.test(normalized) ? slugEquipmentId(normalized) : normalized;
}

export function normalizeLocation(location: string): string {
  const locationMap: Record<string, string> = {
    'Left Arm': 'LEFT_ARM',
    'Right Arm': 'RIGHT_ARM',
    'Left Torso': 'LEFT_TORSO',
    'Right Torso': 'RIGHT_TORSO',
    'Center Torso': 'CENTER_TORSO',
    Head: 'HEAD',
    'Left Leg': 'LEFT_LEG',
    'Right Leg': 'RIGHT_LEG',
    'Front Left Leg': 'FRONT_LEFT_LEG',
    'Front Right Leg': 'FRONT_RIGHT_LEG',
    'Rear Left Leg': 'REAR_LEFT_LEG',
    'Rear Right Leg': 'REAR_RIGHT_LEG',
  };

  return locationMap[location] || location.toUpperCase().replace(/\s+/g, '_');
}

export function generateUnitId(chassis: string, model: string): string {
  return `${chassis}-${model}`
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[()]/g, '')
    .replace(/\//g, '-');
}
