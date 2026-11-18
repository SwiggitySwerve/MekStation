/**
 * T1: launch manifests of battles that never produced an outcome are pruned
 * once the same mission/scenario is launched again, or once they are older
 * than the retained-outcome window in CAMPAIGN days. A pending match keeps
 * its manifest regardless.
 */
import { APPLIED_OUTCOME_RETENTION_DAYS } from '../appliedOutcomes';
import { prunePendingBattleUnitManifests } from '../battleUnitManifest';

const units = { 'player-1-atlas-as7-d': { rosterUnitId: 'roster-1' } };

function entry(recordedOn: string, launchKey: string | null) {
  return { units, recordedOn, launchKey };
}

const ASOF = new Date('3025-06-15T00:00:00.000Z');

describe('prunePendingBattleUnitManifests', () => {
  it('uses the 31-day retained-outcome window', () => {
    expect(APPLIED_OUTCOME_RETENTION_DAYS).toBe(31);
  });

  it('prunes a non-pending entry older than the window and keeps one at the edge', () => {
    const manifests = {
      old: entry('3025-05-14T00:00:00.000Z', 'scn-a'), // 32 days
      edge: entry('3025-05-15T00:00:00.000Z', 'scn-b'), // 31 days
    };
    expect(
      prunePendingBattleUnitManifests(manifests, {
        pendingMatchIds: new Set(),
        asOf: ASOF,
      }),
    ).toEqual({ edge: manifests.edge });
  });

  it('never prunes a pending match, however old or relaunched', () => {
    const manifests = { pending: entry('3024-01-01T00:00:00.000Z', 'scn-a') };
    expect(
      prunePendingBattleUnitManifests(manifests, {
        pendingMatchIds: new Set(['pending']),
        asOf: ASOF,
        relaunch: { launchKey: 'scn-a', matchId: 'new' },
      }),
    ).toBe(manifests);
  });

  it('prunes non-pending entries of a relaunched mission or scenario only', () => {
    const manifests = {
      abandoned: entry('3025-06-14T00:00:00.000Z', 'scn-a'),
      other: entry('3025-06-14T00:00:00.000Z', 'scn-b'),
      unkeyed: entry('3025-06-14T00:00:00.000Z', null),
      relaunch: entry('3025-06-15T00:00:00.000Z', 'scn-a'),
    };
    expect(
      prunePendingBattleUnitManifests(manifests, {
        pendingMatchIds: new Set(),
        asOf: ASOF,
        relaunch: { launchKey: 'scn-a', matchId: 'relaunch' },
      }),
    ).toEqual({
      other: manifests.other,
      unkeyed: manifests.unkeyed,
      relaunch: manifests.relaunch,
    });
  });

  it('returns the same object when nothing is pruned', () => {
    const manifests = { fresh: entry('3025-06-14T00:00:00.000Z', 'scn-a') };
    expect(
      prunePendingBattleUnitManifests(manifests, {
        pendingMatchIds: new Set(),
        asOf: ASOF,
      }),
    ).toBe(manifests);
  });
});
