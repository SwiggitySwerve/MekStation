/**
 * CampaignGrantMembershipSource contract (design D4, task 3.2).
 *
 * Pins: an active grant is membership; revoked, expired, or absent is
 * null; the session epoch is derived from the grant set so a scope
 * change or revocation cannot continue the old delivery epoch;
 * infrastructure failures are MembershipSourceUnavailableError.
 */

import {
  AuthorizedViewerError,
  AuthorizedViewerResolver,
  mintVerifiedPrincipal,
} from '@/lib/multiplayer/server/authorization/AuthorizedViewer';

import {
  CampaignGrantMembershipSource,
  MembershipSourceUnavailableError,
} from '../CampaignGrantMembershipSource';
import {
  BrokenCampaignGrantStore,
  EXPIRES_AT,
  ISSUED_AT,
  PARTICIPANT_GM,
  PARTICIPANT_PLAYER,
  REVOKED_AT,
  closeCampaignDeliveryHarness,
  issueTestGrant,
  openCampaignDeliveryHarness,
} from './grantProjectionHarness';

const CAMPAIGN_ID = 'campaign-membership';

describe('CampaignGrantMembershipSource', () => {
  let harness: Awaited<ReturnType<typeof openCampaignDeliveryHarness>>;

  beforeEach(async () => {
    harness = await openCampaignDeliveryHarness();
  });

  afterEach(async () => {
    await closeCampaignDeliveryHarness(harness);
  });

  it('returns a membership row for an active grant and omits scopes', async () => {
    const grant = issueTestGrant(harness, {
      campaignId: CAMPAIGN_ID,
      participantId: PARTICIPANT_PLAYER,
      scopes: ['campaign'],
    });
    const record = await harness.membership.lookupMembership(
      PARTICIPANT_PLAYER,
      CAMPAIGN_ID,
    );
    expect(record).not.toBeNull();
    if (record === null) return;
    expect(record.principalId).toBe(PARTICIPANT_PLAYER);
    expect(record.principalKind).toBe('human');
    expect(record.campaignId).toBe(CAMPAIGN_ID);
    expect(record.campaignSessionId).toBe(CAMPAIGN_ID);
    expect(record.matchId).toBeNull();
    expect(record.participantId).toBe(grant.participantId);
    expect(record.role).toBe('player');
    expect(record.ownedForceIds).toEqual([]);
    expect(record.active).toBe(true);
    expect('scopes' in record).toBe(false);
    expect('grantId' in record).toBe(false);
  });

  it('sets gm role when the active grant includes the gm scope', async () => {
    issueTestGrant(harness, {
      campaignId: CAMPAIGN_ID,
      participantId: PARTICIPANT_GM,
      scopes: ['gm', 'campaign'],
    });
    const record = await harness.membership.lookupMembership(
      PARTICIPANT_GM,
      CAMPAIGN_ID,
    );
    expect(record?.role).toBe('gm');
  });

  it('returns null for revoked, expired, or absent grants', async () => {
    const granted = issueTestGrant(harness, {
      campaignId: CAMPAIGN_ID,
      participantId: PARTICIPANT_PLAYER,
      scopes: ['campaign'],
    });
    expect(
      await harness.membership.lookupMembership('nobody', CAMPAIGN_ID),
    ).toBeNull();

    harness.grantStore.revokeGrant(granted.grantId, REVOKED_AT);
    expect(
      await harness.membership.lookupMembership(
        PARTICIPANT_PLAYER,
        CAMPAIGN_ID,
      ),
    ).toBeNull();

    issueTestGrant(harness, {
      campaignId: CAMPAIGN_ID,
      participantId: PARTICIPANT_GM,
      scopes: ['campaign'],
    });
    harness.clock.iso = EXPIRES_AT;
    expect(
      await harness.membership.lookupMembership(PARTICIPANT_GM, CAMPAIGN_ID),
    ).toBeNull();
  });

  it('changes the session epoch on revoke and on a differently scoped grant', async () => {
    const first = issueTestGrant(harness, {
      campaignId: CAMPAIGN_ID,
      participantId: PARTICIPANT_PLAYER,
      scopes: ['campaign'],
    });
    const before =
      await harness.membership.currentMembershipRevision(CAMPAIGN_ID);

    harness.grantStore.revokeGrant(first.grantId, REVOKED_AT);
    const afterRevoke =
      await harness.membership.currentMembershipRevision(CAMPAIGN_ID);
    expect(afterRevoke).not.toBe(before);

    issueTestGrant(harness, {
      campaignId: CAMPAIGN_ID,
      participantId: PARTICIPANT_PLAYER,
      scopes: ['gm', 'campaign'],
    });
    const afterReissue =
      await harness.membership.currentMembershipRevision(CAMPAIGN_ID);
    expect(afterReissue).not.toBe(afterRevoke);
    expect(afterReissue).not.toBe(before);
  });

  it('changes the session epoch when the injected clock crosses expiry', async () => {
    issueTestGrant(harness, {
      campaignId: CAMPAIGN_ID,
      participantId: PARTICIPANT_PLAYER,
      scopes: ['campaign'],
    });
    const before =
      await harness.membership.currentMembershipRevision(CAMPAIGN_ID);
    harness.clock.iso = EXPIRES_AT;
    const after =
      await harness.membership.currentMembershipRevision(CAMPAIGN_ID);
    expect(after).not.toBe(before);
  });

  it('lets the existing resolver mint a viewer only while the grant is active', async () => {
    const grant = issueTestGrant(harness, {
      campaignId: CAMPAIGN_ID,
      participantId: PARTICIPANT_PLAYER,
      scopes: ['campaign'],
    });
    const resolver = new AuthorizedViewerResolver(harness.membership);
    const viewer = await resolver.resolve(
      mintVerifiedPrincipal(PARTICIPANT_PLAYER),
      CAMPAIGN_ID,
    );
    expect(viewer.principalId).toBe(PARTICIPANT_PLAYER);
    expect(viewer.campaignSessionId).toBe(CAMPAIGN_ID);

    harness.grantStore.revokeGrant(grant.grantId, REVOKED_AT);
    await expect(
      resolver.resolve(mintVerifiedPrincipal(PARTICIPANT_PLAYER), CAMPAIGN_ID),
    ).rejects.toBeInstanceOf(AuthorizedViewerError);
    try {
      await resolver.resolve(
        mintVerifiedPrincipal(PARTICIPANT_PLAYER),
        CAMPAIGN_ID,
      );
    } catch (error) {
      expect(error).toBeInstanceOf(AuthorizedViewerError);
      if (error instanceof AuthorizedViewerError) {
        expect(error.code).toBe('no-active-membership');
      }
    }
  });

  it('surfaces MembershipSourceUnavailableError from a broken grant store', async () => {
    const broken = new CampaignGrantMembershipSource(
      new BrokenCampaignGrantStore(),
      function () {
        return ISSUED_AT;
      },
    );
    await expect(
      broken.lookupMembership(PARTICIPANT_PLAYER, CAMPAIGN_ID),
    ).rejects.toBeInstanceOf(MembershipSourceUnavailableError);
    await expect(
      broken.currentMembershipRevision(CAMPAIGN_ID),
    ).rejects.toBeInstanceOf(MembershipSourceUnavailableError);
  });

  it('does not treat a missing campaign as a thrown revocation', async () => {
    expect(
      await harness.membership.lookupMembership(PARTICIPANT_PLAYER, 'absent'),
    ).toBeNull();
    const revision =
      await harness.membership.currentMembershipRevision('absent');
    expect(Number.isSafeInteger(revision)).toBe(true);
  });
});
