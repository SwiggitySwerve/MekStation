import { Equipment } from '../types';

export const NAVAL_PPC: Equipment = {
  id: 'naval_ppc',
  name: 'Naval PPC',
  category: 'Capital Weapons',
  baseType: 'Naval PPC',
  description: 'Naval Particle Projector Cannon - Capital-class energy weapon',
  requiresAmmo: false,
  introductionYear: 2400,
  rulesLevel: 'Standard',
  techRating: 'D',
  variants: {
    IS: {
      weight: 1200,
      crits: 120,
      damage: 50,
      heat: 50,
      minRange: 10,
      rangeShort: 17,
      rangeMedium: 34,
      rangeLong: 51,
      cost: 12000000,
      battleValue: 1250
    }
  }
}; 