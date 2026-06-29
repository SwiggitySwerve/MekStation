import {
  createGuestCoopSession,
  createHostCoopSession,
} from '@/types/campaign/CoopSession';

import {
  canUseCampaignGmControls,
  resolveCampaignAuthorityFromSession,
} from '../campaignAuthority';

describe('campaignAuthority', () => {
  it('treats single-player campaigns as local GM-owned campaigns', () => {
    const authority = resolveCampaignAuthorityFromSession();

    expect(authority).toMatchObject({
      role: 'gm',
      reason: 'single-player-owner',
      canUseGmControls: true,
      canViewGmPrivateLedger: true,
      canViewPlayerLedger: true,
    });
    expect(canUseCampaignGmControls()).toBe(true);
  });

  it('treats co-op hosts as GM-authorized viewers', () => {
    const authority = resolveCampaignAuthorityFromSession(
      createHostCoopSession('HOST1', 'match-host'),
    );

    expect(authority).toMatchObject({
      role: 'gm',
      reason: 'coop-host',
      canUseGmControls: true,
      canViewGmPrivateLedger: true,
    });
  });

  it('treats co-op guests as player mirrors', () => {
    const authority = resolveCampaignAuthorityFromSession(
      createGuestCoopSession('match-host', 'GUEST1'),
    );

    expect(authority).toMatchObject({
      role: 'player',
      reason: 'coop-guest',
      canUseGmControls: false,
      canViewGmPrivateLedger: false,
      canViewPlayerLedger: true,
    });
    expect(
      canUseCampaignGmControls(createGuestCoopSession('match-host', 'GUEST1')),
    ).toBe(false);
  });
});
