import {
  getUnitMarketRarityModifier,
  getRecruitmentTickets,
  getRecruitmentRollsModifier,
  getContractPayMultiplier,
  getContractNegotiationModifier,
} from '../marketStandingIntegration';
import type { ICampaign } from '@/types/campaign/Campaign';
import { createDefaultCampaignOptions } from '@/types/campaign/Campaign';
import { Money } from '@/types/campaign/Money';

describe('marketStandingIntegration', () => {
  const mockCampaign: ICampaign = {
    id: 'test',
    name: 'Test',
    currentDate: new Date('3025-01-01'),
    factionId: 'mercenary',
    personnel: new Map(),
    forces: new Map(),
    rootForceId: 'root',
    missions: new Map(),
    finances: { transactions: [], balance: new Money(0) },
    factionStandings: {},
    options: createDefaultCampaignOptions(),
    createdAt: '2025-01-01',
    updatedAt: '2025-01-01',
  };

  describe('getUnitMarketRarityModifier', () => {
    it('should return 0 (no modifier)', () => {
      const result = getUnitMarketRarityModifier(mockCampaign);
      expect(result).toBe(0);
    });

    it('should accept ICampaign parameter without error', () => {
      expect(() => getUnitMarketRarityModifier(mockCampaign)).not.toThrow();
    });
  });

  describe('getRecruitmentTickets', () => {
    it('should return 5 (default recruitment tickets)', () => {
      const result = getRecruitmentTickets(mockCampaign);
      expect(result).toBe(5);
    });

    it('should accept ICampaign parameter without error', () => {
      expect(() => getRecruitmentTickets(mockCampaign)).not.toThrow();
    });
  });

  describe('getRecruitmentRollsModifier', () => {
    it('should return 0 (no modifier)', () => {
      const result = getRecruitmentRollsModifier(mockCampaign);
      expect(result).toBe(0);
    });

    it('should accept ICampaign parameter without error', () => {
      expect(() => getRecruitmentRollsModifier(mockCampaign)).not.toThrow();
    });
  });

  describe('getContractPayMultiplier', () => {
    it('should return 1.0 (no multiplier)', () => {
      const result = getContractPayMultiplier(mockCampaign);
      expect(result).toBe(1.0);
    });

    it('should accept ICampaign parameter without error', () => {
      expect(() => getContractPayMultiplier(mockCampaign)).not.toThrow();
    });
  });

  describe('getContractNegotiationModifier', () => {
    it('should return 0 (no modifier)', () => {
      const result = getContractNegotiationModifier(mockCampaign);
      expect(result).toBe(0);
    });

    it('should accept ICampaign parameter without error', () => {
      expect(() => getContractNegotiationModifier(mockCampaign)).not.toThrow();
    });
  });
});
