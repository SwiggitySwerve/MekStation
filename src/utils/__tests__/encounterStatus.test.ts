/**
 * @file encounterStatus.test.ts
 * @description Tests for encounter status utility functions
 */

import { EncounterStatus } from '@/types/encounter';

import {
  getStatusColor,
  getStatusLabel,
  StatusBadgeColor,
} from '../encounterStatus';

describe('encounterStatus', () => {
  describe('getStatusColor', () => {
    it('returns "slate" for Draft status', () => {
      const result = getStatusColor(EncounterStatus.Draft);
      expect(result).toBe('slate');
    });

    it('returns "success" for Ready status', () => {
      const result = getStatusColor(EncounterStatus.Ready);
      expect(result).toBe('success');
    });

    it('returns "info" for Launched status', () => {
      const result = getStatusColor(EncounterStatus.Launched);
      expect(result).toBe('info');
    });

    it('returns "slate" for Completed status', () => {
      const result = getStatusColor(EncounterStatus.Completed);
      expect(result).toBe('slate');
    });

    it('returns "slate" as default for unknown status values', () => {
      // Test with an invalid status value cast to EncounterStatus
      const unknownStatus = 'unknown_status' as EncounterStatus;
      const result = getStatusColor(unknownStatus);
      expect(result).toBe('slate');
    });

    it('returns valid StatusBadgeColor type for all statuses', () => {
      const validColors: StatusBadgeColor[] = [
        'slate',
        'success',
        'warning',
        'info',
      ];

      Object.values(EncounterStatus).forEach((status) => {
        const color = getStatusColor(status);
        expect(validColors).toContain(color);
      });
    });

    it('handles all EncounterStatus enum values', () => {
      // Verify we handle all current enum values
      const statusColorMap: Record<EncounterStatus, StatusBadgeColor> = {
        [EncounterStatus.Draft]: 'slate',
        [EncounterStatus.Ready]: 'success',
        [EncounterStatus.Launched]: 'info',
        [EncounterStatus.Completed]: 'slate',
      };

      Object.entries(statusColorMap).forEach(([status, expectedColor]) => {
        expect(getStatusColor(status as EncounterStatus)).toBe(expectedColor);
      });
    });
  });

  describe('getStatusLabel', () => {
    describe('with verbose=false (default)', () => {
      it('returns "Draft" for Draft status', () => {
        const result = getStatusLabel(EncounterStatus.Draft);
        expect(result).toBe('Draft');
      });

      it('returns "Ready" for Ready status', () => {
        const result = getStatusLabel(EncounterStatus.Ready);
        expect(result).toBe('Ready');
      });

      it('returns "In Progress" for Launched status', () => {
        const result = getStatusLabel(EncounterStatus.Launched);
        expect(result).toBe('In Progress');
      });

      it('returns "Completed" for Completed status', () => {
        const result = getStatusLabel(EncounterStatus.Completed);
        expect(result).toBe('Completed');
      });

      it('returns the status value itself for unknown status', () => {
        const unknownStatus = 'some_unknown' as EncounterStatus;
        const result = getStatusLabel(unknownStatus);
        expect(result).toBe('some_unknown');
      });
    });

    describe('with verbose=true', () => {
      it('returns "Draft" for Draft status (same as non-verbose)', () => {
        const result = getStatusLabel(EncounterStatus.Draft, true);
        expect(result).toBe('Draft');
      });

      it('returns "Ready to Launch" for Ready status', () => {
        const result = getStatusLabel(EncounterStatus.Ready, true);
        expect(result).toBe('Ready to Launch');
      });

      it('returns "In Progress" for Launched status (same as non-verbose)', () => {
        const result = getStatusLabel(EncounterStatus.Launched, true);
        expect(result).toBe('In Progress');
      });

      it('returns "Completed" for Completed status (same as non-verbose)', () => {
        const result = getStatusLabel(EncounterStatus.Completed, true);
        expect(result).toBe('Completed');
      });
    });

    describe('verbose parameter behavior', () => {
      it('defaults verbose to false when not specified', () => {
        const withDefault = getStatusLabel(EncounterStatus.Ready);
        const withFalse = getStatusLabel(EncounterStatus.Ready, false);
        expect(withDefault).toBe(withFalse);
        expect(withDefault).toBe('Ready');
      });

      it('only Ready status differs between verbose and non-verbose', () => {
        // Check that only Ready has different verbose output
        expect(getStatusLabel(EncounterStatus.Draft, false)).toBe(
          getStatusLabel(EncounterStatus.Draft, true),
        );

        expect(getStatusLabel(EncounterStatus.Ready, false)).not.toBe(
          getStatusLabel(EncounterStatus.Ready, true),
        );

        expect(getStatusLabel(EncounterStatus.Launched, false)).toBe(
          getStatusLabel(EncounterStatus.Launched, true),
        );

        expect(getStatusLabel(EncounterStatus.Completed, false)).toBe(
          getStatusLabel(EncounterStatus.Completed, true),
        );
      });
    });

    it('returns a string for all status values', () => {
      Object.values(EncounterStatus).forEach((status) => {
        expect(typeof getStatusLabel(status)).toBe('string');
        expect(typeof getStatusLabel(status, true)).toBe('string');
        expect(typeof getStatusLabel(status, false)).toBe('string');
      });
    });

    it('returns non-empty labels for all known statuses', () => {
      Object.values(EncounterStatus).forEach((status) => {
        expect(getStatusLabel(status).length).toBeGreaterThan(0);
        expect(getStatusLabel(status, true).length).toBeGreaterThan(0);
      });
    });
  });
});
