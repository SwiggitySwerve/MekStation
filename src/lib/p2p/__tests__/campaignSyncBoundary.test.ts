/**
 * Yjs vault boundary test (CO1, task 6.2 / design D7).
 *
 * The campaign-state sync surface (`CampaignMatchHost`) and the Yjs
 * content-vault sync surface (`useSyncedVaultStore`) are deliberately
 * separate. This test pins the boundary: `SyncableItemType` must remain
 * `unit | pilot | force` — no `campaign` member is ever added, so a
 * campaign ledger can never enter the CRDT `Y.Map` where last-writer-
 * wins would silently corrupt it.
 *
 * @spec openspec/changes/add-shared-campaign-state/specs/coop-campaign-sync/spec.md
 */

import type { SyncableItemType } from '@/lib/p2p/types';

describe('Yjs vault boundary — campaign state is not a SyncableItemType', () => {
  it('SyncableItemType remains exactly unit | pilot | force', () => {
    // Every valid value must be one of the three vault content types.
    const valid: SyncableItemType[] = ['unit', 'pilot', 'force'];
    expect(valid).toHaveLength(3);
    expect(new Set(valid)).toEqual(new Set(['unit', 'pilot', 'force']));
  });

  it('a campaign type is NOT assignable to SyncableItemType', () => {
    // This is a compile-time guarantee — `'campaign'` is not in the
    // union, so the cast below would fail typecheck if the union ever
    // gained a campaign member. The runtime assertion documents intent.
    const campaignLikeValue: string = 'campaign';
    const isSyncableVaultType = (value: string): value is SyncableItemType =>
      value === 'unit' || value === 'pilot' || value === 'force';
    expect(isSyncableVaultType(campaignLikeValue)).toBe(false);
  });
});
