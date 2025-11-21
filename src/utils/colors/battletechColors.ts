/**
 * BattleTech Equipment Color Scheme
 * Comprehensive color system for all BattleTech equipment types
 * Provides consistent theming across the entire application
 */

// Color scheme type definitions
export type ColorScheme = {
  bg: string;
  text: string;
  border: string;
  glow?: string;
};

export type AmmoColorScheme = {
  missile: ColorScheme;
  ballistic: ColorScheme;
  equipment: ColorScheme;
};

// Core BattleTech equipment color definitions
export const BATTLETECH_EQUIPMENT_COLORS = {
  // Unhittables and system components (Gray)
  unhittable: {
    bg: 'bg-gray-700',
    text: 'text-gray-100',
    border: 'border-gray-500',
    glow: 'ring-gray-500/20'
  },

  // Energy weapons (Yellow)
  energy: {
    bg: 'bg-yellow-600',
    text: 'text-yellow-100',
    border: 'border-yellow-500',
    glow: 'ring-yellow-500/20'
  },

  // Ballistic weapons (Purple)
  ballistic: {
    bg: 'bg-purple-600',
    text: 'text-purple-100',
    border: 'border-purple-500',
    glow: 'ring-purple-500/20'
  },

  // Missile weapons (Teal)
  missile: {
    bg: 'bg-teal-600',
    text: 'text-teal-100',
    border: 'border-teal-500',
    glow: 'ring-teal-500/20'
  },

  // Melee weapons (Red)
  melee: {
    bg: 'bg-red-600',
    text: 'text-red-100',
    border: 'border-red-500',
    glow: 'ring-red-500/20'
  },

  // General equipment (Blue)
  equipment: {
    bg: 'bg-blue-600',
    text: 'text-blue-100',
    border: 'border-blue-500',
    glow: 'ring-blue-500/20'
  },

  // Engine (Orange) - keeping existing
  engine: {
    bg: 'bg-orange-600',
    text: 'text-orange-100',
    border: 'border-orange-500',
    glow: 'ring-orange-500/20'
  },

  // Gyro (Gold)
  gyro: {
    bg: 'bg-amber-500',
    text: 'text-amber-100',
    border: 'border-amber-400',
    glow: 'ring-amber-500/20'
  },

  // Empty slots
  empty: {
    bg: 'bg-slate-700',
    text: 'text-slate-400',
    border: 'border-slate-600',
    glow: 'ring-slate-600/20'
  },

  // Unknown/fallback
  unknown: {
    bg: 'bg-gray-600',
    text: 'text-gray-200',
    border: 'border-gray-500',
    glow: 'ring-gray-500/20'
  }
} as const;

// Ammunition colors (lighter variants of weapon colors)
export const BATTLETECH_AMMO_COLORS: AmmoColorScheme = {
  // Missile ammo (Mint - light teal)
  missile: {
    bg: 'bg-emerald-400',
    text: 'text-emerald-100',
    border: 'border-emerald-300',
    glow: 'ring-emerald-400/20'
  },

  // Ballistic ammo (Periwinkle - light purple)
  ballistic: {
    bg: 'bg-purple-400',
    text: 'text-purple-100',
    border: 'border-purple-300',
    glow: 'ring-purple-400/20'
  },

  // Equipment ammo like AMS (Robin's egg blue - light blue)
  equipment: {
    bg: 'bg-sky-400',
    text: 'text-sky-100',
    border: 'border-sky-300',
    glow: 'ring-sky-400/20'
  }
};

// Equipment type classification patterns
export const EQUIPMENT_PATTERNS = {
  // Unhittable components
  unhittable: [
    'Triple Strength Myomer',
    'TSM',
    'Industrial TSM',
    'Ferro-Fibrous',
    'Ferro-Fibrous (Clan)',
    'Light Ferro-Fibrous',
    'Heavy Ferro-Fibrous',
    'Endo Steel',
    'Endo Steel (Clan)',
    'Composite',
    'Stealth'
  ],

  // System components (head-mounted defaults)
  systemComponents: [
    'Cockpit',
    'Life Support',
    'Sensors',
    'Actuator',
    'Leg Actuator',
    'Arm Actuator',
    'Hand Actuator',
    'Lower Arm Actuator',
    'Upper Arm Actuator',
    'Lower Leg Actuator',
    'Upper Leg Actuator',
    'Foot Actuator',
    'Hip'
  ],

  // Energy weapons
  energy: [
    'Laser',
    'PPC',
    'Flamer',
    'Plasma',
    'Energy',
    'ER Large Laser',
    'ER Medium Laser',
    'ER Small Laser',
    'Large Laser',
    'Medium Laser',
    'Small Laser',
    'Large Pulse Laser',
    'Medium Pulse Laser',
    'Small Pulse Laser',
    'Binary Laser Cannon',
    'Micro Pulse Laser'
  ],

  // Ballistic weapons
  ballistic: [
    'Autocannon',
    'AC/',
    'UAC/',
    'LB ',
    'Gauss',
    'Machine Gun',
    'MG',
    'Rifle',
    'Ultra AC',
    'LB-X AC',
    'Light Gauss',
    'Heavy Gauss',
    'Hyper-Assault Gauss'
  ],

  // Missile weapons
  missile: [
    'LRM',
    'SRM',
    'SSRM',
    'MRM',
    'ATM',
    'Rocket Launcher',
    'RL',
    'Torpedo',
    'NLRM',
    'Missile',
    'Streak',
    'Clan LRM',
    'Clan SRM',
    'Enhanced LRM'
  ],

  // Melee weapons
  melee: [
    'Sword',
    'Hatchet',
    'Club',
    'Mace',
    'Claws',
    'Talons',
    'Physical Weapon',
    'Vibroblade',
    'Chain Whip',
    'Lance',
    'Battle Fist',
    'Pile Driver'
  ],

  // General equipment (Blue)
  equipment: [
    'Jump Jet',
    'Improved Jump Jet',
    'UMU',
    'MASC',
    'Supercharger',
    'C3',
    'C3 Master',
    'C3 Slave',
    'C3i',
    'Anti-Missile System',
    'AMS',
    'Laser Anti-Missile',
    'Heat Sink',
    'Double Heat Sink',
    'TAG',
    'NARC',
    'ECM',
    'BAP',
    'Beagle Active Probe',
    'Guardian ECM',
    'Angel ECM',
    'CASE',
    'CASE II',
    'Artemis',
    'Apollo',
    'Targeting Computer',
    'Command Console',
    'Bloodhound',
    'Nova CEWS'
  ],

  // Ammo identification patterns
  ammo: [
    'Ammo',
    'Ammunition',
    'Rounds'
  ]
};

