/**
 * Resolve-or-issue idempotency for room-code guest grants (task 3.5).
 */

import {
  closeCampaignDeliveryHarness,
  EXPIRES_AT,
  ISSUED_AT,
  ISSUER_PUBLIC_KEY,
  openCampaignDeliveryHarness,
} from '@/lib/campaign/delivery/__tests__/grantProjectionHarness';

import {
  ROOM_CODE_GUEST_GRANT_SCOPES,
  resolveOrIssueRoomCodeGuestGrant,
} from '../resolveOrIssueRoomCodeGuestGrant';

const CAMPAIGN_ID = 'campaign-room-code-grant';
const PARTICIPANT = 'pid_guest';

describe('resolveOrIssueRoomCodeGuestGrant', () => {
  let harness: Awaited<ReturnType<typeof openCampaignDeliveryHarness>>;

  beforeEach(async () => {
    harness = await openCampaignDeliveryHarness();
  });

  afterEach(async () => {
    await closeCampaignDeliveryHarness(harness);
  });

  it('issues a campaign-scope grant and reuses it on rejoin', () => {
    const first = resolveOrIssueRoomCodeGuestGrant({
      grantStore: harness.grantStore,
      campaignId: CAMPAIGN_ID,
      participantId: PARTICIPANT,
      issuer: { publicKey: ISSUER_PUBLIC_KEY },
      issuedAt: ISSUED_AT,
      nowIso: ISSUED_AT,
      expiresAt: EXPIRES_AT,
    });
    expect(first.issued).toBe(true);
    expect(first.grant.scopes).toEqual(ROOM_CODE_GUEST_GRANT_SCOPES);
    expect(first.grant.scopes).not.toContain('gm');

    const second = resolveOrIssueRoomCodeGuestGrant({
      grantStore: harness.grantStore,
      campaignId: CAMPAIGN_ID,
      participantId: PARTICIPANT,
      issuer: { publicKey: ISSUER_PUBLIC_KEY },
      issuedAt: ISSUED_AT,
      nowIso: ISSUED_AT,
      expiresAt: EXPIRES_AT,
    });
    expect(second.issued).toBe(false);
    expect(second.grant.grantId).toBe(first.grant.grantId);
    const forParticipant = harness.grantStore
      .listGrants(CAMPAIGN_ID)
      .filter(function (grant) {
        return grant.participantId === PARTICIPANT && grant.revokedAt === null;
      });
    expect(forParticipant).toHaveLength(1);
  });

  it('does not mint a second grant when an active grant already exists', () => {
    harness.grantStore.issueGrant({
      campaignId: CAMPAIGN_ID,
      participantId: PARTICIPANT,
      issuerPublicKey: ISSUER_PUBLIC_KEY,
      scopes: ['campaign'],
      issuedAt: ISSUED_AT,
      expiresAt: EXPIRES_AT,
    });
    const resolved = resolveOrIssueRoomCodeGuestGrant({
      grantStore: harness.grantStore,
      campaignId: CAMPAIGN_ID,
      participantId: PARTICIPANT,
      issuer: { publicKey: ISSUER_PUBLIC_KEY },
      issuedAt: ISSUED_AT,
      nowIso: ISSUED_AT,
      expiresAt: EXPIRES_AT,
    });
    expect(resolved.issued).toBe(false);
    expect(harness.grantStore.listGrants(CAMPAIGN_ID)).toHaveLength(1);
  });
});
