/**
 * T1: launch manifests of battles that never produced an outcome are pruned
 * once they are older than the retained-outcome window in CAMPAIGN days. A
 * relaunch of the same mission prunes nothing: the earlier battle may still
 * be in progress. A pending match keeps its manifest regardless.
 */
import { APPLIED_OUTCOME_RETENTION_DAYS } from '../appliedOutcomes';
import { prunePendingBattleUnitManifests } from '../battleUnitManifest';

const units = { 'player-1-atlas-as7-d': { rosterUnitId: 'roster-1' } };

function entry(recordedOn: string) {
  return { units, complete: true, recordedOn };
}

const ASOF = new Date('3025-06-15T00:00:00.000Z');

describe('prunePendingBattleUnitManifests', () => {
  it('uses the 31-day retained-outcome window', () => {
    expect(APPLIED_OUTCOME_RETENTION_DAYS).toBe(31);
  });

  it('prunes a non-pending entry older than the window and keeps one at the edge', () => {
    const manifests = {
      old: entry('3025-05-14T00:00:00.000Z'), // 32 days
      edge: entry('3025-05-15T00:00:00.000Z'), // 31 days
    };
    expect(
      prunePendingBattleUnitManifests(manifests, {
        pendingMatchIds: new Set(),
        asOf: ASOF,
      }),
    ).toEqual({ edge: manifests.edge });
  });

  it('never prunes a pending match, however old', () => {
    const manifests = { pending: entry('3024-01-01T00:00:00.000Z') };
    expect(
      prunePendingBattleUnitManifests(manifests, {
        pendingMatchIds: new Set(['pending']),
        asOf: ASOF,
      }),
    ).toBe(manifests);
  });

  it('returns the same object when nothing is pruned', () => {
    const manifests = { fresh: entry('3025-06-14T00:00:00.000Z') };
    expect(
      prunePendingBattleUnitManifests(manifests, {
        pendingMatchIds: new Set(),
        asOf: ASOF,
      }),
    ).toBe(manifests);
  });
});