// Weapon type to ammo color mapping
export const WEAPON_TO_AMMO_COLOR = {
  energy: 'equipment', // Energy weapons don't typically have ammo, but if they do, treat as equipment
  ballistic: 'ballistic',
  missile: 'missile',
  melee: 'equipment', // Melee weapons don't have ammo
  equipment: 'equipment'
} as const;

/**
 * Classify equipment into BattleTech categories
 */
export function classifyEquipment(equipmentName: string): keyof typeof BATTLETECH_EQUIPMENT_COLORS {
  if (!equipmentName || equipmentName === '-Empty-' || equipmentName === '') {
    return 'empty';
  }

  const lowerName = equipmentName.toLowerCase();

  // Check for engine
  if (lowerName.includes('engine')) {
    return 'engine';
  }

  // Check for gyro
  if (lowerName.includes('gyro')) {
    return 'gyro';
  }

  // Check for unhittable components
  for (const pattern of EQUIPMENT_PATTERNS.unhittable) {
    if (equipmentName.includes(pattern)) {
      return 'unhittable';
    }
  }

  // Check for system components
  for (const pattern of EQUIPMENT_PATTERNS.systemComponents) {
    if (lowerName.includes(pattern.toLowerCase())) {
      return 'unhittable'; // System components use gray like unhittables
    }
  }

  // Check for energy weapons
  for (const pattern of EQUIPMENT_PATTERNS.energy) {
    if (lowerName.includes(pattern.toLowerCase())) {
      return 'energy';
    }
  }

  // Check for ballistic weapons
  for (const pattern of EQUIPMENT_PATTERNS.ballistic) {
    if (lowerName.includes(pattern.toLowerCase()) || equipmentName.includes(pattern)) {
      return 'ballistic';
    }
  }

  // Check for missile weapons
  for (const pattern of EQUIPMENT_PATTERNS.missile) {
    if (lowerName.includes(pattern.toLowerCase()) || equipmentName.includes(pattern)) {
      return 'missile';
    }
  }

  // Check for melee weapons
  for (const pattern of EQUIPMENT_PATTERNS.melee) {
    if (lowerName.includes(pattern.toLowerCase())) {
      return 'melee';
    }
  }

  // Check for general equipment
  for (const pattern of EQUIPMENT_PATTERNS.equipment) {
    if (lowerName.includes(pattern.toLowerCase()) || equipmentName.includes(pattern)) {
      return 'equipment';
    }
  }

  // Default fallback
  return 'unknown';
}

/**
 * Classify ammo and get appropriate color
 */
export function classifyAmmo(ammoName: string): ColorScheme {
  const lowerName = ammoName.toLowerCase();

  // Check for missile ammo
  for (const pattern of EQUIPMENT_PATTERNS.missile) {
    if (lowerName.includes(pattern.toLowerCase())) {
      return BATTLETECH_AMMO_COLORS.missile;
    }
  }

  // Check for ballistic ammo
  for (const pattern of EQUIPMENT_PATTERNS.ballistic) {
    if (lowerName.includes(pattern.toLowerCase())) {
      return BATTLETECH_AMMO_COLORS.ballistic;
    }
  }

  // Check for equipment ammo (AMS, etc.)
  if (lowerName.includes('ams') || lowerName.includes('anti-missile')) {
    return BATTLETECH_AMMO_COLORS.equipment;
  }

  // Default to equipment ammo
  return BATTLETECH_AMMO_COLORS.equipment;
}

/**
 * Get BattleTech equipment color scheme
 */
export function getBattleTechEquipmentColor(equipmentName: string): ColorScheme {
  // Handle ammo separately
  const lowerName = equipmentName.toLowerCase();
  for (const pattern of EQUIPMENT_PATTERNS.ammo) {
    if (lowerName.includes(pattern.toLowerCase())) {
      return classifyAmmo(equipmentName);
    }
  }

  // Regular equipment classification
  const category = classifyEquipment(equipmentName);
  return BATTLETECH_EQUIPMENT_COLORS[category];
}

/**
 * Get combined CSS classes for BattleTech equipment
 */
export function getBattleTechEquipmentClasses(equipmentName: string): string {
  const colors = getBattleTechEquipmentColor(equipmentName);
  return `${colors.bg} ${colors.text} ${colors.border}`;
}

/**
 * Get color scheme with glow effect
 */
export function getBattleTechEquipmentClassesWithGlow(equipmentName: string): string {
  const colors = getBattleTechEquipmentColor(equipmentName);
  return `${colors.bg} ${colors.text} ${colors.border} ${colors.glow || ''}`;
}
