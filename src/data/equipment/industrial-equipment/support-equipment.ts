import { Equipment } from '../types';

// Extended Fuel Tank
export const EXTENDED_FUEL_TANK: Equipment = {
  id: 'extended_fuel_tank',
  name: 'Extended Fuel Tank',
  category: 'Industrial Equipment',
  baseType: 'Extended Fuel Tank',
  description: 'Additional fuel storage for extended operations',
  requiresAmmo: false,
  introductionYear: 2000,
  rulesLevel: 'Standard',
  variants: {
    IS: {
      weight: 1,
      crits: 1,
      damage: 0,
      heat: 0,
      minRange: 0,
      rangeShort: 0,
      rangeMedium: 0,
      rangeLong: 0,
      rangeExtreme: 0,
      cost: 1000,
      battleValue: 0
    }
  },
  special: ['Fuel Storage', 'Extended Range', 'Explosive if Breached']
};

// Ladder
export const LADDER: Equipment = {
  id: 'ladder',
  name: 'Ladder',
  category: 'Industrial Equipment',
  baseType: 'Ladder',
  description: 'Deployable ladder for accessing elevated positions',
  requiresAmmo: false,
  introductionYear: 2000,
  rulesLevel: 'Standard',
  variants: {
    IS: {
      weight: 0.5,
      crits: 1,
      damage: 0,
      heat: 0,
      minRange: 0,
      rangeShort: 0,
      rangeMedium: 0,
      rangeLong: 0,
      rangeExtreme: 0,
      cost: 2000,
      battleValue: 0
    }
  },
  special: ['Access Equipment', 'Deployable', 'Non-Combat']
};

// Bridge Layer (Light)
export const LIGHT_BRIDGE_LAYER: Equipment = {
  id: 'light_bridge_layer',
  name: 'Light Bridge Layer',
  category: 'Industrial Equipment',
  baseType: 'Light Bridge Layer',
  description: 'Deployable bridge equipment for light vehicles',
  requiresAmmo: false,
  introductionYear: 2000,
  rulesLevel: 'Standard',
  variants: {
    IS: {
      weight: 8,
      crits: 6,
      damage: 0,
      heat: 0,
      minRange: 0,
      rangeShort: 0,
      rangeMedium: 0,
      rangeLong: 0,
      rangeExtreme: 0,
      cost: 50000,
      battleValue: 0
    }
  },
  special: ['Bridge Equipment', 'Deployable', 'Engineering Tool']
};

// Bridge Layer (Medium)
export const MEDIUM_BRIDGE_LAYER: Equipment = {
  id: 'medium_bridge_layer',
  name: 'Medium Bridge Layer',
  category: 'Industrial Equipment',
  baseType: 'Medium Bridge Layer',
  description: 'Deployable bridge equipment for medium vehicles',
  requiresAmmo: false,
  introductionYear: 2000,
  rulesLevel: 'Standard',
  variants: {
    IS: {
      weight: 15,
      crits: 10,
      damage: 0,
      heat: 0,
      minRange: 0,
      rangeShort: 0,
      rangeMedium: 0,
      rangeLong: 0,
      rangeExtreme: 0,
      cost: 100000,
      battleValue: 0
    }
  },
  special: ['Bridge Equipment', 'Deployable', 'Engineering Tool']
};

// Bridge Layer (Heavy)
export const HEAVY_BRIDGE_LAYER: Equipment = {
  id: 'heavy_bridge_layer',
  name: 'Heavy Bridge Layer',
  category: 'Industrial Equipment',
  baseType: 'Heavy Bridge Layer',
  description: 'Deployable bridge equipment for heavy vehicles',
  requiresAmmo: false,
  introductionYear: 2000,
  rulesLevel: 'Standard',
  variants: {
    IS: {
      weight: 25,
      crits: 15,
      damage: 0,
      heat: 0,
      minRange: 0,
      rangeShort: 0,
      rangeMedium: 0,
      rangeLong: 0,
      rangeExtreme: 0,
      cost: 200000,
      battleValue: 0
    }
  },
  special: ['Bridge Equipment', 'Deployable', 'Engineering Tool']
}; 