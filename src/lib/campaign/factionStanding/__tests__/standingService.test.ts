/**
 * Standing Service Tests
 *
 * Tests for faction standing calculation logic including regard adjustment,
 * contract outcome processing, and daily decay.
 */

import {
  adjustRegard,
  processContractOutcome,
  processRegardDecay,
  createDefaultStanding,
} from '../standingService';
import {
  FactionStandingLevel,
  REGARD_DELTAS,
  IFactionStanding,
} from '../../../../types/campaign/factionStanding/IFactionStanding';

describe('standingService', () => {
  const testDate = new Date('2025-01-26T00:00:00Z');
  const factionId = 'faction-1';
  const employerFactionId = 'faction-employer';
  const targetFactionId = 'faction-target';

  describe('createDefaultStanding', () => {
    it('should create a neutral standing with regard 0', () => {
      const standing = createDefaultStanding(factionId);

      expect(standing.factionId).toBe(factionId);
      expect(standing.regard).toBe(0);
      expect(standing.level).toBe(FactionStandingLevel.LEVEL_4);
      expect(standing.accoladeLevel).toBe(0);
      expect(standing.censureLevel).toBe(0);
      expect(standing.history).toEqual([]);
    });
  });

  describe('adjustRegard', () => {
    it('should apply delta to regard', () => {
      const standing = createDefaultStanding(factionId);
      const delta = 5;

      const updated = adjustRegard(standing, delta, 'test', testDate);

      expect(updated.regard).toBe(5);
    });

    it('should apply regardMultiplier to delta', () => {
      const standing = createDefaultStanding(factionId);
      const delta = 10;
      const multiplier = 0.5;

      const updated = adjustRegard(standing, delta, 'test', testDate, multiplier);

      expect(updated.regard).toBe(5);
    });

    it('should clamp regard to +60 maximum', () => {
      const standing = createDefaultStanding(factionId);
      const delta = 100;

      const updated = adjustRegard(standing, delta, 'test', testDate);

      expect(updated.regard).toBe(60);
    });

    it('should clamp regard to -60 minimum', () => {
      const standing = createDefaultStanding(factionId);
      const delta = -100;

      const updated = adjustRegard(standing, delta, 'test', testDate);

      expect(updated.regard).toBe(-60);
    });

    it('should recalculate level when regard changes', () => {
      const standing = createDefaultStanding(factionId);

      const updated = adjustRegard(standing, 15, 'test', testDate);

      expect(updated.level).toBe(FactionStandingLevel.LEVEL_5);
    });

    it('should record change event in history', () => {
      const standing = createDefaultStanding(factionId);
      const delta = 5;
      const reason = 'test reason';

      const updated = adjustRegard(standing, delta, reason, testDate);

      expect(updated.history).toHaveLength(1);
      const event = updated.history[0];
      expect(event.date).toEqual(testDate);
      expect(event.delta).toBe(delta);
      expect(event.reason).toBe(reason);
      expect(event.previousRegard).toBe(0);
      expect(event.newRegard).toBe(5);
      expect(event.previousLevel).toBe(FactionStandingLevel.LEVEL_4);
      expect(event.newLevel).toBe(FactionStandingLevel.LEVEL_4);
    });

    it('should preserve previous history events', () => {
      let standing = createDefaultStanding(factionId);
      standing = adjustRegard(standing, 5, 'first', testDate);
      standing = adjustRegard(standing, 5, 'second', testDate);

      expect(standing.history).toHaveLength(2);
      expect(standing.history[0].reason).toBe('first');
      expect(standing.history[1].reason).toBe('second');
    });

    it('should handle contract success (+1.875 regard)', () => {
      const standing = createDefaultStanding(factionId);

      const updated = adjustRegard(
        standing,
        REGARD_DELTAS.CONTRACT_SUCCESS,
        'Contract Success',
        testDate
      );

      expect(updated.regard).toBe(1.875);
    });

    it('should handle contract breach (-5.156 regard)', () => {
      const standing = createDefaultStanding(factionId);

      const updated = adjustRegard(
        standing,
        REGARD_DELTAS.CONTRACT_BREACH,
        'Contract Breach',
        testDate
      );

      expect(updated.regard).toBe(-5.156);
    });
  });

  describe('processRegardDecay', () => {
    it('should move positive regard toward 0', () => {
      let standing = createDefaultStanding(factionId);
      standing = adjustRegard(standing, 10, 'initial', testDate);

      const decayed = processRegardDecay(standing, testDate);

      expect(decayed.regard).toBe(10 - REGARD_DELTAS.DAILY_DECAY);
    });

    it('should move negative regard toward 0', () => {
      let standing = createDefaultStanding(factionId);
      standing = adjustRegard(standing, -10, 'initial', testDate);

      const decayed = processRegardDecay(standing, testDate);

      expect(decayed.regard).toBe(-10 + REGARD_DELTAS.DAILY_DECAY);
    });

    it('should set regard to 0 if decay would overshoot', () => {
      let standing = createDefaultStanding(factionId);
      standing = adjustRegard(standing, 0.1, 'initial', testDate);

      const decayed = processRegardDecay(standing, testDate);

      expect(decayed.regard).toBe(0);
    });

    it('should not change regard at 0', () => {
      const standing = createDefaultStanding(factionId);

      const decayed = processRegardDecay(standing, testDate);

      expect(decayed.regard).toBe(0);
    });

    it('should record decay event in history', () => {
      let standing = createDefaultStanding(factionId);
      standing = adjustRegard(standing, 10, 'initial', testDate);

      const decayed = processRegardDecay(standing, testDate);

      expect(decayed.history.length).toBeGreaterThan(1);
      const lastEvent = decayed.history[decayed.history.length - 1];
      expect(lastEvent.reason).toContain('Daily Decay');
    });
  });

  describe('processContractOutcome', () => {
    it('should adjust employer standing by contract success delta', () => {
      const standings: Record<string, IFactionStanding> = {
        [employerFactionId]: createDefaultStanding(employerFactionId),
      };

      const updated = processContractOutcome(
        standings,
        employerFactionId,
        undefined,
        'success',
        testDate
      );

      expect(updated[employerFactionId].regard).toBe(
        REGARD_DELTAS.CONTRACT_SUCCESS
      );
    });

    it('should adjust employer standing by contract breach delta', () => {
      const standings: Record<string, IFactionStanding> = {
        [employerFactionId]: createDefaultStanding(employerFactionId),
      };

      const updated = processContractOutcome(
        standings,
        employerFactionId,
        undefined,
        'breach',
        testDate
      );

      expect(updated[employerFactionId].regard).toBe(
        REGARD_DELTAS.CONTRACT_BREACH
      );
    });

    it('should adjust employer standing by contract partial delta', () => {
      const standings: Record<string, IFactionStanding> = {
        [employerFactionId]: createDefaultStanding(employerFactionId),
      };

      const updated = processContractOutcome(
        standings,
        employerFactionId,
        undefined,
        'partial',
        testDate
      );

      expect(updated[employerFactionId].regard).toBe(
        REGARD_DELTAS.CONTRACT_PARTIAL
      );
    });

    it('should adjust employer standing by contract failure delta', () => {
      const standings: Record<string, IFactionStanding> = {
        [employerFactionId]: createDefaultStanding(employerFactionId),
      };

      const updated = processContractOutcome(
        standings,
        employerFactionId,
        undefined,
        'failure',
        testDate
      );

      expect(updated[employerFactionId].regard).toBe(
        REGARD_DELTAS.CONTRACT_FAILURE
      );
    });

    it('should adjust target faction standing when different from employer', () => {
      const standings: Record<string, IFactionStanding> = {
        [employerFactionId]: createDefaultStanding(employerFactionId),
        [targetFactionId]: createDefaultStanding(targetFactionId),
      };

      const updated = processContractOutcome(
        standings,
        employerFactionId,
        targetFactionId,
        'success',
        testDate
      );

      // Target should lose standing (negative delta with reduced magnitude)
      expect(updated[targetFactionId].regard).toBeLessThan(0);
    });

    it('should not adjust target faction if same as employer', () => {
      const standings: Record<string, IFactionStanding> = {
        [employerFactionId]: createDefaultStanding(employerFactionId),
      };

      const updated = processContractOutcome(
        standings,
        employerFactionId,
        employerFactionId,
        'success',
        testDate
      );

      // Only one adjustment (employer)
      expect(updated[employerFactionId].regard).toBe(
        REGARD_DELTAS.CONTRACT_SUCCESS
      );
    });

    it('should create target standing if not present', () => {
      const standings: Record<string, IFactionStanding> = {
        [employerFactionId]: createDefaultStanding(employerFactionId),
      };

      const updated = processContractOutcome(
        standings,
        employerFactionId,
        targetFactionId,
        'success',
        testDate
      );

      expect(updated[targetFactionId]).toBeDefined();
      expect(updated[targetFactionId].regard).toBeLessThan(0);
    });

    it('should return updated standings map', () => {
      const standings: Record<string, IFactionStanding> = {
        [employerFactionId]: createDefaultStanding(employerFactionId),
      };

      const updated = processContractOutcome(
        standings,
        employerFactionId,
        undefined,
        'success',
        testDate
      );

      expect(updated).not.toBe(standings);
      expect(updated[employerFactionId]).not.toBe(standings[employerFactionId]);
    });
  });
});
