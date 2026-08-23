/**
 * Grant-channel error codes (design D5, task 3.3).
 *
 * Authorization refusals and infrastructure failures MUST use distinct
 * Error.code values so a downed store cannot read as "not allowed".
 * Precedent: PR-2/PR-8 AUTH_REJECTED versus INTERNAL_ERROR.
 */

import type { CampaignGrantVerifyFailureReason } from '@/lib/campaign/grants/ICampaignGrantStore';
import type { IErrorCode } from '@/types/multiplayer/Protocol';

/** Authorization refusal for a grant token or membership check. */
export const GRANT_CHANNEL_AUTH_ERROR_CODE = 'AUTH_REJECTED' as const;

/**
 * Infrastructure failure. Distinct from GRANT_CHANNEL_AUTH_ERROR_CODE
 * so operators can alert on store faults without treating them as
 * access denials.
 */
export const GRANT_CHANNEL_INFRA_ERROR_CODE = 'INTERNAL_ERROR' as const;

export interface IGrantChannelFailureFrame {
  readonly code: IErrorCode;
  readonly reason: string;
}

/**
 * Maps one verifyCampaignGrantToken failure onto a typed close frame.
 * store-unavailable is the only infrastructure reason; every other
 * reason is an authorization verdict.
 */
export function grantTokenFailureFrame(
  verifyReason: CampaignGrantVerifyFailureReason,
): IGrantChannelFailureFrame {
  if (verifyReason === 'store-unavailable') {
    return {
      code: GRANT_CHANNEL_INFRA_ERROR_CODE,
      reason: 'grant-store-unavailable',
    };
  }
  return {
    code: GRANT_CHANNEL_AUTH_ERROR_CODE,
    reason: `grant-token-${verifyReason}`,
  };
}

/** Join campaignId disagrees with the verified token's campaign. */
export function grantCampaignMismatchFrame(): IGrantChannelFailureFrame {
  return {
    code: GRANT_CHANNEL_AUTH_ERROR_CODE,
    reason: 'grant-campaign-mismatch',
  };
}

/** Join grantId disagrees with the verified token's grant. */
export function grantIdMismatchFrame(): IGrantChannelFailureFrame {
  return {
    code: GRANT_CHANNEL_AUTH_ERROR_CODE,
    reason: 'grant-id-mismatch',
  };
}

/** Socket player is not the grant's participant. */
export function grantParticipantMismatchFrame(): IGrantChannelFailureFrame {
  return {
    code: GRANT_CHANNEL_AUTH_ERROR_CODE,
    reason: 'grant-participant-mismatch',
  };
}

/** Projection refused membership (revoked, expired, or unknown at pump). */
export function grantDeliveryRefusedFrame(): IGrantChannelFailureFrame {
  return {
    code: GRANT_CHANNEL_AUTH_ERROR_CODE,
    reason: 'grant-delivery-refused',
  };
}

/** Grant channel deps missing or SQLite handle unavailable. */
export function grantChannelUnavailableFrame(): IGrantChannelFailureFrame {
  return {
    code: GRANT_CHANNEL_INFRA_ERROR_CODE,
    reason: 'grant-channel-unavailable',
  };
}

/** Unexpected throw during projection or live pump. */
export function grantChannelInternalFrame(): IGrantChannelFailureFrame {
  return {
    code: GRANT_CHANNEL_INFRA_ERROR_CODE,
    reason: 'grant-channel-internal',
  };
}
