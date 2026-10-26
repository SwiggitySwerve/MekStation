import { createEmptyValidationCounts } from '@/utils/validation/validationNavigation';

import type { ValidationNote } from '../buildStatusSummary';

import {
  BUILD_STATUS_GROUPS,
  addStatusNotesToTabCounts,
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
    const summary = getBuildStatusSummary(counts(1, 1, 1), []);
    expect(summary.state).toBe('error');
    expect(summary.legal).toBe(false);
    expect(summary.verdict).toBe('Not legal');
    expect(summary.headline).toBe('1 error \u00b7 1 warning \u00b7 1 note');
    expect(summary.panelHeading).toBe(
      'Not legal \u00b7 1 error \u00b7 1 warning \u00b7 1 note',
    );
    expect(summary.parts.map((part) => [part.kind, part.count])).toEqual([
      ['error', 1],
      ['warning', 1],
      ['note', 1],
    ]);
  });

  it('counts running hot with the warnings, never as an error or a note', () => {
    const summary = getBuildStatusSummary(counts(1, 1), [hot]);
    expect(summary.state).toBe('error');
    expect(summary.headline).toBe('1 error \u00b7 2 warnings');
    expect(summary.parts.map((part) => part.kind)).toEqual([
      'error',
      'warning',
    ]);
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
  });

  it('reads a lone readout warning as itself', () => {
    const summary = getBuildStatusSummary(counts(), [hot]);
    expect(summary.state).toBe('warning');
    expect(summary.legal).toBe(true);
    expect(summary.headline).toBe('Runs hot +26');
    expect(summary.headlineNote).toBe(hot);
    expect(summary.panelHeading).toBe('Legal \u00b7 Runs hot +26');
  });

  it('counts info rule results as notes, apart from readout warnings', () => {
    expect(getBuildStatusSummary(counts(0, 0, 2), []).headline).toBe('2 notes');
    const summary = getBuildStatusSummary(counts(0, 0, 1), [hot]);
    expect(summary.state).toBe('warning');
    expect(summary.headline).toBe('1 warning \u00b7 1 note');
    expect(summary.headlineNote).toBeUndefined();
  });

  it('counts a lone rule warning in words, not as a readout', () => {
    const summary = getBuildStatusSummary(counts(0, 1), []);
    expect(summary.headline).toBe('1 warning');
    expect(summary.headlineNote).toBeUndefined();
  });

  it('reads ready when nothing is listed', () => {
    const summary = getBuildStatusSummary(counts(), []);
    expect(summary.state).toBe('ready');
    expect(summary.parts).toEqual([]);
    expect(summary.headline).toBe('Ready');
    expect(summary.verdict).toBe('Legal');
    expect(summary.panelHeading).toBe('Legal \u00b7 Ready');
  });

  it('takes its readout warnings from the readout owner', () => {
    expect(getStatusNotes(20, 22)).toEqual([]);
    expect(getStatusNotes(48, 22)).toEqual([hot]);
  });
});

describe('addStatusNotesToTabCounts', () => {
  it('adds each readout warning to the tab where it is fixed', () => {
    const base = createEmptyValidationCounts();
    base.equipment.errors = 1;
    const hot = getHeatNote(48, 22);
    if (!hot) throw new Error('expected a heat warning');
    const next = addStatusNotesToTabCounts(base, [hot]);
    expect(next.structure.warnings).toBe(1);
    expect(next.equipment.errors).toBe(1);
    expect(base.structure.warnings).toBe(0);
  });

  it('returns the same counts when there are no readout warnings', () => {
    const base = createEmptyValidationCounts();
    expect(addStatusNotesToTabCounts(base, [])).toBe(base);
  });
});
