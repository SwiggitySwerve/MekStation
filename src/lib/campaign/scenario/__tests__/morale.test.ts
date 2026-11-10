/**
 * Tests for contract morale tracking functions
 *
 * @module campaign/scenario/__tests__/morale.test
 */

import {
  AtBMoraleLevel,
  MORALE_VALUES,
} from '@/types/campaign/scenario/scenarioTypes';

import { getMoraleLevelFromValue } from '../morale';

describe('getMoraleLevelFromValue', () => {
  it('should map -3 to ROUTED', () => {
    const result = getMoraleLevelFromValue(-3);
    expect(result).toBe(AtBMoraleLevel.ROUTED);
  });

  it('should map -2 to CRITICAL', () => {
    const result = getMoraleLevelFromValue(-2);
    expect(result).toBe(AtBMoraleLevel.CRITICAL);
  });

  it('should map -1 to WEAKENED', () => {
    const result = getMoraleLevelFromValue(-1);
    expect(result).toBe(AtBMoraleLevel.WEAKENED);
  });

  it('should map 0 to STALEMATE', () => {
    const result = getMoraleLevelFromValue(0);
    expect(result).toBe(AtBMoraleLevel.STALEMATE);
  });

  it('should map 1 to ADVANCING', () => {
    const result = getMoraleLevelFromValue(1);
    expect(result).toBe(AtBMoraleLevel.ADVANCING);
  });

  it('should map 2 to DOMINATING', () => {
    const result = getMoraleLevelFromValue(2);
    expect(result).toBe(AtBMoraleLevel.DOMINATING);
  });

  it('should map 3 to OVERWHELMING', () => {
    const result = getMoraleLevelFromValue(3);
    expect(result).toBe(AtBMoraleLevel.OVERWHELMING);
  });

  it('should handle all morale values from MORALE_VALUES', () => {
    Object.entries(MORALE_VALUES).forEach(([level, value]) => {
      const result = getMoraleLevelFromValue(value);
      expect(result).toBe(level as AtBMoraleLevel);
    });
  });
});
