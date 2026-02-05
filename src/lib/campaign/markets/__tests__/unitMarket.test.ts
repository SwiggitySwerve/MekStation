/**
 * unitMarket.test.ts - Comprehensive tests for Unit Market system
 *
 * Tests cover:
 * - calculateItemCount: rarity-based item count formula
 * - calculatePricePercent: 2d6 price modifier mapping
 * - getMarketTypeQuality: quality grades per market type
 * - getEndOfMonth: end-of-month date calculation
 * - generateUnitOffers: full offer generation pipeline
 * - purchaseUnit: offer validation and purchase
 */

import {
  ICampaign,
  createDefaultCampaignOptions,
} from '@/types/campaign/Campaign';
import { CampaignType } from '@/types/campaign/CampaignType';
import { IFinances } from '@/types/campaign/IFinances';
import {
  UnitMarketRarity,
  UnitMarketType,
  MARKET_TYPE_QUALITY,
} from '@/types/campaign/markets/marketTypes';
import { Money } from '@/types/campaign/Money';

import {
  calculateItemCount,
  calculatePricePercent,
  getMarketTypeQuality,
  getEndOfMonth,
  generateUnitOffers,
  purchaseUnit,
  RandomFn,
} from '../unitMarket';

// =============================================================================
// Test Fixtures
// =============================================================================

function createSeededRandom(seed: number): RandomFn {
  let state = seed;
  return () => {
    state = (1103515245 * state + 12345) & 0x7fffffff;
    return state / 0x7fffffff;
  };
}

function createTestCampaign(
  dateStr: string = '3025-06-15T00:00:00Z',
): ICampaign {
  return {
    id: 'campaign-001',
    name: 'Test Campaign',
    currentDate: new Date(dateStr),
    factionId: 'mercenary',
    personnel: new Map(),
    forces: new Map(),
    rootForceId: 'force-root',
    missions: new Map(),
    finances: {
      transactions: [],
      balance: new Money(1000000),
    } as IFinances,
    factionStandings: {},
    shoppingList: { items: [] },
    options: createDefaultCampaignOptions(),
    campaignType: CampaignType.MERCENARY,
    createdAt: '2026-01-26T10:00:00Z',
    updatedAt: '2026-01-26T10:00:00Z',
  };
}

// =============================================================================
// Tests
// =============================================================================

