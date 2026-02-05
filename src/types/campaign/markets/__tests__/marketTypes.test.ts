import type { IUnitMarketOffer, IPersonnelMarketOffer } from '../marketTypes';

import { CampaignPersonnelRole } from '../../enums/CampaignPersonnelRole';
import {
  UnitMarketRarity,
  UnitMarketType,
  PersonnelMarketStyle,
  MarketExperienceLevel,
  RARITY_VALUES,
  MARKET_TYPE_QUALITY,
  isUnitMarketRarity,
  isUnitMarketType,
  isPersonnelMarketStyle,
  isMarketExperienceLevel,
} from '../marketTypes';

describe('UnitMarketRarity', () => {
  it('should have 7 values', () => {
    const values = Object.values(UnitMarketRarity);
    expect(values).toHaveLength(7);
  });

  it('should have correct string values', () => {
    expect(UnitMarketRarity.MYTHIC).toBe('mythic');
    expect(UnitMarketRarity.VERY_RARE).toBe('very_rare');
    expect(UnitMarketRarity.RARE).toBe('rare');
    expect(UnitMarketRarity.UNCOMMON).toBe('uncommon');
    expect(UnitMarketRarity.COMMON).toBe('common');
    expect(UnitMarketRarity.VERY_COMMON).toBe('very_common');
    expect(UnitMarketRarity.UBIQUITOUS).toBe('ubiquitous');
  });

  it('should have correct RARITY_VALUES mapping', () => {
    expect(RARITY_VALUES[UnitMarketRarity.MYTHIC]).toBe(-1);
    expect(RARITY_VALUES[UnitMarketRarity.VERY_RARE]).toBe(0);
    expect(RARITY_VALUES[UnitMarketRarity.RARE]).toBe(1);
    expect(RARITY_VALUES[UnitMarketRarity.UNCOMMON]).toBe(2);
    expect(RARITY_VALUES[UnitMarketRarity.COMMON]).toBe(3);
    expect(RARITY_VALUES[UnitMarketRarity.VERY_COMMON]).toBe(4);
    expect(RARITY_VALUES[UnitMarketRarity.UBIQUITOUS]).toBe(10);
  });

  it('should have increasing rarity values from MYTHIC to UBIQUITOUS', () => {
    const ordered = [
      UnitMarketRarity.MYTHIC,
      UnitMarketRarity.VERY_RARE,
      UnitMarketRarity.RARE,
      UnitMarketRarity.UNCOMMON,
      UnitMarketRarity.COMMON,
      UnitMarketRarity.VERY_COMMON,
      UnitMarketRarity.UBIQUITOUS,
    ];
    for (let i = 0; i < ordered.length - 1; i++) {
      expect(RARITY_VALUES[ordered[i]]).toBeLessThan(
        RARITY_VALUES[ordered[i + 1]],
      );
    }
  });
});

describe('UnitMarketType', () => {
  it('should have 6 values', () => {
    const values = Object.values(UnitMarketType);
    expect(values).toHaveLength(6);
  });

  it('should have correct string values', () => {
    expect(UnitMarketType.OPEN).toBe('open');
    expect(UnitMarketType.EMPLOYER).toBe('employer');
    expect(UnitMarketType.MERCENARY).toBe('mercenary');
    expect(UnitMarketType.FACTORY).toBe('factory');
    expect(UnitMarketType.BLACK_MARKET).toBe('black_market');
    expect(UnitMarketType.CIVILIAN).toBe('civilian');
  });

  it('should have correct MARKET_TYPE_QUALITY mapping', () => {
    expect(MARKET_TYPE_QUALITY[UnitMarketType.OPEN]).toBe('C');
    expect(MARKET_TYPE_QUALITY[UnitMarketType.EMPLOYER]).toBe('B');
    expect(MARKET_TYPE_QUALITY[UnitMarketType.MERCENARY]).toBe('C');
    expect(MARKET_TYPE_QUALITY[UnitMarketType.FACTORY]).toBe('F');
    expect(MARKET_TYPE_QUALITY[UnitMarketType.BLACK_MARKET]).toBe('A');
    expect(MARKET_TYPE_QUALITY[UnitMarketType.CIVILIAN]).toBe('F');
  });
});

