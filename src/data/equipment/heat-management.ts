import { Equipment } from './types';

// Single Heat Sink
export const HEAT_SINK: Equipment = {
  id: 'heat_sink',
  name: 'Heat Sink',
  category: 'Heat Management',
  baseType: 'Heat Sink',
  description: 'Standard heat dissipation system',
  requiresAmmo: false,
  introductionYear: 2300,
  rulesLevel: 'Introductory',
  variants: {
    IS: {
      weight: 1,
      crits: 1,
      damage: 0,
      heat: -1,
      minRange: 0,
      rangeShort: 0,
      rangeMedium: 0,
      rangeLong: 0,
      rangeExtreme: 0,
      cost: 2000,
      battleValue: 0
    },
    Clan: {
      weight: 1,
      crits: 1,
      damage: 0,
      heat: -1,
      minRange: 0,
      rangeShort: 0,
      rangeMedium: 0,
      rangeLong: 0,
      rangeExtreme: 0,
      cost: 2000,
      battleValue: 0
    }
  },
  special: ['Heat Sink', 'Standard Efficiency']
};

// Double Heat Sink
export const DOUBLE_HEAT_SINK: Equipment = {
  id: 'double_heat_sink',
  name: 'Double Heat Sink',
  category: 'Heat Management',
  baseType: 'Double Heat Sink',
  description: 'Advanced heat dissipation system with double efficiency',
  requiresAmmo: false,
  introductionYear: 2557,
  rulesLevel: 'Standard',
  variants: {
    IS: {
      weight: 1,
      crits: 3,
      damage: 0,
      heat: -2,
      minRange: 0,
      rangeShort: 0,
      rangeMedium: 0,
      rangeLong: 0,
      rangeExtreme: 0,
      cost: 6000,
      battleValue: 0
    },
    Clan: {
      weight: 1,
      crits: 2,
      damage: 0,
      heat: -2,
      minRange: 0,
      rangeShort: 0,
      rangeMedium: 0,
      rangeLong: 0,
      rangeExtreme: 0,
      cost: 6000,
      battleValue: 0
    }
  },
  special: ['Heat Sink', 'Double Efficiency', 'Engine Mountable']
};

// Compact Heat Sink
export const COMPACT_HEAT_SINK: Equipment = {
  id: 'compact_heat_sink',
  name: 'Compact Heat Sink',
  category: 'Heat Management',
  baseType: 'Compact Heat Sink',
  description: 'Space-efficient heat sink with reduced critical slot usage',
  requiresAmmo: false,
  introductionYear: 3058,
  rulesLevel: 'Standard',
  variants: {
    IS: {
      weight: 1,
      crits: 2,
      damage: 0,
      heat: -2,
      minRange: 0,
      rangeShort: 0,
      rangeMedium: 0,
      rangeLong: 0,
      rangeExtreme: 0,
      cost: 8000,
      battleValue: 0
    }
  },
  special: ['Heat Sink', 'Compact Design', 'Reduced Slots']
};

// Laser Heat Sink
export const LASER_HEAT_SINK: Equipment = {
  id: 'laser_heat_sink',
  name: 'Laser Heat Sink',
  category: 'Heat Management',
  baseType: 'Laser Heat Sink',
  description: 'Specialized heat sink for energy weapons',
  requiresAmmo: false,
  introductionYear: 3058,
  rulesLevel: 'Advanced',
  variants: {
    IS: {
      weight: 1,
      crits: 2,
      damage: 0,
      heat: -2,
      minRange: 0,
      rangeShort: 0,
      rangeMedium: 0,
      rangeLong: 0,
      rangeExtreme: 0,
      cost: 12000,
      battleValue: 0
    }
  },
  special: ['Heat Sink', 'Laser Optimization', 'Enhanced Cooling']
};


export const HEAT_MANAGEMENT: Equipment[] = [
  HEAT_SINK,
  DOUBLE_HEAT_SINK,
  COMPACT_HEAT_SINK,
  LASER_HEAT_SINK
];