describe('Unit Market', () => {
  // ===========================================================================
  // calculateItemCount
  // ===========================================================================
  describe('calculateItemCount', () => {
    it('should produce range 1-6 for COMMON rarity (value 3)', () => {
      const results = new Set<number>();
      for (let seed = 0; seed < 100; seed++) {
        const random = createSeededRandom(seed);
        results.add(calculateItemCount(UnitMarketRarity.COMMON, random));
      }
      // COMMON (value 3): d6 + 3 - 3 = d6, range [1,6]
      Array.from(results).forEach((val) => {
        expect(val).toBeGreaterThanOrEqual(1);
        expect(val).toBeLessThanOrEqual(6);
      });
      expect(results.size).toBeGreaterThan(1);
    });

    it('should produce mostly 0 for MYTHIC rarity (value -1)', () => {
      let zeroCount = 0;
      const total = 100;
      for (let seed = 0; seed < total; seed++) {
        const random = createSeededRandom(seed);
        const count = calculateItemCount(UnitMarketRarity.MYTHIC, random);
        expect(count).toBeGreaterThanOrEqual(0);
        if (count === 0) zeroCount++;
      }
      // MYTHIC (value -1): d6 + (-1) - 3 = d6 - 4. Only d6=5 gives 1, d6=6 gives 2. Rest are 0.
      expect(zeroCount).toBeGreaterThan(50);
    });

    it('should produce range 8-13 for UBIQUITOUS rarity (value 10)', () => {
      const results = new Set<number>();
      for (let seed = 0; seed < 100; seed++) {
        const random = createSeededRandom(seed);
        results.add(calculateItemCount(UnitMarketRarity.UBIQUITOUS, random));
      }
      // UBIQUITOUS (value 10): d6 + 10 - 3 = d6 + 7, range [8,13]
      Array.from(results).forEach((val) => {
        expect(val).toBeGreaterThanOrEqual(8);
        expect(val).toBeLessThanOrEqual(13);
      });
    });

    it('should never return negative values', () => {
      const rarities = Object.values(UnitMarketRarity);
      for (const rarity of rarities) {
        for (let seed = 0; seed < 50; seed++) {
          const random = createSeededRandom(seed);
          expect(calculateItemCount(rarity, random)).toBeGreaterThanOrEqual(0);
        }
      }
    });

    it('should produce deterministic results with same seed', () => {
      const r1 = createSeededRandom(42);
      const r2 = createSeededRandom(42);
      expect(calculateItemCount(UnitMarketRarity.COMMON, r1)).toBe(
        calculateItemCount(UnitMarketRarity.COMMON, r2),
      );
    });

    it('should use correct formula: max(0, d6 + rarityValue - 3)', () => {
      // Force d6 = 1 by using random that returns 0.0
      const alwaysMin: RandomFn = () => 0.0;
      // d6=1, COMMON(3): 1+3-3=1
      expect(calculateItemCount(UnitMarketRarity.COMMON, alwaysMin)).toBe(1);
      // d6=1, MYTHIC(-1): 1+(-1)-3=-3 -> max(0,-3)=0
      expect(calculateItemCount(UnitMarketRarity.MYTHIC, alwaysMin)).toBe(0);
      // d6=1, UBIQUITOUS(10): 1+10-3=8
      expect(calculateItemCount(UnitMarketRarity.UBIQUITOUS, alwaysMin)).toBe(
        8,
      );
    });
  });

  // ===========================================================================
  // calculatePricePercent
  // ===========================================================================
  describe('calculatePricePercent', () => {
    it('should return values in range 85-115', () => {
      for (let seed = 0; seed < 100; seed++) {
        const random = createSeededRandom(seed);
        const price = calculatePricePercent(random);
        expect(price).toBeGreaterThanOrEqual(85);
        expect(price).toBeLessThanOrEqual(115);
      }
    });

    it('should be deterministic with same seed', () => {
      const r1 = createSeededRandom(42);
      const r2 = createSeededRandom(42);
      expect(calculatePricePercent(r1)).toBe(calculatePricePercent(r2));
    });

    it('should return 115 for roll of 2 (snake eyes)', () => {
      // Both dice = 1 when random returns 0.0
      const alwaysMin: RandomFn = () => 0.0;
      // d1=1, d2=1, roll=2, modifier=+3, price=100+15=115
      expect(calculatePricePercent(alwaysMin)).toBe(115);
    });

    it('should return 85 for roll of 12 (boxcars)', () => {
      // Both dice = 6 when random returns just under 1.0
      const alwaysMax: RandomFn = () => 0.999;
      // d1=6, d2=6, roll=12, modifier=-3, price=100-15=85
      expect(calculatePricePercent(alwaysMax)).toBe(85);
    });

    it('should return 100 for middle rolls (6-8)', () => {
      // Need d1+d2 in [6,8]. d1=3, d2=3 -> roll=6
      const fixedRandom: RandomFn = () => {
        return 0.4; // floor(0.4*6)+1 = 3
      };
      // d1=3, d2=3, roll=6, modifier=0, price=100
      expect(calculatePricePercent(fixedRandom)).toBe(100);
    });

    it('should produce variety across different seeds', () => {
      const prices = new Set<number>();
      for (let seed = 0; seed < 200; seed++) {
        prices.add(calculatePricePercent(createSeededRandom(seed)));
      }
      expect(prices.size).toBeGreaterThan(3);
    });
  });

  // ===========================================================================
  // getMarketTypeQuality
  // ===========================================================================
  describe('getMarketTypeQuality', () => {
    it('should return "C" for OPEN market', () => {
      const random = createSeededRandom(1);
      expect(getMarketTypeQuality(UnitMarketType.OPEN, random)).toBe('C');
    });

    it('should return "B" for EMPLOYER market', () => {
      const random = createSeededRandom(1);
      expect(getMarketTypeQuality(UnitMarketType.EMPLOYER, random)).toBe('B');
    });

    it('should return "C" for MERCENARY market', () => {
      const random = createSeededRandom(1);
      expect(getMarketTypeQuality(UnitMarketType.MERCENARY, random)).toBe('C');
    });

    it('should return "F" for FACTORY market', () => {
      const random = createSeededRandom(1);
      expect(getMarketTypeQuality(UnitMarketType.FACTORY, random)).toBe('F');
    });

    it('should return "F" for CIVILIAN market', () => {
      const random = createSeededRandom(1);
      expect(getMarketTypeQuality(UnitMarketType.CIVILIAN, random)).toBe('F');
    });

    it('should return "A" or "F" for BLACK_MARKET', () => {
      const results = new Set<string>();
      for (let seed = 0; seed < 100; seed++) {
        results.add(
          getMarketTypeQuality(
            UnitMarketType.BLACK_MARKET,
            createSeededRandom(seed),
          ),
        );
      }
      expect(results.size).toBe(2);
      expect(results.has('A')).toBe(true);
      expect(results.has('F')).toBe(true);
    });

    it('should return "A" for BLACK_MARKET when random < 0.5', () => {
      const lowRandom: RandomFn = () => 0.3;
      expect(getMarketTypeQuality(UnitMarketType.BLACK_MARKET, lowRandom)).toBe(
        'A',
      );
    });

    it('should return "F" for BLACK_MARKET when random >= 0.5', () => {
      const highRandom: RandomFn = () => 0.7;
      expect(
        getMarketTypeQuality(UnitMarketType.BLACK_MARKET, highRandom),
      ).toBe('F');
    });

    it('should match MARKET_TYPE_QUALITY for non-BLACK_MARKET types', () => {
      const nonBlackMarketTypes = Object.values(UnitMarketType).filter(
        (t) => t !== UnitMarketType.BLACK_MARKET,
      );
      for (const marketType of nonBlackMarketTypes) {
        const random = createSeededRandom(42);
        expect(getMarketTypeQuality(marketType, random)).toBe(
          MARKET_TYPE_QUALITY[marketType],
        );
      }
    });
  });

  // ===========================================================================
  // getEndOfMonth
  // ===========================================================================
  describe('getEndOfMonth', () => {
    it('should return January 31st for a January date', () => {
      const date = new Date('3025-01-15T00:00:00Z');
      expect(getEndOfMonth(date)).toBe('3025-01-31');
    });

    it('should return February 28th for non-leap year', () => {
      const date = new Date('3025-02-10T00:00:00Z');
      expect(getEndOfMonth(date)).toBe('3025-02-28');
    });

    it('should return February 29th for leap year', () => {
      const date = new Date('3024-02-10T00:00:00Z');
      expect(getEndOfMonth(date)).toBe('3024-02-29');
    });

    it('should return April 30th for an April date', () => {
      const date = new Date('3025-04-01T00:00:00Z');
      expect(getEndOfMonth(date)).toBe('3025-04-30');
    });

    it('should return December 31st for a December date', () => {
      const date = new Date('3025-12-25T00:00:00Z');
      expect(getEndOfMonth(date)).toBe('3025-12-31');
    });

    it('should handle first day of month', () => {
      const date = new Date('3025-03-01T00:00:00Z');
      expect(getEndOfMonth(date)).toBe('3025-03-31');
    });

    it('should handle last day of month', () => {
      const date = new Date('3025-06-30T00:00:00Z');
      expect(getEndOfMonth(date)).toBe('3025-06-30');
    });
  });

  // ===========================================================================
  // generateUnitOffers
  // ===========================================================================
  describe('generateUnitOffers', () => {
    it('should produce an array of IUnitMarketOffer objects', () => {
      const campaign = createTestCampaign();
      const offers = generateUnitOffers(campaign, createSeededRandom(42));
      expect(Array.isArray(offers)).toBe(true);
      expect(offers.length).toBeGreaterThan(0);
    });

    it('should generate offers with valid structure', () => {
      const campaign = createTestCampaign();
      const offers = generateUnitOffers(campaign, createSeededRandom(42));

      for (const offer of offers) {
        expect(typeof offer.id).toBe('string');
        expect(offer.id.startsWith('umo-')).toBe(true);
        expect(typeof offer.unitId).toBe('string');
        expect(typeof offer.unitName).toBe('string');
        expect(Object.values(UnitMarketRarity)).toContain(offer.rarity);
        expect(Object.values(UnitMarketType)).toContain(offer.marketType);
        expect(typeof offer.quality).toBe('string');
        expect(offer.quality).toMatch(/^[A-F]$/);
        expect(typeof offer.pricePercent).toBe('number');
        expect(offer.pricePercent).toBeGreaterThanOrEqual(85);
        expect(offer.pricePercent).toBeLessThanOrEqual(115);
        expect(typeof offer.baseCost).toBe('number');
        expect(offer.baseCost).toBeGreaterThan(0);
        expect(typeof offer.expirationDate).toBe('string');
      }
    });

    it('should set expiration to end of current month', () => {
      const campaign = createTestCampaign('3025-06-15T00:00:00Z');
      const offers = generateUnitOffers(campaign, createSeededRandom(42));

      for (const offer of offers) {
        expect(offer.expirationDate).toBe('3025-06-30');
      }
    });

    it('should generate offers for multiple market types', () => {
      const campaign = createTestCampaign();
      const offers = generateUnitOffers(campaign, createSeededRandom(42));
      const marketTypes = new Set(offers.map((o) => o.marketType));
      expect(marketTypes.size).toBeGreaterThan(1);
    });

    it('should generate offers for multiple rarities', () => {
      const campaign = createTestCampaign();
      const offers = generateUnitOffers(campaign, createSeededRandom(42));
      const rarities = new Set(offers.map((o) => o.rarity));
      expect(rarities.size).toBeGreaterThan(1);
    });

    it('should produce deterministic results with same seed', () => {
      const campaign = createTestCampaign();
      const offers1 = generateUnitOffers(campaign, createSeededRandom(99));
      const offers2 = generateUnitOffers(campaign, createSeededRandom(99));

      expect(offers1.length).toBe(offers2.length);
      for (let i = 0; i < offers1.length; i++) {
        expect(offers1[i].unitId).toBe(offers2[i].unitId);
        expect(offers1[i].unitName).toBe(offers2[i].unitName);
        expect(offers1[i].rarity).toBe(offers2[i].rarity);
        expect(offers1[i].marketType).toBe(offers2[i].marketType);
        expect(offers1[i].quality).toBe(offers2[i].quality);
        expect(offers1[i].pricePercent).toBe(offers2[i].pricePercent);
        expect(offers1[i].baseCost).toBe(offers2[i].baseCost);
      }
    });

    it('should generate unique IDs for each offer', () => {
      const campaign = createTestCampaign();
      const offers = generateUnitOffers(campaign, createSeededRandom(42));
      const ids = offers.map((o) => o.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });
  });

  // ===========================================================================
  // purchaseUnit
  // ===========================================================================
  describe('purchaseUnit', () => {
    it('should return success when offer exists', () => {
      const campaign = createTestCampaign();
      const offers = generateUnitOffers(campaign, createSeededRandom(42));
      const result = purchaseUnit(campaign, offers[0].id, offers);
      expect(result.success).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('should return failure when offer not found', () => {
      const campaign = createTestCampaign();
      const offers = generateUnitOffers(campaign, createSeededRandom(42));
      const result = purchaseUnit(campaign, 'nonexistent-id', offers);
      expect(result.success).toBe(false);
      expect(result.reason).toBe('Offer not found');
    });

    it('should return failure for empty offers list', () => {
      const campaign = createTestCampaign();
      const result = purchaseUnit(campaign, 'any-id', []);
      expect(result.success).toBe(false);
      expect(result.reason).toBe('Offer not found');
    });

    it('should find the correct offer by ID', () => {
      const campaign = createTestCampaign();
      const offers = generateUnitOffers(campaign, createSeededRandom(42));
      // Purchase the last offer specifically
      const lastOffer = offers[offers.length - 1];
      const result = purchaseUnit(campaign, lastOffer.id, offers);
      expect(result.success).toBe(true);
    });
  });
});
