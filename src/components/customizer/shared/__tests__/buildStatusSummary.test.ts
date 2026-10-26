import type { ValidationNote } from '../buildStatusSummary';

import {
  BUILD_STATUS_GROUPS,
  getBuildStatusSummary,
} from '../buildStatusSummary';
import { getHeatNote, getStatusNotes } from '../unitStatStatus';

const counts = (errorCount = 0, warningCount = 0, infoCount = 0) => ({
  errorCount,
  warningCount,
  infoCount,
});
const hot = getHeatNote(48, 22) as ValidationNote;

describe('getBuildStatusSummary', () => {
  it('names every group once, worst first, with one separator', () => {
    const summary = getBuildStatusSummary(counts(1, 1), [hot]);
    expect(summary.state).toBe('error');
    expect(summary.legal).toBe(false);
    expect(summary.headline).toBe('1 error \u00b7 1 warning \u00b7 1 note');
    expect(summary.panelHeading).toBe(
      'Not legal \u00b7 1 error \u00b7 1 warning \u00b7 1 note',
    );
    expect(summary.parts.map((part) => part.kind)).toEqual([
      'error',
      'warning',
      'note',
    ]);
    // Narrow bands: the worst group in words plus a count of the rest.
    expect(summary.short).toEqual({ text: '1 error', more: '+2' });
  });

  it('defines every group in plain words, worst first', () => {
    expect(
      BUILD_STATUS_GROUPS.map((group) => `${group.title}: ${group.definition}`),
    ).toEqual([
      'Errors: the unit is not legal until fixed',
      'Warnings: legal, but likely a mistake',
      'Notes: legal; for your information',
    ]);
  });

  it('omits empty groups and pluralises', () => {
    const summary = getBuildStatusSummary(counts(0, 3), []);
    expect(summary.state).toBe('warning');
    expect(summary.legal).toBe(true);
    expect(summary.headline).toBe('3 warnings');
    expect(summary.panelHeading).toBe('Legal \u00b7 3 warnings');
    expect(summary.short).toEqual({ text: '3 warnings', more: undefined });
  });

  it('reads a lone readout note as itself', () => {
    const summary = getBuildStatusSummary(counts(), [hot]);
    expect(summary.state).toBe('note');
    expect(summary.short).toEqual({ text: 'Runs hot +26' });
    expect(summary.headline).toBe('Runs hot +26');
    expect(summary.headlineNote).toBe(hot);
    expect(summary.panelHeading).toBe('Legal \u00b7 Runs hot +26');
  });

  it('counts info rule results as notes', () => {
    const summary = getBuildStatusSummary(counts(0, 0, 1), [hot]);
    expect(summary.state).toBe('note');
    expect(summary.headline).toBe('2 notes');
    expect(summary.headlineNote).toBeUndefined();
  });

  it('reads ready when nothing is listed', () => {
    const summary = getBuildStatusSummary(counts(), []);
    expect(summary.state).toBe('ready');
    expect(summary.parts).toEqual([]);
    expect(summary.headline).toBe('Ready');
    expect(summary.panelHeading).toBe('Legal \u00b7 Ready');
  });

  it('takes its notes from the readout owner', () => {
    expect(getStatusNotes(20, 22)).toEqual([]);
    expect(getStatusNotes(48, 22)).toEqual([hot]);
  });
});
