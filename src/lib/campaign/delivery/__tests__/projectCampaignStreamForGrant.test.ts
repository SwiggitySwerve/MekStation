/**
 * projectCampaignStreamForGrant contract (design D4, task 3.2).
 *
 * Pins: team/player exact membership; sequence reuse and cursor paging;
 * stale-epoch after grant-set change; revoked grants refused at
 * membership rather than by an empty filter; broken grant store is
 * unavailable, never an empty page.
 */

import {
  AuthorizedViewerError,
  AuthorizedViewerResolver,
  mintVerifiedPrincipal,
} from '@/lib/multiplayer/server/authorization/AuthorizedViewer';
import { SQLiteDeliveryEpochStore } from '@/lib/multiplayer/server/delivery/SQLiteDeliveryEpochStore';
import { getSQLiteService } from '@/services/persistence/SQLiteService';

import { DELIVERY_EPOCH_STALE_MESSAGE } from '../campaignDeliveryTypes';
import {
  CampaignGrantMembershipSource,
  MembershipSourceUnavailableError,
} from '../CampaignGrantMembershipSource';
import { projectCampaignStreamForGrant } from '../projectCampaignStreamForGrant';
import {
  BrokenCampaignGrantStore,
  ISSUED_AT,
  PARTICIPANT_PLAYER,
  REVOKED_AT,
  appendScopeScript,
  closeCampaignDeliveryHarness,
  issueTestGrant,
  mappingCount,
  mintGrantPrincipal,
  openCampaignDeliveryHarness,
} from './grantProjectionHarness';

const TEAM_SCRIPT: readonly {
  readonly scope:
    | 'team:alpha'
    | 'team:bravo'
    | 'player:p1'
    | 'team:alpha-2'
    | 'campaign';
  readonly reason: string;
}[] = [
  { scope: 'team:alpha', reason: 'TEAM-ALPHA-ONE' },
  { scope: 'team:bravo', reason: 'TEAM-BRAVO-SECRET' },
  { scope: 'player:p1', reason: 'PLAYER-P1-SECRET' },
  { scope: 'team:alpha-2', reason: 'TEAM-ALPHA-2-SECRET' },
  { scope: 'campaign', reason: 'CAMPAIGN-LEDGER' },
  { scope: 'team:alpha', reason: 'TEAM-ALPHA-TWO' },
];

