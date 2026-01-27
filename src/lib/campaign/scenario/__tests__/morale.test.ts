/**
 * Tests for contract morale tracking functions
 *
 * @module campaign/scenario/__tests__/morale.test
 */

import {
  updateMorale,
  getMoraleLevelFromValue,
  getMoraleDisplayInfo,
} from '../morale';
import { AtBMoraleLevel, MORALE_VALUES } from '@/types/campaign/scenario/scenarioTypes';

describe('updateMorale', () => {
  describe('victory outcome', () => {
    it('should increase morale by 1 from ROUTED to CRITICAL', () => {
      const result = updateMorale(AtBMoraleLevel.ROUTED, 'victory');
      expect(result).toBe(AtBMoraleLevel.CRITICAL);
    });

    it('should increase morale by 1 from CRITICAL to WEAKENED', () => {
      const result = updateMorale(AtBMoraleLevel.CRITICAL, 'victory');
      expect(result).toBe(AtBMoraleLevel.WEAKENED);
    });

    it('should increase morale by 1 from WEAKENED to STALEMATE', () => {
      const result = updateMorale(AtBMoraleLevel.WEAKENED, 'victory');
      expect(result).toBe(AtBMoraleLevel.STALEMATE);
    });

    it('should increase morale by 1 from STALEMATE to ADVANCING', () => {
      const result = updateMorale(AtBMoraleLevel.STALEMATE, 'victory');
      expect(result).toBe(AtBMoraleLevel.ADVANCING);
    });

    it('should increase morale by 1 from ADVANCING to DOMINATING', () => {
      const result = updateMorale(AtBMoraleLevel.ADVANCING, 'victory');
      expect(result).toBe(AtBMoraleLevel.DOMINATING);
    });

    it('should increase morale by 1 from DOMINATING to OVERWHELMING', () => {
      const result = updateMorale(AtBMoraleLevel.DOMINATING, 'victory');
      expect(result).toBe(AtBMoraleLevel.OVERWHELMING);
    });

    it('should clamp at OVERWHELMING when already at max', () => {
      const result = updateMorale(AtBMoraleLevel.OVERWHELMING, 'victory');
      expect(result).toBe(AtBMoraleLevel.OVERWHELMING);
    });
  });

  describe('defeat outcome', () => {
    it('should decrease morale by 1 from OVERWHELMING to DOMINATING', () => {
      const result = updateMorale(AtBMoraleLevel.OVERWHELMING, 'defeat');
      expect(result).toBe(AtBMoraleLevel.DOMINATING);
    });

    it('should decrease morale by 1 from DOMINATING to ADVANCING', () => {
      const result = updateMorale(AtBMoraleLevel.DOMINATING, 'defeat');
      expect(result).toBe(AtBMoraleLevel.ADVANCING);
    });

    it('should decrease morale by 1 from ADVANCING to STALEMATE', () => {
      const result = updateMorale(AtBMoraleLevel.ADVANCING, 'defeat');
      expect(result).toBe(AtBMoraleLevel.STALEMATE);
    });

    it('should decrease morale by 1 from STALEMATE to WEAKENED', () => {
      const result = updateMorale(AtBMoraleLevel.STALEMATE, 'defeat');
      expect(result).toBe(AtBMoraleLevel.WEAKENED);
    });

    it('should decrease morale by 1 from WEAKENED to CRITICAL', () => {
      const result = updateMorale(AtBMoraleLevel.WEAKENED, 'defeat');
      expect(result).toBe(AtBMoraleLevel.CRITICAL);
    });

    it('should decrease morale by 1 from CRITICAL to ROUTED', () => {
      const result = updateMorale(AtBMoraleLevel.CRITICAL, 'defeat');
      expect(result).toBe(AtBMoraleLevel.ROUTED);
    });

    it('should clamp at ROUTED when already at min', () => {
      const result = updateMorale(AtBMoraleLevel.ROUTED, 'defeat');
      expect(result).toBe(AtBMoraleLevel.ROUTED);
    });
  });

  describe('draw outcome', () => {
    it('should keep morale unchanged from ROUTED', () => {
      const result = updateMorale(AtBMoraleLevel.ROUTED, 'draw');
      expect(result).toBe(AtBMoraleLevel.ROUTED);
    });

    it('should keep morale unchanged from CRITICAL', () => {
      const result = updateMorale(AtBMoraleLevel.CRITICAL, 'draw');
      expect(result).toBe(AtBMoraleLevel.CRITICAL);
    });

    it('should keep morale unchanged from WEAKENED', () => {
      const result = updateMorale(AtBMoraleLevel.WEAKENED, 'draw');
      expect(result).toBe(AtBMoraleLevel.WEAKENED);
    });

    it('should keep morale unchanged from STALEMATE', () => {
      const result = updateMorale(AtBMoraleLevel.STALEMATE, 'draw');
      expect(result).toBe(AtBMoraleLevel.STALEMATE);
    });

    it('should keep morale unchanged from ADVANCING', () => {
      const result = updateMorale(AtBMoraleLevel.ADVANCING, 'draw');
      expect(result).toBe(AtBMoraleLevel.ADVANCING);
    });

    it('should keep morale unchanged from DOMINATING', () => {
      const result = updateMorale(AtBMoraleLevel.DOMINATING, 'draw');
      expect(result).toBe(AtBMoraleLevel.DOMINATING);
    });

    it('should keep morale unchanged from OVERWHELMING', () => {
      const result = updateMorale(AtBMoraleLevel.OVERWHELMING, 'draw');
      expect(result).toBe(AtBMoraleLevel.OVERWHELMING);
    });
  });

  describe('boundary clamping', () => {
    it('should not go below ROUTED (-3) on multiple defeats', () => {
      let morale = AtBMoraleLevel.ROUTED;
      morale = updateMorale(morale, 'defeat');
      morale = updateMorale(morale, 'defeat');
      morale = updateMorale(morale, 'defeat');
      expect(morale).toBe(AtBMoraleLevel.ROUTED);
    });

    it('should not go above OVERWHELMING (+3) on multiple victories', () => {
      let morale = AtBMoraleLevel.OVERWHELMING;
      morale = updateMorale(morale, 'victory');
      morale = updateMorale(morale, 'victory');
      morale = updateMorale(morale, 'victory');
      expect(morale).toBe(AtBMoraleLevel.OVERWHELMING);
    });

    it('should handle mixed outcomes correctly', () => {
      let morale = AtBMoraleLevel.STALEMATE;
      morale = updateMorale(morale, 'victory'); // ADVANCING
      morale = updateMorale(morale, 'victory'); // DOMINATING
      morale = updateMorale(morale, 'defeat'); // ADVANCING
      morale = updateMorale(morale, 'draw'); // ADVANCING
      expect(morale).toBe(AtBMoraleLevel.ADVANCING);
    });
  });
});

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

