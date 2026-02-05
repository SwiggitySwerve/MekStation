import { FactionStandingLevel } from '@/types/campaign/factionStanding/IFactionStanding';

import {
  getNegotiationModifier,
  getResupplyWeightModifier,
  hasCommandCircuitAccess,
  isOutlawed,
  isBatchallDisabled,
  getRecruitmentModifier,
  getBarracksCostMultiplier,
  getUnitMarketRarityModifier,
  getContractPayMultiplier,
  getStartSupportPointsModifier,
  getPeriodicSupportPointsModifier,
  getAllEffects,
  FactionStandingEffects,
} from '../standingEffects';

describe('Faction Standing Effects', () => {
  describe('getNegotiationModifier', () => {
    it('should return -4 at Level 0', () => {
      expect(getNegotiationModifier(FactionStandingLevel.LEVEL_0)).toBe(-4);
    });

    it('should return 0 at Level 4 (neutral)', () => {
      expect(getNegotiationModifier(FactionStandingLevel.LEVEL_4)).toBe(0);
    });

    it('should return +4 at Level 8', () => {
      expect(getNegotiationModifier(FactionStandingLevel.LEVEL_8)).toBe(4);
    });

    it('should have correct values for all levels', () => {
      const expected = [-4, -3, -2, -1, 0, 1, 2, 3, 4];
      for (let i = 0; i <= 8; i++) {
        expect(getNegotiationModifier(i as FactionStandingLevel)).toBe(
          expected[i],
        );
      }
    });
  });

  describe('getResupplyWeightModifier', () => {
    it('should return 0.0 at Level 0', () => {
      expect(getResupplyWeightModifier(FactionStandingLevel.LEVEL_0)).toBe(0.0);
    });

    it('should return 1.0 at Level 4 (neutral)', () => {
      expect(getResupplyWeightModifier(FactionStandingLevel.LEVEL_4)).toBe(1.0);
    });

    it('should return 2.0 at Level 8', () => {
      expect(getResupplyWeightModifier(FactionStandingLevel.LEVEL_8)).toBe(2.0);
    });

    it('should have correct values for all levels', () => {
      const expected = [0.0, 0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0];
      for (let i = 0; i <= 8; i++) {
        expect(getResupplyWeightModifier(i as FactionStandingLevel)).toBe(
          expected[i],
        );
      }
    });
  });

  describe('hasCommandCircuitAccess', () => {
    it('should return false at Level 0', () => {
      expect(hasCommandCircuitAccess(FactionStandingLevel.LEVEL_0)).toBe(false);
    });

    it('should return false at Level 6', () => {
      expect(hasCommandCircuitAccess(FactionStandingLevel.LEVEL_6)).toBe(false);
    });

    it('should return true at Level 7', () => {
      expect(hasCommandCircuitAccess(FactionStandingLevel.LEVEL_7)).toBe(true);
    });

    it('should return true at Level 8', () => {
      expect(hasCommandCircuitAccess(FactionStandingLevel.LEVEL_8)).toBe(true);
    });

    it('should only be true at Level 7+', () => {
      for (let i = 0; i <= 6; i++) {
        expect(hasCommandCircuitAccess(i as FactionStandingLevel)).toBe(false);
      }
      for (let i = 7; i <= 8; i++) {
        expect(hasCommandCircuitAccess(i as FactionStandingLevel)).toBe(true);
      }
    });
  });

  describe('isOutlawed', () => {
    it('should return true at Level 0', () => {
      expect(isOutlawed(FactionStandingLevel.LEVEL_0)).toBe(true);
    });

    it('should return true at Level 1', () => {
      expect(isOutlawed(FactionStandingLevel.LEVEL_1)).toBe(true);
    });

    it('should return false at Level 2', () => {
      expect(isOutlawed(FactionStandingLevel.LEVEL_2)).toBe(false);
    });

    it('should return false at Level 8', () => {
      expect(isOutlawed(FactionStandingLevel.LEVEL_8)).toBe(false);
    });

    it('should only be true at Level 0-1', () => {
      expect(isOutlawed(FactionStandingLevel.LEVEL_0)).toBe(true);
      expect(isOutlawed(FactionStandingLevel.LEVEL_1)).toBe(true);
      for (let i = 2; i <= 8; i++) {
        expect(isOutlawed(i as FactionStandingLevel)).toBe(false);
      }
    });
  });

  describe('isBatchallDisabled', () => {
    it('should return true at Level 0', () => {
      expect(isBatchallDisabled(FactionStandingLevel.LEVEL_0)).toBe(true);
    });

    it('should return true at Level 2', () => {
      expect(isBatchallDisabled(FactionStandingLevel.LEVEL_2)).toBe(true);
    });

    it('should return false at Level 3', () => {
      expect(isBatchallDisabled(FactionStandingLevel.LEVEL_3)).toBe(false);
    });

    it('should return false at Level 8', () => {
      expect(isBatchallDisabled(FactionStandingLevel.LEVEL_8)).toBe(false);
    });

    it('should only be true at Level 0-2', () => {
      for (let i = 0; i <= 2; i++) {
        expect(isBatchallDisabled(i as FactionStandingLevel)).toBe(true);
      }
      for (let i = 3; i <= 8; i++) {
        expect(isBatchallDisabled(i as FactionStandingLevel)).toBe(false);
      }
    });
  });

  describe('getRecruitmentModifier', () => {
    it('should return 0 tickets at Level 0', () => {
      const result = getRecruitmentModifier(FactionStandingLevel.LEVEL_0);
      expect(result.tickets).toBe(0);
    });

    it('should return -3 roll modifier at Level 0', () => {
      const result = getRecruitmentModifier(FactionStandingLevel.LEVEL_0);
      expect(result.rollModifier).toBe(-3);
    });

    it('should return 3 tickets at Level 4 (baseline)', () => {
      const result = getRecruitmentModifier(FactionStandingLevel.LEVEL_4);
      expect(result.tickets).toBe(3);
    });

    it('should return 0 roll modifier at Level 4 (baseline)', () => {
      const result = getRecruitmentModifier(FactionStandingLevel.LEVEL_4);
      expect(result.rollModifier).toBe(0);
    });

    it('should return 6 tickets at Level 8 (max)', () => {
      const result = getRecruitmentModifier(FactionStandingLevel.LEVEL_8);
      expect(result.tickets).toBe(6);
    });

    it('should return +3 roll modifier at Level 8', () => {
      const result = getRecruitmentModifier(FactionStandingLevel.LEVEL_8);
      expect(result.rollModifier).toBe(3);
    });

    it('should have correct values for all levels', () => {
      const expectedTickets = [0, 0, 1, 2, 3, 4, 5, 5, 6];
      const expectedRollMod = [-3, -2, -1, 0, 0, 1, 2, 2, 3];
      for (let i = 0; i <= 8; i++) {
        const result = getRecruitmentModifier(i as FactionStandingLevel);
        expect(result.tickets).toBe(expectedTickets[i]);
        expect(result.rollModifier).toBe(expectedRollMod[i]);
      }
    });
  });

  describe('getBarracksCostMultiplier', () => {
    it('should return 3.0 at Level 0', () => {
      expect(getBarracksCostMultiplier(FactionStandingLevel.LEVEL_0)).toBe(3.0);
    });

    it('should return 1.0 at Level 4 (neutral)', () => {
      expect(getBarracksCostMultiplier(FactionStandingLevel.LEVEL_4)).toBe(1.0);
    });

    it('should return 0.75 at Level 8', () => {
      expect(getBarracksCostMultiplier(FactionStandingLevel.LEVEL_8)).toBe(
        0.75,
      );
    });

    it('should have correct values for all levels', () => {
      const expected = [3.0, 2.5, 2.0, 1.5, 1.0, 0.9, 0.85, 0.8, 0.75];
      for (let i = 0; i <= 8; i++) {
        expect(getBarracksCostMultiplier(i as FactionStandingLevel)).toBe(
          expected[i],
        );
      }
    });
  });

  describe('getUnitMarketRarityModifier', () => {
    it('should return -2 at Level 0', () => {
      expect(getUnitMarketRarityModifier(FactionStandingLevel.LEVEL_0)).toBe(
        -2,
      );
    });

    it('should return 0 at Level 4 (neutral)', () => {
      expect(getUnitMarketRarityModifier(FactionStandingLevel.LEVEL_4)).toBe(0);
    });

    it('should return +3 at Level 8', () => {
      expect(getUnitMarketRarityModifier(FactionStandingLevel.LEVEL_8)).toBe(3);
    });

    it('should have correct values for all levels', () => {
      const expected = [-2, -1, -1, 0, 0, 1, 2, 2, 3];
      for (let i = 0; i <= 8; i++) {
        expect(getUnitMarketRarityModifier(i as FactionStandingLevel)).toBe(
          expected[i],
        );
      }
    });
  });

  describe('getContractPayMultiplier', () => {
    it('should return 0.6 at Level 0', () => {
      expect(getContractPayMultiplier(FactionStandingLevel.LEVEL_0)).toBe(0.6);
    });

    it('should return 1.0 at Level 4 (neutral)', () => {
      expect(getContractPayMultiplier(FactionStandingLevel.LEVEL_4)).toBe(1.0);
    });

    it('should return 1.2 at Level 8', () => {
      expect(getContractPayMultiplier(FactionStandingLevel.LEVEL_8)).toBe(1.2);
    });

    it('should have correct values for all levels', () => {
      const expected = [0.6, 0.7, 0.8, 0.9, 1.0, 1.05, 1.1, 1.15, 1.2];
      for (let i = 0; i <= 8; i++) {
        expect(getContractPayMultiplier(i as FactionStandingLevel)).toBe(
          expected[i],
        );
      }
    });
  });

  describe('getStartSupportPointsModifier', () => {
    it('should return -3 at Level 0', () => {
      expect(getStartSupportPointsModifier(FactionStandingLevel.LEVEL_0)).toBe(
        -3,
      );
    });

    it('should return 0 at Level 4 (neutral)', () => {
      expect(getStartSupportPointsModifier(FactionStandingLevel.LEVEL_4)).toBe(
        0,
      );
    });

    it('should return +3 at Level 8', () => {
      expect(getStartSupportPointsModifier(FactionStandingLevel.LEVEL_8)).toBe(
        3,
      );
    });

    it('should have correct values for all levels', () => {
      const expected = [-3, -2, -1, -1, 0, 1, 2, 2, 3];
      for (let i = 0; i <= 8; i++) {
        expect(getStartSupportPointsModifier(i as FactionStandingLevel)).toBe(
          expected[i],
        );
      }
    });
  });

  describe('getPeriodicSupportPointsModifier', () => {
    it('should return -4 at Level 0', () => {
      expect(
        getPeriodicSupportPointsModifier(FactionStandingLevel.LEVEL_0),
      ).toBe(-4);
    });

    it('should return 0 at Level 4 (neutral)', () => {
      expect(
        getPeriodicSupportPointsModifier(FactionStandingLevel.LEVEL_4),
      ).toBe(0);
    });

    it('should return +3 at Level 8', () => {
      expect(
        getPeriodicSupportPointsModifier(FactionStandingLevel.LEVEL_8),
      ).toBe(3);
    });

    it('should have correct values for all levels', () => {
      const expected = [-4, -3, -2, -1, 0, 1, 2, 2, 3];
      for (let i = 0; i <= 8; i++) {
        expect(
          getPeriodicSupportPointsModifier(i as FactionStandingLevel),
        ).toBe(expected[i]);
      }
    });
  });

  describe('getAllEffects', () => {
    it('should return complete FactionStandingEffects object', () => {
      const effects = getAllEffects(FactionStandingLevel.LEVEL_4);
      expect(effects).toHaveProperty('negotiation');
      expect(effects).toHaveProperty('resupplyWeight');
      expect(effects).toHaveProperty('commandCircuit');
      expect(effects).toHaveProperty('outlawed');
      expect(effects).toHaveProperty('batchallDisabled');
      expect(effects).toHaveProperty('recruitment');
      expect(effects).toHaveProperty('barracksCost');
      expect(effects).toHaveProperty('unitMarketRarity');
      expect(effects).toHaveProperty('contractPay');
      expect(effects).toHaveProperty('startSupportPoints');
      expect(effects).toHaveProperty('periodicSupportPoints');
    });

    it('should have correct structure at Level 0', () => {
      const effects = getAllEffects(FactionStandingLevel.LEVEL_0);
      expect(effects.negotiation).toBe(-4);
      expect(effects.resupplyWeight).toBe(0.0);
      expect(effects.commandCircuit).toBe(false);
      expect(effects.outlawed).toBe(true);
      expect(effects.batchallDisabled).toBe(true);
      expect(effects.recruitment).toEqual({ tickets: 0, rollModifier: -3 });
      expect(effects.barracksCost).toBe(3.0);
      expect(effects.unitMarketRarity).toBe(-2);
      expect(effects.contractPay).toBe(0.6);
      expect(effects.startSupportPoints).toBe(-3);
      expect(effects.periodicSupportPoints).toBe(-4);
    });

    it('should have correct structure at Level 4 (neutral)', () => {
      const effects = getAllEffects(FactionStandingLevel.LEVEL_4);
      expect(effects.negotiation).toBe(0);
      expect(effects.resupplyWeight).toBe(1.0);
      expect(effects.commandCircuit).toBe(false);
      expect(effects.outlawed).toBe(false);
      expect(effects.batchallDisabled).toBe(false);
      expect(effects.recruitment).toEqual({ tickets: 3, rollModifier: 0 });
      expect(effects.barracksCost).toBe(1.0);
      expect(effects.unitMarketRarity).toBe(0);
      expect(effects.contractPay).toBe(1.0);
      expect(effects.startSupportPoints).toBe(0);
      expect(effects.periodicSupportPoints).toBe(0);
    });

    it('should have correct structure at Level 8 (honored)', () => {
      const effects = getAllEffects(FactionStandingLevel.LEVEL_8);
      expect(effects.negotiation).toBe(4);
      expect(effects.resupplyWeight).toBe(2.0);
      expect(effects.commandCircuit).toBe(true);
      expect(effects.outlawed).toBe(false);
      expect(effects.batchallDisabled).toBe(false);
      expect(effects.recruitment).toEqual({ tickets: 6, rollModifier: 3 });
      expect(effects.barracksCost).toBe(0.75);
      expect(effects.unitMarketRarity).toBe(3);
      expect(effects.contractPay).toBe(1.2);
      expect(effects.startSupportPoints).toBe(3);
      expect(effects.periodicSupportPoints).toBe(3);
    });

    it('should return object with all properties defined', () => {
      const effects = getAllEffects(FactionStandingLevel.LEVEL_4);
      const keys = Object.keys(effects);
      expect(keys).toContain('negotiation');
      expect(keys).toContain('resupplyWeight');
      expect(keys).toContain('commandCircuit');
      expect(keys).toContain('outlawed');
      expect(keys).toContain('batchallDisabled');
      expect(keys).toContain('recruitment');
      expect(keys).toContain('barracksCost');
      expect(keys).toContain('unitMarketRarity');
      expect(keys).toContain('contractPay');
      expect(keys).toContain('startSupportPoints');
      expect(keys).toContain('periodicSupportPoints');
    });

    it('should return consistent results for all levels', () => {
      for (let i = 0; i <= 8; i++) {
        const level = i as FactionStandingLevel;
        const effects = getAllEffects(level);
        expect(effects.negotiation).toBe(getNegotiationModifier(level));
        expect(effects.resupplyWeight).toBe(getResupplyWeightModifier(level));
        expect(effects.commandCircuit).toBe(hasCommandCircuitAccess(level));
        expect(effects.outlawed).toBe(isOutlawed(level));
        expect(effects.batchallDisabled).toBe(isBatchallDisabled(level));
        expect(effects.recruitment).toEqual(getRecruitmentModifier(level));
        expect(effects.barracksCost).toBe(getBarracksCostMultiplier(level));
        expect(effects.unitMarketRarity).toBe(
          getUnitMarketRarityModifier(level),
        );
        expect(effects.contractPay).toBe(getContractPayMultiplier(level));
        expect(effects.startSupportPoints).toBe(
          getStartSupportPointsModifier(level),
        );
        expect(effects.periodicSupportPoints).toBe(
          getPeriodicSupportPointsModifier(level),
        );
      }
    });
  });

  describe('Edge cases and consistency', () => {
    it('should have monotonic negotiation modifier', () => {
      for (let i = 0; i < 8; i++) {
        const current = getNegotiationModifier(i as FactionStandingLevel);
        const next = getNegotiationModifier((i + 1) as FactionStandingLevel);
        expect(next).toBeGreaterThan(current);
      }
    });

    it('should have monotonic resupply weight modifier', () => {
      for (let i = 0; i < 8; i++) {
        const current = getResupplyWeightModifier(i as FactionStandingLevel);
        const next = getResupplyWeightModifier((i + 1) as FactionStandingLevel);
        expect(next).toBeGreaterThanOrEqual(current);
      }
    });

    it('should have monotonic contract pay multiplier', () => {
      for (let i = 0; i < 8; i++) {
        const current = getContractPayMultiplier(i as FactionStandingLevel);
        const next = getContractPayMultiplier((i + 1) as FactionStandingLevel);
        expect(next).toBeGreaterThanOrEqual(current);
      }
    });

    it('should have inverse monotonic barracks cost multiplier', () => {
      for (let i = 0; i < 8; i++) {
        const current = getBarracksCostMultiplier(i as FactionStandingLevel);
        const next = getBarracksCostMultiplier((i + 1) as FactionStandingLevel);
        expect(next).toBeLessThanOrEqual(current);
      }
    });
  });
});