describe('PersonnelMarketStyle', () => {
  it('should have 4 values', () => {
    const values = Object.values(PersonnelMarketStyle);
    expect(values).toHaveLength(4);
  });

  it('should have correct string values', () => {
    expect(PersonnelMarketStyle.DISABLED).toBe('disabled');
    expect(PersonnelMarketStyle.MEKHQ).toBe('mekhq');
    expect(PersonnelMarketStyle.CAM_OPS_REVISED).toBe('cam_ops_revised');
    expect(PersonnelMarketStyle.CAM_OPS_STRICT).toBe('cam_ops_strict');
  });
});

describe('MarketExperienceLevel', () => {
  it('should have 4 values', () => {
    const values = Object.values(MarketExperienceLevel);
    expect(values).toHaveLength(4);
  });

  it('should have correct string values', () => {
    expect(MarketExperienceLevel.GREEN).toBe('green');
    expect(MarketExperienceLevel.REGULAR).toBe('regular');
    expect(MarketExperienceLevel.VETERAN).toBe('veteran');
    expect(MarketExperienceLevel.ELITE).toBe('elite');
  });
});

describe('IUnitMarketOffer', () => {
  it('should accept a valid offer object', () => {
    const offer: IUnitMarketOffer = {
      id: 'offer-001',
      unitId: 'unit-atlas-as7d',
      unitName: 'Atlas AS7-D',
      rarity: UnitMarketRarity.UNCOMMON,
      marketType: UnitMarketType.OPEN,
      quality: 'C',
      pricePercent: 105,
      baseCost: 9626000,
      expirationDate: '3025-01-31',
    };

    expect(offer.id).toBe('offer-001');
    expect(offer.rarity).toBe(UnitMarketRarity.UNCOMMON);
    expect(offer.marketType).toBe(UnitMarketType.OPEN);
    expect(offer.quality).toBe('C');
    expect(offer.pricePercent).toBe(105);
    expect(offer.baseCost).toBe(9626000);
  });
});

describe('IPersonnelMarketOffer', () => {
  it('should accept a valid offer object', () => {
    const offer: IPersonnelMarketOffer = {
      id: 'recruit-001',
      name: 'John Doe',
      role: CampaignPersonnelRole.PILOT,
      experienceLevel: MarketExperienceLevel.REGULAR,
      skills: { gunnery: 4, piloting: 5 },
      hireCost: 50000,
      expirationDate: '3025-01-15',
    };

    expect(offer.id).toBe('recruit-001');
    expect(offer.role).toBe(CampaignPersonnelRole.PILOT);
    expect(offer.experienceLevel).toBe(MarketExperienceLevel.REGULAR);
    expect(offer.hireCost).toBe(50000);
  });
});

describe('type guards', () => {
  describe('isUnitMarketRarity', () => {
    it('should return true for valid rarity values', () => {
      expect(isUnitMarketRarity('mythic')).toBe(true);
      expect(isUnitMarketRarity('common')).toBe(true);
      expect(isUnitMarketRarity('ubiquitous')).toBe(true);
    });

    it('should return false for invalid values', () => {
      expect(isUnitMarketRarity('legendary')).toBe(false);
      expect(isUnitMarketRarity(42)).toBe(false);
      expect(isUnitMarketRarity(null)).toBe(false);
    });
  });

  describe('isUnitMarketType', () => {
    it('should return true for valid market types', () => {
      expect(isUnitMarketType('open')).toBe(true);
      expect(isUnitMarketType('black_market')).toBe(true);
    });

    it('should return false for invalid values', () => {
      expect(isUnitMarketType('auction')).toBe(false);
      expect(isUnitMarketType(undefined)).toBe(false);
    });
  });

  describe('isPersonnelMarketStyle', () => {
    it('should return true for valid styles', () => {
      expect(isPersonnelMarketStyle('disabled')).toBe(true);
      expect(isPersonnelMarketStyle('mekhq')).toBe(true);
    });

    it('should return false for invalid values', () => {
      expect(isPersonnelMarketStyle('custom')).toBe(false);
    });
  });

  describe('isMarketExperienceLevel', () => {
    it('should return true for valid levels', () => {
      expect(isMarketExperienceLevel('green')).toBe(true);
      expect(isMarketExperienceLevel('elite')).toBe(true);
    });

    it('should return false for invalid values', () => {
      expect(isMarketExperienceLevel('legendary')).toBe(false);
    });
  });
});
