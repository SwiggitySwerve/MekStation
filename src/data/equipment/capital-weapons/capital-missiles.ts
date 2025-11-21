import { Equipment } from '../types';

export const KILLER_WHALE: Equipment = {
  id: 'killer_whale',
  name: 'Killer Whale',
  category: 'Capital Weapons',
  baseType: 'Killer Whale',
  description: 'Killer Whale - Anti-ship capital missile',
  requiresAmmo: true,
  introductionYear: 2400,
  rulesLevel: 'Standard',
  techRating: 'D',
  variants: {
    IS: {
      weight: 150,
      crits: 15,
      damage: 40,
      heat: 0,
      minRange: 12,
      rangeShort: 24,
      rangeMedium: 48,
      rangeLong: 72,
      cost: 8000000,
      battleValue: 800
    }
  }
};

export const KILLER_WHALE_T: Equipment = {
  id: 'killer_whale_t',
  name: 'Killer Whale-T',
  category: 'Capital Weapons',
  baseType: 'Killer Whale-T',
  description: 'Killer Whale-T - Nuclear anti-ship capital missile',
  requiresAmmo: true,
  introductionYear: 2400,
  rulesLevel: 'Standard',
  techRating: 'D',
  variants: {
    IS: {
      weight: 150,
      crits: 15,
      damage: 50,
      heat: 0,
      minRange: 12,
      rangeShort: 24,
      rangeMedium: 48,
      rangeLong: 72,
      cost: 10000000,
      battleValue: 1000
    }
  }
};

export const WHITE_SHARK: Equipment = {
  id: 'white_shark',
  name: 'White Shark',
  category: 'Capital Weapons',
  baseType: 'White Shark',
  description: 'White Shark - Medium capital missile',
  requiresAmmo: true,
  introductionYear: 2400,
  rulesLevel: 'Standard',
  techRating: 'D',
  variants: {
    IS: {
      weight: 100,
      crits: 10,
      damage: 30,
      heat: 0,
      minRange: 10,
      rangeShort: 20,
      rangeMedium: 40,
      rangeLong: 60,
      cost: 6000000,
      battleValue: 600
    }
  }
};

export const WHITE_SHARK_T: Equipment = {
  id: 'white_shark_t',
  name: 'White Shark-T',
  category: 'Capital Weapons',
  baseType: 'White Shark-T',
  description: 'White Shark-T - Nuclear medium capital missile',
  requiresAmmo: true,
  introductionYear: 2400,
  rulesLevel: 'Standard',
  techRating: 'D',
  variants: {
    IS: {
      weight: 100,
      crits: 10,
      damage: 40,
      heat: 0,
      minRange: 10,
      rangeShort: 20,
      rangeMedium: 40,
      rangeLong: 60,
      cost: 8000000,
      battleValue: 800
    }
  }
}; 