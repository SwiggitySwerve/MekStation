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

import { useCampaignPersistenceStore } from '@/stores/campaign/useCampaignPersistenceStore';

import { CampaignSharePanel } from './CampaignSharePanel';

export interface CampaignSharePanelConnectedProps {
  readonly campaignId: string;
}

/**
 * Reads the campaign's grants. A refusal (for example a replica, which
 * may not list) yields an empty set rather than an error surface - the
 * panel already explains the replica case from the authority alone.
 */
async function fetchGrants(
  campaignId: string,
): Promise<readonly ICampaignGrant[]> {
  const response = await fetch(
    `/api/campaigns/${encodeURIComponent(campaignId)}/grants`,
    { cache: 'no-store' },
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
  const { campaignId } = props;
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
    setGrants(await fetchGrants(campaignId));
  }, [campaignId, isSource]);

  useEffect(() => {
    void load();
  }, [load]);

  const onRevoke = useCallback(
    (grantId: string): void => {
      void (async () => {
        await fetch(
          `/api/campaigns/${encodeURIComponent(campaignId)}/grants?grantId=${encodeURIComponent(grantId)}`,
          { method: 'DELETE' },
        );
        // Re-read rather than mutating locally: the server owns whether
        // the revoke actually landed.
        await load();
      })();
    },
    [campaignId, load],
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
