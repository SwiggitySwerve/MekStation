import { RandomEventCategory, RandomEventSeverity } from '@/types/campaign/events/randomEventTypes';
import { processGrayMonday, GRAY_MONDAY, _resetGrayMondayCounter } from '@/lib/campaign/events/grayMonday';

describe('grayMonday', () => {
  beforeEach(() => {
    _resetGrayMondayCounter();
  });

  describe('GRAY_MONDAY constants', () => {
    it('should export GRAY_MONDAY with correct dates', () => {
      expect(GRAY_MONDAY.START).toEqual({ year: 3132, month: 8, day: 3 });
      expect(GRAY_MONDAY.BANKRUPTCY).toEqual({ year: 3132, month: 8, day: 9 });
      expect(GRAY_MONDAY.EMPLOYER_BEGGING).toEqual({ year: 3132, month: 8, day: 10 });
      expect(GRAY_MONDAY.END).toEqual({ year: 3132, month: 8, day: 12 });
    });
  });

  describe('processGrayMonday - disabled', () => {
    it('should return null when simulateGrayMonday is false', () => {
      const event = processGrayMonday('3132-08-03', false, 1000000);
      expect(event).toBeNull();
    });

    it('should return null for any date when simulateGrayMonday is false', () => {
      const event = processGrayMonday('3132-08-09', false, 1000000);
      expect(event).toBeNull();
    });
  });

  describe('processGrayMonday - start event', () => {
    it('should return start event on 3132-08-03', () => {
      const event = processGrayMonday('3132-08-03', true, 1000000);

      expect(event).toBeDefined();
      expect(event?.title).toBe('Gray Monday Begins');
      expect(event?.category).toBe(RandomEventCategory.HISTORICAL);
      expect(event?.severity).toBe(RandomEventSeverity.CRITICAL);
      expect(event?.timestamp).toBe('3132-08-03');
    });

    it('should have notification effect for start event', () => {
      const event = processGrayMonday('3132-08-03', true, 1000000);

      expect(event?.effects).toContainEqual(
        expect.objectContaining({
          type: 'notification',
          message: 'HPG network failures detected across the Inner Sphere',
          severity: 'critical',
        })
      );
    });
  });

  describe('processGrayMonday - bankruptcy event', () => {
    it('should return bankruptcy event on 3132-08-09', () => {
      const event = processGrayMonday('3132-08-09', true, 1000000);

      expect(event).toBeDefined();
      expect(event?.title).toBe('Gray Monday - Financial Collapse');
      expect(event?.category).toBe(RandomEventCategory.HISTORICAL);
      expect(event?.severity).toBe(RandomEventSeverity.CRITICAL);
      expect(event?.timestamp).toBe('3132-08-09');
    });

    it('should calculate 99% balance loss correctly', () => {
      const balance = 1000000;
      const event = processGrayMonday('3132-08-09', true, balance);

      const expectedLoss = Math.floor(balance * 0.99);
      expect(event?.effects).toContainEqual(
        expect.objectContaining({
          type: 'financial',
          amount: -expectedLoss,
          description: 'Gray Monday bankruptcy - 99% balance seized',
        })
      );
    });

    it('should handle different balance amounts', () => {
      const balance = 500000;
      const event = processGrayMonday('3132-08-09', true, balance);

      const expectedLoss = Math.floor(balance * 0.99);
      expect(event?.effects).toContainEqual(
        expect.objectContaining({
          type: 'financial',
          amount: -expectedLoss,
        })
      );
    });

    it('should handle zero balance', () => {
      const event = processGrayMonday('3132-08-09', true, 0);

      expect(event?.effects).toContainEqual(
        expect.objectContaining({
          type: 'financial',
          amount: -0,
        })
      );
    });

    it('should handle small balance amounts', () => {
      const balance = 100;
      const event = processGrayMonday('3132-08-09', true, balance);

      const expectedLoss = Math.floor(balance * 0.99);
      expect(event?.effects).toContainEqual(
        expect.objectContaining({
          type: 'financial',
          amount: -expectedLoss,
        })
      );
    });
  });

  describe('processGrayMonday - employer begging event', () => {
    it('should return employer begging event on 3132-08-10', () => {
      const event = processGrayMonday('3132-08-10', true, 1000000);

      expect(event).toBeDefined();
      expect(event?.title).toBe('Gray Monday - Employer Begging');
      expect(event?.category).toBe(RandomEventCategory.HISTORICAL);
      expect(event?.severity).toBe(RandomEventSeverity.CRITICAL);
      expect(event?.timestamp).toBe('3132-08-10');
    });

    it('should have notification effect for employer begging event', () => {
      const event = processGrayMonday('3132-08-10', true, 1000000);

      expect(event?.effects).toContainEqual(
        expect.objectContaining({
          type: 'notification',
          message: 'Contract payments suspended - employer cannot pay',
          severity: 'critical',
        })
      );
    });
  });

  describe('processGrayMonday - end event', () => {
    it('should return end event on 3132-08-12', () => {
      const event = processGrayMonday('3132-08-12', true, 1000000);

      expect(event).toBeDefined();
      expect(event?.title).toBe('Gray Monday Ends');
      expect(event?.category).toBe(RandomEventCategory.HISTORICAL);
      expect(event?.severity).toBe(RandomEventSeverity.MAJOR);
      expect(event?.timestamp).toBe('3132-08-12');
    });

    it('should have notification effect for end event', () => {
      const event = processGrayMonday('3132-08-12', true, 1000000);

      expect(event?.effects).toContainEqual(
        expect.objectContaining({
          type: 'notification',
          message: 'Gray Monday crisis period ends',
          severity: 'warning',
        })
      );
    });
  });

  describe('processGrayMonday - non-event dates', () => {
    it('should return null for dates outside Gray Monday period', () => {
      const event = processGrayMonday('3132-08-01', true, 1000000);
      expect(event).toBeNull();
    });

    it('should return null for dates between events', () => {
      const event = processGrayMonday('3132-08-05', true, 1000000);
      expect(event).toBeNull();
    });

    it('should return null for dates after Gray Monday ends', () => {
      const event = processGrayMonday('3132-08-15', true, 1000000);
      expect(event).toBeNull();
    });

    it('should return null for different month', () => {
      const event = processGrayMonday('3132-07-03', true, 1000000);
      expect(event).toBeNull();
    });

    it('should return null for different year', () => {
      const event = processGrayMonday('3131-08-03', true, 1000000);
      expect(event).toBeNull();
    });
  });

  describe('event IDs', () => {
    it('should generate unique event IDs', () => {
      const event1 = processGrayMonday('3132-08-03', true, 1000000);
      const event2 = processGrayMonday('3132-08-09', true, 1000000);

      expect(event1?.id).not.toBe(event2?.id);
    });
  });
});
