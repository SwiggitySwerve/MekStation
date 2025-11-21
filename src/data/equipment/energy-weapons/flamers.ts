import { Equipment } from '../types';

export const FLAMER: Equipment = {
  id: 'flamer',
  name: 'Flamer',
  category: 'Energy Weapons',
  baseType: 'Flamer',
  description: 'Standard Flamer - Heat-based anti-infantry weapon',
  requiresAmmo: false,
  introductionYear: 2025,
  rulesLevel: 'Standard',
  variants: {
    Clan: {
      weight: 0.5,
      crits: 1,
      damage: 2,
      heat: 3,
      minRange: 0,
      rangeShort: 1,
      rangeMedium: 2,
      rangeLong: 3,
      cost: 7500,
      battleValue: 6
    },
    IS: {
      weight: 1,
      crits: 1,
      damage: 2,
      heat: 3,
      minRange: 0,
      rangeShort: 1,
      rangeMedium: 2,
      rangeLong: 3,
      cost: 7500,
      battleValue: 6
    }
  }
};

export const HEAVY_FLAMER: Equipment = {
  id: 'heavy_flamer',
  name: 'Heavy Flamer',
  category: 'Energy Weapons',
  baseType: 'Heavy Flamer',
  description: 'Heavy Flamer - Enhanced heat-based weapon',
  requiresAmmo: false,
  introductionYear: 3068,
  rulesLevel: 'Standard',
  variants: {
    IS: {
      weight: 1.5,
      crits: 1,
      damage: 4,
      heat: 5,
      minRange: 0,
      rangeShort: 1,
      rangeMedium: 2,
      rangeLong: 3,
      cost: 11250,
      battleValue: 11
    }
  }
};

export const FLAMER_WEAPONS: Equipment[] = [
  FLAMER,
  HEAVY_FLAMER
]; 