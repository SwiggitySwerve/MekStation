import React, { useCallback, useEffect, useMemo, useState } from 'react';

import type { IPendingProposal } from '@/lib/multiplayer/server/CampaignGmArbiter';
import type { ICampaign } from '@/types/campaign/Campaign';
import type { GmDecision, IGuestProposal } from '@/types/campaign/CoopCampaign';

import {
  decideGuestProposal,
  getCoopLocalPlayerId,
  getCoopMatchId,
  openCoopRuntimeSession,
  submitGuestProposalToHost,
  subscribeCoopPendingProposals,
} from '@/lib/campaign/coop/coopRuntimeSession';

import {
  CampaignCoopRouteSurface,
  type CampaignCoopRouteId,
} from './CampaignCoopRouteSurface';

export interface CampaignCoopRouteSurfaceConnectedProps {
  readonly campaign: ICampaign | null;
  readonly routeId: CampaignCoopRouteId;
  readonly dashboardMount?: boolean;
}

export function CampaignCoopRouteSurfaceConnected({
  campaign,
  routeId,
  dashboardMount,
}: CampaignCoopRouteSurfaceConnectedProps): React.ReactElement | null {
  const matchId = getCoopMatchId(campaign?.coopSession);
  const [pending, setPending] = useState<readonly IPendingProposal[]>([]);
  const [runtimeReady, setRuntimeReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setRuntimeReady(false);
    if (!campaign?.coopSession || campaign.coopSession.mode !== 'host') {
      setRuntimeReady(true);
      return () => {
        cancelled = true;
      };
    }

    void openCoopRuntimeSession(campaign).then(() => {
      if (!cancelled) {
        setRuntimeReady(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [campaign]);

  useEffect(() => {
    if (!matchId || !runtimeReady) {
      setPending([]);
      return () => undefined;
    }
    return subscribeCoopPendingProposals(matchId, setPending);
  }, [matchId, runtimeReady]);

  const proposalTransport = useCallback(
    (proposal: IGuestProposal) => submitGuestProposalToHost(matchId, proposal),
    [matchId],
  );

  const onDecide = useCallback(
    (proposalId: string, decision: GmDecision): void => {
      void decideGuestProposal(matchId, proposalId, decision);
    },
    [matchId],
  );

  const proposingPlayerId = useMemo(() => {
    return campaign?.coopSession
      ? getCoopLocalPlayerId(campaign.coopSession)
      : 'co-op-guest';
  }, [campaign?.coopSession]);

  return (
    <CampaignCoopRouteSurface
      campaign={campaign}
      routeId={routeId}
      dashboardMount={dashboardMount}
      pendingProposals={pending}
      onDecide={onDecide}
      proposalTransport={proposalTransport}
      proposingPlayerId={proposingPlayerId}
    />
  );
}

export default CampaignCoopRouteSurfaceConnected;