describe('projectCampaignStreamForGrant', () => {
  let harness: Awaited<ReturnType<typeof openCampaignDeliveryHarness>>;

  beforeEach(async () => {
    harness = await openCampaignDeliveryHarness();
  });

  afterEach(async () => {
    await closeCampaignDeliveryHarness(harness);
  });

  it('matches team:alpha exactly and withholds bravo, player, prefix, and campaign', async () => {
    const campaignId = 'campaign-team-scope';
    const grant = issueTestGrant(harness, {
      campaignId,
      participantId: PARTICIPANT_PLAYER,
      scopes: ['team:alpha'],
    });
    await appendScopeScript(harness, campaignId, TEAM_SCRIPT);

    const page = await projectCampaignStreamForGrant(harness.deps, {
      principal: mintGrantPrincipal(PARTICIPANT_PLAYER),
      grantId: grant.grantId,
      cursor: null,
    });
    expect(page.kind).toBe('page');
    if (page.kind !== 'page') return;
    expect(
      page.items.map(function (item) {
        return item.deliverySequence;
      }),
    ).toEqual([1, 2]);
    expect(
      page.items.map(function (item) {
        return item.event.scope;
      }),
    ).toEqual(['team:alpha', 'team:alpha']);
    const serialized = JSON.stringify(page);
    expect(serialized).toContain('TEAM-ALPHA-ONE');
    expect(serialized).toContain('TEAM-ALPHA-TWO');
    expect(serialized).not.toContain('TEAM-BRAVO-SECRET');
    expect(serialized).not.toContain('PLAYER-P1-SECRET');
    expect(serialized).not.toContain('TEAM-ALPHA-2-SECRET');
    expect(serialized).not.toContain('CAMPAIGN-LEDGER');
  });

  it('reuses sequences on reconnect and pages by cursor without renumbering', async () => {
    const campaignId = 'campaign-sequence-stable';
    const grant = issueTestGrant(harness, {
      campaignId,
      participantId: PARTICIPANT_PLAYER,
      scopes: ['campaign'],
    });
    await appendScopeScript(harness, campaignId, [
      { scope: 'campaign', reason: 'ONE' },
      { scope: 'gm', reason: 'HIDDEN' },
      { scope: 'campaign', reason: 'TWO' },
      { scope: 'campaign', reason: 'THREE' },
    ]);
    const principal = mintGrantPrincipal(PARTICIPANT_PLAYER);
    const first = await projectCampaignStreamForGrant(harness.deps, {
      principal,
      grantId: grant.grantId,
      cursor: null,
    });
    expect(first.kind).toBe('page');
    if (first.kind !== 'page') return;
    expect(
      first.items.map(function (item) {
        return item.deliverySequence;
      }),
    ).toEqual([1, 2, 3]);
    const rowsAfterFirst = mappingCount(first.deliveryEpochId);

    const retry = await projectCampaignStreamForGrant(harness.deps, {
      principal,
      grantId: grant.grantId,
      cursor: null,
    });
    expect(retry.kind).toBe('page');
    if (retry.kind !== 'page') return;
    expect(JSON.stringify(retry.items)).toBe(JSON.stringify(first.items));
    expect(retry.deliveryEpochId).toBe(first.deliveryEpochId);
    expect(mappingCount(retry.deliveryEpochId)).toBe(rowsAfterFirst);

    const paged = await projectCampaignStreamForGrant(harness.deps, {
      principal,
      grantId: grant.grantId,
      cursor: {
        deliveryEpochId: first.deliveryEpochId,
        afterSequence: 1,
      },
    });
    expect(paged.kind).toBe('page');
    if (paged.kind !== 'page') return;
    expect(
      paged.items.map(function (item) {
        return item.deliverySequence;
      }),
    ).toEqual([2, 3]);
    expect(
      paged.items.map(function (item) {
        return item.event.payload;
      }),
    ).toEqual([
      { delta: 0, reason: 'TWO', balance: 1 },
      { delta: 0, reason: 'THREE', balance: 1 },
    ]);
    expect(mappingCount(first.deliveryEpochId)).toBe(rowsAfterFirst);

    const staleForeign = await projectCampaignStreamForGrant(harness.deps, {
      principal,
      grantId: grant.grantId,
      cursor: {
        deliveryEpochId: 'a'.repeat(32),
        afterSequence: 0,
      },
    });
    expect(staleForeign.kind).toBe('stale-epoch');
    if (staleForeign.kind !== 'stale-epoch') return;
    expect(staleForeign.message).toBe(DELIVERY_EPOCH_STALE_MESSAGE);
    expect(staleForeign.newBaseline.deliveryEpochId).toBe(
      first.deliveryEpochId,
    );
    expect('items' in staleForeign).toBe(false);
    expect(mappingCount(first.deliveryEpochId)).toBe(rowsAfterFirst);
  });

  it('returns stale-epoch with a fresh baseline after revoke and reissue', async () => {
    const campaignId = 'campaign-epoch-move';
    const firstGrant = issueTestGrant(harness, {
      campaignId,
      participantId: PARTICIPANT_PLAYER,
      scopes: ['campaign'],
    });
    await appendScopeScript(harness, campaignId, [
      { scope: 'campaign', reason: 'BEFORE' },
    ]);
    const principal = mintGrantPrincipal(PARTICIPANT_PLAYER);
    const delivered = await projectCampaignStreamForGrant(harness.deps, {
      principal,
      grantId: firstGrant.grantId,
      cursor: null,
    });
    expect(delivered.kind).toBe('page');
    if (delivered.kind !== 'page') return;
    const oldCursor = {
      deliveryEpochId: delivered.deliveryEpochId,
      afterSequence: 0,
    };
    const rowsBefore = mappingCount(delivered.deliveryEpochId);

    harness.grantStore.revokeGrant(firstGrant.grantId, REVOKED_AT);
    const secondGrant = issueTestGrant(harness, {
      campaignId,
      participantId: PARTICIPANT_PLAYER,
      scopes: ['gm', 'campaign'],
    });
    const stale = await projectCampaignStreamForGrant(harness.deps, {
      principal,
      grantId: secondGrant.grantId,
      cursor: oldCursor,
    });
    expect(stale).toEqual({
      kind: 'stale-epoch',
      message: DELIVERY_EPOCH_STALE_MESSAGE,
      newBaseline: expect.objectContaining({
        deliveryEpochId: expect.stringMatching(/^[0-9a-f]{32}$/),
      }),
    });
    if (stale.kind !== 'stale-epoch') return;
    expect(stale.newBaseline.deliveryEpochId).not.toBe(
      delivered.deliveryEpochId,
    );
    expect('items' in stale).toBe(false);
    expect(mappingCount(delivered.deliveryEpochId)).toBe(rowsBefore);
    expect(mappingCount(stale.newBaseline.deliveryEpochId)).toBe(0);

    const resumed = await projectCampaignStreamForGrant(harness.deps, {
      principal,
      grantId: secondGrant.grantId,
      cursor: {
        deliveryEpochId: stale.newBaseline.deliveryEpochId,
        afterSequence: 0,
      },
    });
    expect(resumed.kind).toBe('page');
    if (resumed.kind !== 'page') return;
    expect(resumed.deliveryEpochId).toBe(stale.newBaseline.deliveryEpochId);
    expect(resumed.items[0]?.deliverySequence).toBe(1);
  });

  it('refuses a revoked grant at membership, distinct from an empty page', async () => {
    const campaignId = 'campaign-revoked-vs-empty';
    const revokedGrant = issueTestGrant(harness, {
      campaignId,
      participantId: PARTICIPANT_PLAYER,
      scopes: ['campaign'],
    });
    const emptyScopeGrant = issueTestGrant(harness, {
      campaignId: 'campaign-empty-filter',
      participantId: 'participant-empty',
      scopes: ['team:alpha'],
    });
    await appendScopeScript(harness, 'campaign-empty-filter', [
      { scope: 'campaign', reason: 'NOT-TEAM' },
      { scope: 'gm', reason: 'NOT-TEAM-GM' },
    ]);

    const emptyPage = await projectCampaignStreamForGrant(harness.deps, {
      principal: mintGrantPrincipal('participant-empty'),
      grantId: emptyScopeGrant.grantId,
      cursor: null,
    });
    expect(emptyPage.kind).toBe('page');
    if (emptyPage.kind !== 'page') return;
    expect(emptyPage.items).toEqual([]);

    harness.grantStore.revokeGrant(revokedGrant.grantId, REVOKED_AT);
    expect(
      await harness.membership.lookupMembership(PARTICIPANT_PLAYER, campaignId),
    ).toBeNull();
    await expect(
      harness.resolver.resolve(
        mintVerifiedPrincipal(PARTICIPANT_PLAYER),
        campaignId,
      ),
    ).rejects.toBeInstanceOf(AuthorizedViewerError);

    const refused = await projectCampaignStreamForGrant(harness.deps, {
      principal: mintGrantPrincipal(PARTICIPANT_PLAYER),
      grantId: revokedGrant.grantId,
      cursor: null,
    });
    expect(refused).toEqual({
      kind: 'refused',
      reason: 'no-active-membership',
    });
    expect(refused.kind).not.toBe(emptyPage.kind);
  });

  it('surfaces unavailable from a broken grant store rather than an empty page', async () => {
    const brokenStore = new BrokenCampaignGrantStore();
    const brokenMembership = new CampaignGrantMembershipSource(
      brokenStore,
      function () {
        return ISSUED_AT;
      },
    );
    const brokenDeps = {
      grantStore: brokenStore,
      viewerResolver: new AuthorizedViewerResolver(brokenMembership),
      journal: harness.journal,
      deliveryStore: new SQLiteDeliveryEpochStore(
        getSQLiteService().getDatabase(),
        function () {
          return ISSUED_AT;
        },
      ),
      clock: function () {
        return ISSUED_AT;
      },
    };
    await expect(
      projectCampaignStreamForGrant(brokenDeps, {
        principal: mintGrantPrincipal(PARTICIPANT_PLAYER),
        grantId: 'aa'.repeat(16),
        cursor: null,
      }),
    ).rejects.toBeInstanceOf(MembershipSourceUnavailableError);
    await expect(
      brokenMembership.lookupMembership(PARTICIPANT_PLAYER, 'campaign-x'),
    ).rejects.toBeInstanceOf(MembershipSourceUnavailableError);
  });
});
