/**
 * Connected campaign share panel (task 2.2).
 *
 * Fetches the campaign's grants and its stored D2 authority, then hands
 * both to the presentational panel and wires revoke back to the API.
 *
 * Authority comes from the persistence store's save metadata, which is
 * copied straight off the SERVER record - never inferred from local
 * state, since "this is a shared copy" is a stored fact and guessing it
 * is exactly what D2 exists to remove. Until a record has been read or
 * written this session that metadata is null, and the panel renders
 * nothing: assuming `source` for even a moment would flash share
 * controls onto a replica, and it also means a dashboard that never
 * touched the server issues no request at all.
 *
 * Grants are fetched only for a source. A replica may not list them and
 * the server would refuse, so asking would be a guaranteed-failed
 * request whose answer the panel already knows.
 *
 * @spec openspec/changes/design-campaign-authority-and-sync/specs/campaign-replication/spec.md
 */

import React, { useCallback, useEffect, useState } from 'react';

import type { ICampaignGrant } from '@/lib/campaign/grants/ICampaignGrantStore';
import type { CampaignAuthority } from '@/types/campaign/SerializedCampaign';

import { readCoopCampaignToken } from '@/lib/campaign/coop/coopCampaignAuthTokenStore';
import { useCampaignPersistenceStore } from '@/stores/campaign/useCampaignPersistenceStore';

import { CampaignSharePanel } from './CampaignSharePanel';

export interface CampaignSharePanelConnectedProps {
  readonly campaignId: string;
  /**
   * The campaign's co-op match id, when it runs a session. The share
   * endpoint authenticates the caller, and the only token this browser
   * holds for a campaign is the one minted for that session, so without
   * it there is nothing to present and the server answers 401.
   */
  readonly matchId?: string | null;
}

/**
 * Reads the campaign's grants. A refusal (for example a replica, which
 * may not list) yields an empty set rather than an error surface - the
 * panel already explains the replica case from the authority alone.
 */
/**
 * The bearer header for this campaign's share endpoint, or an empty set
 * of headers when this browser holds no token for the session. Sending
 * nothing is the honest request: the server refuses it, which is the
 * correct outcome for a caller who cannot prove who they are.
 */
function shareAuthHeaders(
  matchId: string | null | undefined,
): Record<string, string> {
  const stored = readCoopCampaignToken(matchId);
  return stored ? { Authorization: `Bearer ${stored.wireToken}` } : {};
}

async function fetchGrants(
  campaignId: string,
  matchId: string | null | undefined,
): Promise<readonly ICampaignGrant[]> {
  const response = await fetch(
    `/api/campaigns/${encodeURIComponent(campaignId)}/grants`,
    { cache: 'no-store', headers: shareAuthHeaders(matchId) },
  );
  if (!response.ok) return [];
  const parsed: unknown = await response.json();
  // Validate rather than cast. A response that is not a grant array -
  // an error envelope, a proxy page, anything unexpected - must not be
  // able to crash the campaign dashboard this panel sits on.
  if (!Array.isArray(parsed)) return [];
  return parsed.filter(
    (entry): entry is ICampaignGrant =>
      typeof entry === 'object' &&
      entry !== null &&
      typeof (entry as { grantId?: unknown }).grantId === 'string' &&
      Array.isArray((entry as { scopes?: unknown }).scopes),
  );
}

export function CampaignSharePanelConnected(
  props: CampaignSharePanelConnectedProps,
): React.ReactElement | null {
  const { campaignId, matchId = null } = props;
  // Defensive read: a share panel must never be the reason a campaign
  // dashboard fails to render. Absent metadata degrades to "unknown
  // authority", which renders nothing - the same safe answer as "not
  // loaded yet".
  const authority = useCampaignPersistenceStore(
    (state) => state.metadata?.authority ?? null,
  );
  // A legacy copy has no server record at all, so it has no authority
  // either; the panel explains that case rather than rendering nothing.
  const legacyUnadopted = useCampaignPersistenceStore(
    (state) => state.legacyUnadopted,
  );
  const [grants, setGrants] = useState<readonly ICampaignGrant[]>([]);

  const isSource = authority !== null && authority.role === 'source';

  const load = useCallback(async (): Promise<void> => {
    if (!isSource) {
      setGrants([]);
      return;
    }
    setGrants(await fetchGrants(campaignId, matchId));
  }, [campaignId, isSource, matchId]);

  useEffect(() => {
    void load();
  }, [load]);

  const onRevoke = useCallback(
    (grantId: string): void => {
      void (async () => {
        await fetch(
          `/api/campaigns/${encodeURIComponent(campaignId)}/grants?grantId=${encodeURIComponent(grantId)}`,
          { method: 'DELETE', headers: shareAuthHeaders(matchId) },
        );
        // Re-read rather than mutating locally: the server owns whether
        // the revoke actually landed.
        await load();
      })();
    },
    [campaignId, load, matchId],
  );

  // Not loaded yet: render nothing rather than assuming an authority.
  // A legacy copy is different - it will never have one, and that is the
  // thing worth saying.
  if (authority === null && !legacyUnadopted) return null;

  return (
    <CampaignSharePanel
      authority={authority}
      grants={grants}
      legacyUnadopted={legacyUnadopted}
      onRevoke={onRevoke}
    />
  );
}

export default CampaignSharePanelConnected;
