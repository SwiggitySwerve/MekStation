import { ISerializedFluff } from '@/types/unit/UnitSerialization';

const BIPED_LOCATION_ORDER = [
  'LEFT_ARM',
  'RIGHT_ARM',
  'LEFT_TORSO',
  'RIGHT_TORSO',
  'CENTER_TORSO',
  'HEAD',
  'LEFT_LEG',
  'RIGHT_LEG',
];

const QUAD_LOCATION_ORDER = [
  'FRONT_LEFT_LEG',
  'FRONT_RIGHT_LEG',
  'LEFT_TORSO',
  'RIGHT_TORSO',
  'CENTER_TORSO',
  'HEAD',
  'REAR_LEFT_LEG',
  'REAR_RIGHT_LEG',
];

const TRIPOD_LOCATION_ORDER = [
  'LEFT_ARM',
  'RIGHT_ARM',
  'LEFT_TORSO',
  'RIGHT_TORSO',
  'CENTER_TORSO',
  'HEAD',
  'LEFT_LEG',
  'RIGHT_LEG',
  'CENTER_LEG',
];

const LOCATION_NAMES: Record<string, string> = {
  LEFT_ARM: 'Left Arm',
  RIGHT_ARM: 'Right Arm',
  LEFT_TORSO: 'Left Torso',
  RIGHT_TORSO: 'Right Torso',
  CENTER_TORSO: 'Center Torso',
  HEAD: 'Head',
  LEFT_LEG: 'Left Leg',
  RIGHT_LEG: 'Right Leg',
  FRONT_LEFT_LEG: 'Front Left Leg',
  FRONT_RIGHT_LEG: 'Front Right Leg',
  REAR_LEFT_LEG: 'Rear Left Leg',
  REAR_RIGHT_LEG: 'Rear Right Leg',
  CENTER_LEG: 'Center Leg',
};

export const MTF_SLOTS_PER_LOCATION = 12;

export function writeLicenseHeader(lines: string[]): void {
  lines.push(
    '# MegaMek Data (C) 2025 by The MegaMek Team is licensed under CC BY-NC-SA 4.0.',
  );
  lines.push(
    '# To view a copy of this license, visit https://creativecommons.org/licenses/by-nc-sa/4.0/',
  );
  lines.push('#');
  lines.push(
    '# NOTICE: The MegaMek organization is a non-profit group of volunteers',
  );
  lines.push('# creating free software for the BattleTech community.');
  lines.push('#');
  lines.push(
    '# MechWarrior, BattleMech, `Mech and AeroTech are registered trademarks',
  );
  lines.push('# of The Topps Company, Inc. All Rights Reserved.');
  lines.push('#');
  lines.push(
    '# Catalyst Game Labs and the Catalyst Game Labs logo are trademarks of',
  );
  lines.push('# InMediaRes Productions, LLC.');
  lines.push('#');
  lines.push(
    '# MechWarrior Copyright Microsoft Corporation. MegaMek Data was created under',
  );
  lines.push('# Microsoft\'s "Game Content Usage Rules"');
  lines.push(
    '# <https://www.xbox.com/en-US/developers/rules> and it is not endorsed by or',
  );
  lines.push('# affiliated with Microsoft.');
  lines.push('');
}

export function formatConfig(config: string, isOmni?: boolean): string {
  const configMap: Record<string, string> = {
    BIPED: 'Biped',
    QUAD: 'Quad',
    TRIPOD: 'Tripod',
    LAM: 'LAM',
    QUADVEE: 'QuadVee',
  };
  const baseConfig = configMap[config] || config;
  if (isOmni) {
    return `${baseConfig} Omnimech`;
  }
  return baseConfig;
}

export function formatTechBase(techBase: string): string {
  if (techBase === 'CLAN') return 'Clan';
  if (techBase === 'MIXED') return 'Mixed';
  return 'Inner Sphere';
}

export function formatRulesLevel(rulesLevel: string): string {
  const levelMap: Record<string, string> = {
    INTRODUCTORY: '1',
    STANDARD: '2',
    ADVANCED: '3',
    EXPERIMENTAL: '4',
  };
  return levelMap[rulesLevel] || '2';
}

export function formatEngineType(engineType: string): string {
  const typeMap: Record<string, string> = {
    FUSION: 'Fusion Engine',
    STANDARD: 'Fusion Engine',
    XL: 'XL Fusion Engine',
    XL_IS: 'XL Fusion Engine',
    XL_CLAN: 'XL Fusion Engine (Clan)',
    LIGHT: 'Light Fusion Engine',
    COMPACT: 'Compact Fusion Engine',
    XXL: 'XXL Fusion Engine',
    ICE: 'ICE Engine',
    FUEL_CELL: 'Fuel Cell Engine',
    FISSION: 'Fission Engine',
  };
  return typeMap[engineType] || 'Fusion Engine';
}

export function formatStructureType(structureType: string): string {
  const typeMap: Record<string, string> = {
    STANDARD: 'IS Standard',
    ENDO_STEEL: 'IS Endo Steel',
    ENDO_STEEL_IS: 'IS Endo Steel',
    ENDO_STEEL_CLAN: 'Clan Endo Steel',
    ENDO_COMPOSITE: 'Endo-Composite',
    REINFORCED: 'Reinforced',
    COMPOSITE: 'Composite',
    INDUSTRIAL: 'Industrial',
  };
  return typeMap[structureType] || 'IS Standard';
}

