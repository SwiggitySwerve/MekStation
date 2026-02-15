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
  const normalized = lower.replace(/\./g, '');
  if (normalized.includes('xxl')) return 'XXL';
  if (normalized.includes('xl') && normalized.includes('clan'))
    return 'XL_CLAN';
  if (normalized.includes('xl')) return 'XL';
  if (normalized.includes('light')) return 'LIGHT';
  if (normalized.includes('compact')) return 'COMPACT';
  if (normalized.includes('ice')) return 'ICE';
  if (lower.includes('fuel cell') || lower.includes('fuel-cell'))
    return 'FUEL_CELL';
  if (normalized.includes('fission')) return 'FISSION';
  return 'FUSION';
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
  if (lower.includes('stealth')) return 'STEALTH';
  if (lower.includes('reactive')) return 'REACTIVE';
  if (lower.includes('reflective')) return 'REFLECTIVE';
  if (lower.includes('hardened')) return 'HARDENED';
  if (lower.includes('heavy') && lower.includes('ferro')) return 'HEAVY_FERRO';
  if (lower.includes('light') && lower.includes('ferro')) return 'LIGHT_FERRO';
  if (lower.includes('ferro') && lower.includes('clan'))
    return 'FERRO_FIBROUS_CLAN';
  if (lower.includes('ferro')) return 'FERRO_FIBROUS';
  return 'STANDARD';
}

export function normalizeEquipmentId(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[()]/g, '')
    .replace(/\//g, '-');
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
