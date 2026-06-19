import { readFileSync } from 'fs';
import { join } from 'path';

import {
  isKnownLimitation,
  getLimitationPatternCategory,
  getLimitationCategory,
  getLimitationExplanation,
  filterKnownLimitations,
  partitionViolations,
  type IViolation,
} from '../core/knownLimitations';
import { getCombatValidationUnresolvedRefs } from '../runner/CombatValidationGapInventory';

describe('knownLimitations', () => {
  describe('getLimitationCategory', () => {
    it('should return correct category for physical attacks', () => {
      const violation: IViolation = {
        invariant: 'checkPhysicalAttack',
        severity: 'warning',
        message: 'Physical attack not available',
        context: {},
      };

      expect(getLimitationCategory(violation)).toBe('physicalAttacks');
    });

    it('should return correct category for ammo consumption', () => {
      const violation: IViolation = {
        invariant: 'checkAmmo',
        severity: 'error',
        message: 'Ammo consumption not tracked',
        context: {},
      };

      expect(getLimitationCategory(violation)).toBe('ammoConsumption');
    });

    it('should return null for actual bugs', () => {
      const violation: IViolation = {
        invariant: 'checkStateConsistency',
        severity: 'error',
        message: 'Invalid state detected',
        context: {},
      };

      expect(getLimitationCategory(violation)).toBeNull();
    });
  });

  describe('getLimitationExplanation', () => {
    it('should return explanation for known limitation', () => {
      const violation: IViolation = {
        invariant: 'checkPhysicalAttack',
        severity: 'warning',
        message: 'Physical attack not available',
        context: {},
      };

      const explanation = getLimitationExplanation(violation);
      expect(explanation).toContain('Physical attacks');
      expect(explanation).toContain('known-limitations.md');
    });

    it('should return null for actual bugs', () => {
      const violation: IViolation = {
        invariant: 'checkStateConsistency',
        severity: 'error',
        message: 'Invalid state detected',
        context: {},
      };

      expect(getLimitationExplanation(violation)).toBeNull();
    });
  });

  describe('filterKnownLimitations', () => {
    it('should filter out known limitations', () => {
      const violations: IViolation[] = [
        {
          invariant: 'checkPhysicalAttack',
          severity: 'warning',
          message: 'Physical attack not available',
          context: {},
        },
        {
          invariant: 'checkStateConsistency',
          severity: 'error',
          message: 'Invalid state detected',
          context: {},
        },
        {
          invariant: 'checkAmmo',
          severity: 'warning',
          message: 'Ammo not tracked',
          context: {},
        },
      ];

      const filtered = filterKnownLimitations(violations);

      expect(filtered).toHaveLength(1);
      expect(filtered[0].invariant).toBe('checkStateConsistency');
    });

    it('should return empty array when all are known limitations', () => {
      const violations: IViolation[] = [
        {
          invariant: 'checkPhysicalAttack',
          severity: 'warning',
          message: 'Physical attack not available',
          context: {},
        },
        {
          invariant: 'checkAmmo',
          severity: 'warning',
          message: 'Ammo not tracked',
          context: {},
        },
      ];

      const filtered = filterKnownLimitations(violations);

      expect(filtered).toHaveLength(0);
    });

    it('should return all violations when none are known limitations', () => {
      const violations: IViolation[] = [
        {
          invariant: 'checkStateConsistency',
          severity: 'error',
          message: 'Invalid state detected',
          context: {},
        },
        {
          invariant: 'checkDamageCalculation',
          severity: 'error',
          message: 'Negative armor value',
          context: {},
        },
      ];

      const filtered = filterKnownLimitations(violations);

      expect(filtered).toHaveLength(2);
    });

    it('should keep combat-validation violations even when message text matches a broad limitation', () => {
      const violations: IViolation[] = [
        {
          invariant: 'battlemech-combat-validation',
          severity: 'warning',
          message: 'Line of sight blocked by intervening terrain',
          context: {},
        },
        {
          invariant: 'checkLineOfSight',
          severity: 'warning',
          message: 'Line of sight blocked by intervening terrain',
          context: {},
        },
      ];

      const filtered = filterKnownLimitations(violations);

      expect(filtered).toEqual([violations[0]]);
    });
  });

  describe('partitionViolations', () => {
    it('should partition violations correctly', () => {
      const violations: IViolation[] = [
        {
          invariant: 'checkPhysicalAttack',
          severity: 'warning',
          message: 'Physical attack not available',
          context: {},
        },
        {
          invariant: 'checkStateConsistency',
          severity: 'error',
          message: 'Invalid state detected',
          context: {},
        },
        {
          invariant: 'checkAmmo',
          severity: 'warning',
          message: 'Ammo not tracked',
          context: {},
        },
        {
          invariant: 'checkDamageCalculation',
          severity: 'error',
          message: 'Negative armor value',
          context: {},
        },
      ];

      const { knownLimitations, potentialBugs } =
        partitionViolations(violations);

      expect(knownLimitations).toHaveLength(2);
      expect(potentialBugs).toHaveLength(2);

      expect(knownLimitations[0].invariant).toBe('checkPhysicalAttack');
      expect(knownLimitations[1].invariant).toBe('checkAmmo');

      expect(potentialBugs[0].invariant).toBe('checkStateConsistency');
      expect(potentialBugs[1].invariant).toBe('checkDamageCalculation');
    });

    it('should handle empty input', () => {
      const { knownLimitations, potentialBugs } = partitionViolations([]);

      expect(knownLimitations).toHaveLength(0);
      expect(potentialBugs).toHaveLength(0);
    });

    it('should handle all known limitations', () => {
      const violations: IViolation[] = [
        {
          invariant: 'checkPhysicalAttack',
          severity: 'warning',
          message: 'Physical attack not available',
          context: {},
        },
        {
          invariant: 'checkAmmo',
          severity: 'warning',
          message: 'Ammo not tracked',
          context: {},
        },
      ];

      const { knownLimitations, potentialBugs } =
        partitionViolations(violations);

      expect(knownLimitations).toHaveLength(2);
      expect(potentialBugs).toHaveLength(0);
    });

    it('should handle all potential bugs', () => {
      const violations: IViolation[] = [
        {
          invariant: 'checkStateConsistency',
          severity: 'error',
          message: 'Invalid state detected',
          context: {},
        },
        {
          invariant: 'checkDamageCalculation',
          severity: 'error',
          message: 'Negative armor value',
          context: {},
        },
      ];

      const { knownLimitations, potentialBugs } =
        partitionViolations(violations);

      expect(knownLimitations).toHaveLength(0);
      expect(potentialBugs).toHaveLength(2);
    });
  });
});
