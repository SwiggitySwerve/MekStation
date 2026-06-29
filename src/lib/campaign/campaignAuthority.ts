import type { ICoopSession } from '@/types/campaign/CoopSession';

export type CampaignViewerRole = 'gm' | 'player';

export type CampaignAuthorityReason =
  | 'single-player-owner'
  | 'coop-host'
  | 'coop-guest';

export interface ICampaignAuthority {
  readonly role: CampaignViewerRole;
  readonly reason: CampaignAuthorityReason;
  readonly canUseGmControls: boolean;
  readonly canViewGmPrivateLedger: boolean;
  readonly canViewPlayerLedger: boolean;
}

export function resolveCampaignAuthorityFromSession(
  coopSession?: ICoopSession,
): ICampaignAuthority {
  if (!coopSession) {
    return {
      role: 'gm',
      reason: 'single-player-owner',
      canUseGmControls: true,
      canViewGmPrivateLedger: true,
      canViewPlayerLedger: true,
    };
  }

  if (coopSession.mode === 'host') {
    return {
      role: 'gm',
      reason: 'coop-host',
      canUseGmControls: true,
      canViewGmPrivateLedger: true,
      canViewPlayerLedger: true,
    };
  }

  return {
    role: 'player',
    reason: 'coop-guest',
    canUseGmControls: false,
    canViewGmPrivateLedger: false,
    canViewPlayerLedger: true,
  };
}

export function canUseCampaignGmControls(coopSession?: ICoopSession): boolean {
  return resolveCampaignAuthorityFromSession(coopSession).canUseGmControls;
}
