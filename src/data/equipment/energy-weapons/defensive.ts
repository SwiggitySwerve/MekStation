import { Equipment } from '../types';

export const LASER_AMS: Equipment = {
  id: 'laser_ams',
  name: 'Laser AMS',
  category: 'Energy Weapons',
  baseType: 'Laser Anti-Missile System',
  description: 'Laser Anti-Missile System for intercepting incoming missiles',
  requiresAmmo: false,
  introductionYear: 3059,
  rulesLevel: 'Standard',
  variants: {
    IS: {
      weight: 1.5,
      crits: 2,
      damage: 2,
      heat: 7,
      minRange: 0,
      rangeShort: 1,
      rangeMedium: 2,
      rangeLong: 3,
      cost: 225000,
      battleValue: 45
    },
    Clan: {
      weight: 1,
      crits: 1,
      damage: 2,
      heat: 5,
      minRange: 0,
      rangeShort: 1,
      rangeMedium: 2,
      rangeLong: 3,
      cost: 225000,
      battleValue: 45
    }
  }
};

export const DEFENSIVE_WEAPONS: Equipment[] = [
  LASER_AMS
]; 