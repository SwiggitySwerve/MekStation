/**
 * Tests for variable contract length calculation
 *
 * Verifies the MekHQ AtB formula implementation across all 19 contract types
 * with deterministic and randomized test cases.
 *
 * @module campaign/contracts/__tests__/contractLength
 */

import {
  calculateContractLength,
  contractLengthToDays,
  getContractLengthRange,
  type RandomFn,
} from '../contractLength';
import { AtBContractType } from '@/types/campaign/contracts/contractTypes';

/**
 * Create a seeded random number generator for deterministic testing.
 * Uses a linear congruential generator (LCG) for reproducibility.
 */
function createSeededRandom(seed: number): RandomFn {
  let state = seed;
  return () => {
    state = (1103515245 * state + 12345) & 0x7fffffff;
    return state / 0x7fffffff;
  };
}

describe('contractLength', () => {
  describe('calculateContractLength', () => {
    describe('Garrison Duty (18 months)', () => {
      const type = AtBContractType.GARRISON_DUTY;
      // min = round(18 * 0.75) = 14
      // variance = round(18 * 0.5) = 9
      // range: 14-22

      it('should return minimum length when random returns 0', () => {
        const result = calculateContractLength(type, () => 0);
        expect(result).toBe(14);
      });

      it('should return maximum length when random returns 0.999', () => {
        const result = calculateContractLength(type, () => 0.999);
        expect(result).toBe(22);
      });

      it('should return value in valid range', () => {
        const random = createSeededRandom(42);
        const result = calculateContractLength(type, random);
        expect(result).toBeGreaterThanOrEqual(14);
        expect(result).toBeLessThanOrEqual(22);
      });
    });

    describe('Diversionary Raid (3 months)', () => {
      const type = AtBContractType.DIVERSIONARY_RAID;
      // min = round(3 * 0.75) = 2
      // variance = round(3 * 0.5) = 2
      // range: 2-3

      it('should return minimum length when random returns 0', () => {
        const result = calculateContractLength(type, () => 0);
        expect(result).toBe(2);
      });

      it('should return maximum length when random returns 0.999', () => {
        const result = calculateContractLength(type, () => 0.999);
        expect(result).toBe(3);
      });
    });

    describe('Guerrilla Warfare (24 months)', () => {
      const type = AtBContractType.GUERRILLA_WARFARE;
      // min = round(24 * 0.75) = 18
      // variance = round(24 * 0.5) = 12
      // range: 18-29

      it('should return minimum length when random returns 0', () => {
        const result = calculateContractLength(type, () => 0);
        expect(result).toBe(18);
      });

      it('should return maximum length when random returns 0.999', () => {
        const result = calculateContractLength(type, () => 0.999);
        expect(result).toBe(29);
      });
    });

    describe('Cadre Duty (12 months)', () => {
      const type = AtBContractType.CADRE_DUTY;
      // min = round(12 * 0.75) = 9
      // variance = round(12 * 0.5) = 6
      // range: 9-14

      it('should return minimum length when random returns 0', () => {
        const result = calculateContractLength(type, () => 0);
        expect(result).toBe(9);
      });

      it('should return maximum length when random returns 0.999', () => {
        const result = calculateContractLength(type, () => 0.999);
        expect(result).toBe(14);
      });
    });

    describe('Riot Duty (4 months)', () => {
      const type = AtBContractType.RIOT_DUTY;
      // min = round(4 * 0.75) = 3
      // variance = round(4 * 0.5) = 2
      // range: 3-4

      it('should return minimum length when random returns 0', () => {
        const result = calculateContractLength(type, () => 0);
        expect(result).toBe(3);
      });

      it('should return maximum length when random returns 0.999', () => {
        const result = calculateContractLength(type, () => 0.999);
        expect(result).toBe(4);
      });
    });

    describe('All 19 contract types', () => {
      it('should produce positive lengths for all types', () => {
        const allTypes = Object.values(AtBContractType);
        const random = () => 0.5;

        allTypes.forEach((type) => {
          const result = calculateContractLength(type, random);
          expect(result).toBeGreaterThan(0);
        });
      });

      it('should produce consistent results with same random seed', () => {
        const allTypes = Object.values(AtBContractType);
        const results1 = allTypes.map((type) =>
          calculateContractLength(type, createSeededRandom(123))
        );
        const results2 = allTypes.map((type) =>
          calculateContractLength(type, createSeededRandom(123))
        );

        expect(results1).toEqual(results2);
      });
    });

    describe('Deterministic behavior', () => {
      it('should always return min when random is 0', () => {
        const allTypes = Object.values(AtBContractType);
        allTypes.forEach((type) => {
          const result = calculateContractLength(type, () => 0);
          const range = getContractLengthRange(type);
          expect(result).toBe(range.min);
        });
      });

      it('should always return max when random is 0.999', () => {
        const allTypes = Object.values(AtBContractType);
        allTypes.forEach((type) => {
          const result = calculateContractLength(type, () => 0.999);
          const range = getContractLengthRange(type);
          expect(result).toBe(range.max);
        });
      });
    });
  });

  describe('contractLengthToDays', () => {
    it('should convert 1 month to 30 days', () => {
      expect(contractLengthToDays(1)).toBe(30);
    });

    it('should convert 6 months to 180 days', () => {
      expect(contractLengthToDays(6)).toBe(180);
    });

    it('should convert 18 months to 540 days', () => {
      expect(contractLengthToDays(18)).toBe(540);
    });

    it('should convert 0 months to 0 days', () => {
      expect(contractLengthToDays(0)).toBe(0);
    });

    it('should handle fractional months', () => {
      expect(contractLengthToDays(1.5)).toBe(45);
    });
  });

  describe('getContractLengthRange', () => {
    it('should return correct range for Garrison Duty', () => {
      const range = getContractLengthRange(AtBContractType.GARRISON_DUTY);
      expect(range).toEqual({ min: 14, max: 22 });
    });

    it('should return correct range for Diversionary Raid', () => {
      const range = getContractLengthRange(AtBContractType.DIVERSIONARY_RAID);
      expect(range).toEqual({ min: 2, max: 3 });
    });

    it('should return correct range for Guerrilla Warfare', () => {
      const range = getContractLengthRange(AtBContractType.GUERRILLA_WARFARE);
      expect(range).toEqual({ min: 18, max: 29 });
    });

    it('should return correct range for Cadre Duty', () => {
      const range = getContractLengthRange(AtBContractType.CADRE_DUTY);
      expect(range).toEqual({ min: 9, max: 14 });
    });

    it('should return correct range for Riot Duty', () => {
      const range = getContractLengthRange(AtBContractType.RIOT_DUTY);
      expect(range).toEqual({ min: 3, max: 4 });
    });

    it('should return correct range for Security Duty', () => {
      const range = getContractLengthRange(AtBContractType.SECURITY_DUTY);
      expect(range).toEqual({ min: 5, max: 7 });
    });

    it('should return correct range for Retainer', () => {
      const range = getContractLengthRange(AtBContractType.RETAINER);
      expect(range).toEqual({ min: 9, max: 14 });
    });

    it('should return correct range for Objective Raid', () => {
      const range = getContractLengthRange(AtBContractType.OBJECTIVE_RAID);
      expect(range).toEqual({ min: 2, max: 3 });
    });

    it('should return correct range for Recon Raid', () => {
      const range = getContractLengthRange(AtBContractType.RECON_RAID);
      expect(range).toEqual({ min: 2, max: 3 });
    });

    it('should return correct range for Extraction Raid', () => {
      const range = getContractLengthRange(AtBContractType.EXTRACTION_RAID);
      expect(range).toEqual({ min: 2, max: 3 });
    });

    it('should return correct range for Assassination', () => {
      const range = getContractLengthRange(AtBContractType.ASSASSINATION);
      expect(range).toEqual({ min: 2, max: 3 });
    });

    it('should return correct range for Observation Raid', () => {
      const range = getContractLengthRange(AtBContractType.OBSERVATION_RAID);
      expect(range).toEqual({ min: 2, max: 3 });
    });

    it('should return correct range for Espionage', () => {
      const range = getContractLengthRange(AtBContractType.ESPIONAGE);
      expect(range).toEqual({ min: 9, max: 14 });
    });

    it('should return correct range for Sabotage', () => {
      const range = getContractLengthRange(AtBContractType.SABOTAGE);
      expect(range).toEqual({ min: 18, max: 29 });
    });

    it('should return correct range for Terrorism', () => {
      const range = getContractLengthRange(AtBContractType.TERRORISM);
      expect(range).toEqual({ min: 2, max: 3 });
    });

    it('should return correct range for Planetary Assault', () => {
      const range = getContractLengthRange(AtBContractType.PLANETARY_ASSAULT);
      expect(range).toEqual({ min: 7, max: 11 });
    });

    it('should return correct range for Relief Duty', () => {
      const range = getContractLengthRange(AtBContractType.RELIEF_DUTY);
      expect(range).toEqual({ min: 7, max: 11 });
    });

    it('should return correct range for Pirate Hunting', () => {
      const range = getContractLengthRange(AtBContractType.PIRATE_HUNTING);
      expect(range).toEqual({ min: 5, max: 7 });
    });

    it('should return correct range for Mole Hunting', () => {
      const range = getContractLengthRange(AtBContractType.MOLE_HUNTING);
      expect(range).toEqual({ min: 5, max: 7 });
    });

    it('should return valid ranges for all 19 types', () => {
      const allTypes = Object.values(AtBContractType);
      allTypes.forEach((type) => {
        const range = getContractLengthRange(type);
        expect(range.min).toBeGreaterThan(0);
        expect(range.max).toBeGreaterThanOrEqual(range.min);
      });
    });
  });
});