export function formatHeatSinkType(hsType: string): string {
  if (hsType === 'DOUBLE' || hsType === 'DOUBLE_IS') return 'Double';
  if (hsType === 'DOUBLE_CLAN') return 'Double';
  return 'Single';
}

export function formatArmorType(armorType: string): string {
  const typeMap: Record<string, string> = {
    STANDARD: 'Standard(Inner Sphere)',
    FERRO_FIBROUS: 'Ferro-Fibrous',
    FERRO_FIBROUS_IS: 'Ferro-Fibrous',
    FERRO_FIBROUS_CLAN: 'Ferro-Fibrous(Clan)',
    LIGHT_FERRO: 'Light Ferro-Fibrous',
    HEAVY_FERRO: 'Heavy Ferro-Fibrous',
    STEALTH: 'Stealth',
    REACTIVE: 'Reactive',
    REFLECTIVE: 'Reflective',
    HARDENED: 'Hardened',
  };
  return typeMap[armorType] || 'Standard(Inner Sphere)';
}

export function getLocationOrder(configuration: string): string[] {
  const config = configuration.toUpperCase();
  if (config.startsWith('QUAD') || config === 'QUADVEE') {
    return QUAD_LOCATION_ORDER;
  }
  if (config.startsWith('TRIPOD')) {
    return TRIPOD_LOCATION_ORDER;
  }
  return BIPED_LOCATION_ORDER;
}

export function getLocationDisplayName(location: string): string {
  return LOCATION_NAMES[location] || location;
}

export function writeArmorValues(
  lines: string[],
  allocation: Record<string, number | { front: number; rear: number }>,
  configuration: string,
): void {
  const config = configuration.toUpperCase();
  const isQuad = config.startsWith('QUAD') || config === 'QUADVEE';

  const fieldMap: Record<string, string> = isQuad
    ? {
        FRONT_LEFT_LEG: 'FLL armor',
        FRONT_RIGHT_LEG: 'FRL armor',
        LEFT_TORSO: 'LT armor',
        RIGHT_TORSO: 'RT armor',
        CENTER_TORSO: 'CT armor',
        HEAD: 'HD armor',
        REAR_LEFT_LEG: 'RLL armor',
        REAR_RIGHT_LEG: 'RRL armor',
      }
    : {
        LEFT_ARM: 'LA armor',
        RIGHT_ARM: 'RA armor',
        LEFT_TORSO: 'LT armor',
        RIGHT_TORSO: 'RT armor',
        CENTER_TORSO: 'CT armor',
        HEAD: 'HD armor',
        LEFT_LEG: 'LL armor',
        RIGHT_LEG: 'RL armor',
      };

  if (config.startsWith('TRIPOD')) {
    fieldMap['CENTER_LEG'] = 'CL armor';
  }

  for (const [location, field] of Object.entries(fieldMap)) {
    const value = allocation[location];
    if (value !== undefined) {
      if (typeof value === 'number') {
        lines.push(`${field}:${value}`);
      } else {
        lines.push(`${field}:${value.front}`);
      }
    }
  }

  const rearFieldMap: Record<string, string> = {
    LEFT_TORSO: 'RTL armor',
    RIGHT_TORSO: 'RTR armor',
    CENTER_TORSO: 'RTC armor',
  };

  for (const [location, field] of Object.entries(rearFieldMap)) {
    const value = allocation[location];
    if (value !== undefined && typeof value === 'object') {
      lines.push(`${field}:${value.rear}`);
    }
  }
}

export function formatEquipmentName(id: string): string {
  const nameMap: Record<string, string> = {
    'medium-laser': 'Medium Laser',
    'small-laser': 'Small Laser',
    'large-laser': 'Large Laser',
    'er-medium-laser': 'ER Medium Laser',
    'er-small-laser': 'ER Small Laser',
    'er-large-laser': 'ER Large Laser',
    ppc: 'PPC',
    'er-ppc': 'ER PPC',
    'lrm-5': 'LRM 5',
    'lrm-10': 'LRM 10',
    'lrm-15': 'LRM 15',
    'lrm-20': 'LRM 20',
    'srm-2': 'SRM 2',
    'srm-4': 'SRM 4',
    'srm-6': 'SRM 6',
    'ac-2': 'AC/2',
    'ac-5': 'AC/5',
    'ac-10': 'AC/10',
    'ac-20': 'AC/20',
    'machine-gun': 'Machine Gun',
    flamer: 'Flamer',
    'gauss-rifle': 'Gauss Rifle',
    'landing-gear': 'Landing Gear',
    avionics: 'Avionics',
  };

  if (nameMap[id]) {
    return nameMap[id];
  }

  return id
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function writeFluff(lines: string[], fluff: ISerializedFluff): void {
  if (fluff.overview) {
    lines.push(`overview:${fluff.overview}`);
    lines.push('');
  }
  if (fluff.capabilities) {
    lines.push(`capabilities:${fluff.capabilities}`);
    lines.push('');
  }
  if (fluff.deployment) {
    lines.push(`deployment:${fluff.deployment}`);
    lines.push('');
  }
  if (fluff.history) {
    lines.push(`history:${fluff.history}`);
    lines.push('');
  }
  if (fluff.manufacturer) {
    lines.push(`manufacturer:${fluff.manufacturer}`);
  }
  if (fluff.primaryFactory) {
    lines.push(`primaryfactory:${fluff.primaryFactory}`);
  }
  if (fluff.systemManufacturer) {
    for (const [system, manufacturer] of Object.entries(
      fluff.systemManufacturer,
    )) {
      lines.push(`systemmanufacturer:${system}:${manufacturer}`);
    }
  }
}
