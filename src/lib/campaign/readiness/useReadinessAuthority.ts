import { useEffect, useState } from 'react';

import { readCampaignLaunchHead } from '@/lib/campaign/encounter/readCampaignLaunchHead';

import {
  SNAPSHOT_READINESS_AUTHORITY,
  type ReadinessAuthority,
} from './selectUnitReadiness';

const LOADING: ReadinessAuthority = Object.freeze({
  kind: 'loading',
});

/** Read-only authority, refreshed when the owning campaign snapshot changes. */
export function useReadinessAuthority(
  campaignId: string | undefined,
  refreshKey?: unknown,
): ReadinessAuthority {
  const [loaded, setLoaded] = useState<{
    campaignId: string;
    refreshKey: unknown;
    authority: ReadinessAuthority;
  }>();
  useEffect(() => {
    if (!campaignId) return;
    let cancelled = false;
    void readCampaignLaunchHead(campaignId).then((head) => {
      if (cancelled) return;
      setLoaded({
        campaignId,
        refreshKey,
        authority:
          head.kind === 'unavailable'
            ? { kind: 'blocked', reason: 'Readiness authority is unavailable.' }
            : (head.readinessAuthority ?? SNAPSHOT_READINESS_AUTHORITY),
      });
    });
    return () => {
      cancelled = true;
    };
  }, [campaignId, refreshKey]);
  if (!campaignId) return SNAPSHOT_READINESS_AUTHORITY;
  return loaded?.campaignId === campaignId && loaded.refreshKey === refreshKey
    ? loaded.authority
    : LOADING;
}