describe('getMoraleDisplayInfo', () => {
  it('should return correct info for ROUTED', () => {
    const info = getMoraleDisplayInfo(AtBMoraleLevel.ROUTED);
    expect(info).toEqual({
      label: 'Routed',
      color: 'red',
      description: 'Company morale has collapsed',
    });
  });

  it('should return correct info for CRITICAL', () => {
    const info = getMoraleDisplayInfo(AtBMoraleLevel.CRITICAL);
    expect(info).toEqual({
      label: 'Critical',
      color: 'orange',
      description: 'Company morale is critically low',
    });
  });

  it('should return correct info for WEAKENED', () => {
    const info = getMoraleDisplayInfo(AtBMoraleLevel.WEAKENED);
    expect(info).toEqual({
      label: 'Weakened',
      color: 'yellow',
      description: 'Company morale is weakened',
    });
  });

  it('should return correct info for STALEMATE', () => {
    const info = getMoraleDisplayInfo(AtBMoraleLevel.STALEMATE);
    expect(info).toEqual({
      label: 'Stalemate',
      color: 'gray',
      description: 'Neither side has the advantage',
    });
  });

  it('should return correct info for ADVANCING', () => {
    const info = getMoraleDisplayInfo(AtBMoraleLevel.ADVANCING);
    expect(info).toEqual({
      label: 'Advancing',
      color: 'lightgreen',
      description: 'Company morale is improving',
    });
  });

  it('should return correct info for DOMINATING', () => {
    const info = getMoraleDisplayInfo(AtBMoraleLevel.DOMINATING);
    expect(info).toEqual({
      label: 'Dominating',
      color: 'green',
      description: 'Company morale is high',
    });
  });

  it('should return correct info for OVERWHELMING', () => {
    const info = getMoraleDisplayInfo(AtBMoraleLevel.OVERWHELMING);
    expect(info).toEqual({
      label: 'Overwhelming',
      color: 'darkgreen',
      description: 'Company morale is overwhelming',
    });
  });

  it('should return immutable objects', () => {
    const info = getMoraleDisplayInfo(AtBMoraleLevel.STALEMATE);
    expect(() => {
      Object.assign(info, { label: 'Modified' });
    }).toThrow();
  });

  it('should return consistent info for all levels', () => {
    const levels = Object.values(AtBMoraleLevel);
    levels.forEach((level) => {
      const info = getMoraleDisplayInfo(level);
      expect(info).toHaveProperty('label');
      expect(info).toHaveProperty('color');
      expect(info).toHaveProperty('description');
      expect(typeof info.label).toBe('string');
      expect(typeof info.color).toBe('string');
      expect(typeof info.description).toBe('string');
      expect(info.label.length).toBeGreaterThan(0);
      expect(info.color.length).toBeGreaterThan(0);
      expect(info.description.length).toBeGreaterThan(0);
    });
  });
});
