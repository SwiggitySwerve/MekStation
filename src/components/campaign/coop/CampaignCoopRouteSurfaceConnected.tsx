import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import type { IPendingProposal } from '@/lib/multiplayer/server/CampaignGmArbiter';
import type { ICampaign } from '@/types/campaign/Campaign';
import type { ICampaignEvent } from '@/types/campaign/CampaignSync';
import type { GmDecision, IGuestProposal } from '@/types/campaign/CoopCampaign';
import type { IServerMessage } from '@/types/multiplayer/Protocol';

import {
  EMPTY_CAMPAIGN_AUTHORITATIVE_FOLD,
  foldCampaignFrame,
} from '@/lib/campaign/coop/campaignAuthoritativeFold';
import { claimCampaignHostFold } from '@/lib/campaign/coop/campaignHostFoldStore';
import {
  campaignEventFromMessage,
  connectStoredCampaignSyncTransport,
  getActiveCampaignSyncTransport,
} from '@/lib/campaign/coop/campaignSyncTransport';
import { readCoopCampaignToken } from '@/lib/campaign/coop/coopCampaignAuthTokenStore';
import {
  decideGuestProposal,
  getCoopLocalPlayerId,
  getCoopMatchId,
  openCoopRuntimeSession,
  submitGuestProposalToHost,
  subscribeCoopPendingProposals,
} from '@/lib/campaign/coop/coopRuntimeSession';
import { useCampaignMirrorStore } from '@/lib/p2p/campaignMirrorStore';
import { useCampaignStore } from '@/stores/campaign/useCampaignStore';

import {
  CampaignCoopRouteSurface,
  type CampaignCoopRouteId,
} from './CampaignCoopRouteSurface';
import {
  guestMirrorSummaryOf,
  projectStateOntoCampaignStore,
  refreshSavedRecordAfterCommit,
  refusalFromFrame,
  removePendingProposal,
  submitGuestProposalOverTransport,
  upsertPendingProposal,
} from './campaignCoopSurfaceHelpers';
import { pendingProposalFromWire } from './pendingProposalFromWire';
import { useCampaignApplicationConsumer } from './useCampaignApplicationConsumer';

export interface CampaignCoopRouteSurfaceConnectedProps {
  readonly campaign: ICampaign | null;
  readonly routeId: CampaignCoopRouteId;
  readonly dashboardMount?: boolean;
}

/**
 * Binds the co-op campaign route surface to the live campaign sync stream.
 * A host opens its runtime session, folds each campaign frame its transport
 * delivers into its module-scoped fold, projects every fold that accepted a
 * frame onto the campaign store (the projection a guest uses), and after folding a committed event
 * has the persistence store re-read the saved record. A guest feeds the
 * frames into the mirror store and projects the mirror onto the campaign
 * store. Both roles track pending proposals and the server's last refusal.
 * A guest's proposals go over its transport and a host's decisions over
 * its own; without that transport both go through the runtime session.
 */
export function CampaignCoopRouteSurfaceConnected({
  campaign,
  routeId,
  dashboardMount,
}: CampaignCoopRouteSurfaceConnectedProps): React.ReactElement | null {
  const store = useCampaignStore();
  const campaignId = campaign?.id;
  const coopMode = campaign?.coopSession?.mode;
  const roomCode = campaign?.coopSession?.roomCode;
  const matchId = getCoopMatchId(campaign?.coopSession);
  const mirrorCampaign = useCampaignMirrorStore((state) => state.campaign);
  const mirrorPaused = useCampaignMirrorStore((state) => state.paused);
  const mirrorLastSequence = useCampaignMirrorStore(
    (state) => state.lastSequence,
  );
  // Host-side audit stream (task 3.6). Guests never populate this.
  const [auditEvents, setAuditEvents] = useState<readonly ICampaignEvent[]>([]);
  const [pending, setPending] = useState<readonly IPendingProposal[]>([]);
  // The last refusal the campaign server sent this host, verbatim. Held
  // as the raw wire code rather than a posture so the mapping stays in
  // one place and this component cannot invent a posture the server
  // never sent.
  const [lastRefusalCode, setLastRefusalCode] = useState<string | null>(null);
  // The server names the recovery it wants next to its refusal code; the
  // surface renders that wording verbatim, so it travels with the code.
  const [lastRefusalAction, setLastRefusalAction] = useState<string | null>(
    null,
  );
  const [runtimeReady, setRuntimeReady] = useState(false);
  const latestCampaignRef = useRef<ICampaign | null>(campaign);
  latestCampaignRef.current = campaign;
  // Receipt-mode application (P2CF2): idle unless a transport is bound to
  // this campaign, which no production creator does before Task 14.
  const { rejoins, bind: bindApplication } = useCampaignApplicationConsumer();
  const applyRefusal = useCallback((message: IServerMessage): void => {
    const refusal = refusalFromFrame(message);
    if (refusal === undefined) return;
    setLastRefusalCode(refusal?.code ?? null);
    setLastRefusalAction(refusal?.action ?? null);
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (coopMode !== 'host') {
      setRuntimeReady(true);
      return () => {
        cancelled = true;
      };
    }

    const currentCampaign = latestCampaignRef.current;
    if (!currentCampaign) {
      setRuntimeReady(true);
      return () => {
        cancelled = true;
      };
    }

    setRuntimeReady(false);
    void openCoopRuntimeSession(currentCampaign).then(() => {
      if (!cancelled) {
        setRuntimeReady(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [campaignId, coopMode, roomCode]);

  useEffect(() => {
    if (!matchId || !runtimeReady) {
      setPending([]);
      return () => undefined;
    }
    return subscribeCoopPendingProposals(matchId, setPending);
  }, [matchId, runtimeReady]);

  useEffect(() => {
    if (coopMode !== 'host' || !matchId || !roomCode || !campaignId) {
      return () => undefined;
    }
    const transport = connectStoredCampaignSyncTransport({
      expectedCampaignId: campaignId,
      matchId,
      role: 'host',
      roomCode,
      // A new socket starts a fresh EMPTY lineage below and a reused one
      // ignores the cursor, so a host always quotes EMPTY's. On the wire
      // this is currently INERT for a host and is not claimed otherwise:
      // a cold connect holds -1, which the transport omits, and no arm
      // reachable from a host connection reads `lastSeq` - the host arm
      // and the membership rejoin both call `joinMember` unconditionally
      // and the grant/replica route never reads it, leaving only the
      // fallback resync arm a host does not take. It is carried so the
      // cursor is already correct when the cutover routes a GM replica
      // down the resumable path.
      lastSeq: EMPTY_CAMPAIGN_AUTHORITATIVE_FOLD.lastSequence,
    });
    if (!transport) return () => undefined;

    // The GM's fold of the stream it publishes lives in a module-scoped
    // store (CF11). A remount on the same live bound transport continues
    // its lineage, so the next linked offer folds onto the facts the
    // receipt chain holds. Any other binding starts a fresh cell at EMPTY,
    // so a reconnect adopts its hydration baseline at 0 (P2CF2).
    const { cell: hostFold, continued } = claimCampaignHostFold({
      campaignId,
      matchId,
      transport,
    });
    const projectHostFoldToCampaign = (): void =>
      projectStateOntoCampaignStore(store, campaignId, hostFold.current.state);

    const application = bindApplication({
      role: 'host',
      transport,
      campaignId,
      store,
      fold: hostFold,
    });
    if (continued) projectHostFoldToCampaign();
    const offFrame = transport.onFrame((message) => {
      const applied = application.consume(message);
      // Holding the last refusal lets the GM surface gate the control the
      // server would refuse instead of letting the host press it.
      applyRefusal(message);
      // Task 3.6: keep the GM's received stream so the scope audit panel
      // can show how each event was classified at emission. Host-only -
      // this accumulation never runs on a guest surface.
      const auditable = campaignEventFromMessage(message);
      if (auditable) {
        setAuditEvents((current) => [...current, auditable]);
        // ...and fold it into the state the REST of the GM's dashboard
        // reads. Without this the host saw its own committed events
        // only in the audit panel: the campaign object stayed at
        // whatever the page loaded with until a reload, which is the
        // host-view staleness the tasks.md preamble recorded on
        // 2026-08-22. `foldCampaignFrame` returns the fold unchanged
        // (by reference) for a stale or unparseable frame, so a
        // rejected frame re-projects nothing.
        const folded = applied
          ? hostFold.current
          : foldCampaignFrame(hostFold.current, auditable);
        if (folded !== hostFold.current) {
          hostFold.current = folded;
          projectHostFoldToCampaign();
          // A committed event, never the CampaignSnapshot-kind baseline a
          // (re)connect hydrates with: on a journal-native campaign the
          // command behind it rewrote the saved record at the next row
          // version (U35e), which the host's next whole-envelope save
          // must carry or be refused 409 and rolled back.
          if (message.kind === 'CampaignEvent') {
            refreshSavedRecordAfterCommit(auditable);
          }
        }
      }
      if (message.kind === 'CampaignProposal') {
        const currentCampaign = latestCampaignRef.current;
        if (!currentCampaign) return;
        const pendingEntry = pendingProposalFromWire(
          message.proposal,
          currentCampaign,
        );
        if (!pendingEntry) return;
        setPending((current) => upsertPendingProposal(current, pendingEntry));
        return;
      }
      if (message.kind === 'CampaignDecision') {
        setPending((current) =>
          removePendingProposal(current, message.proposalId),
        );
      }
    });
    return () => {
      offFrame();
      application.dispose();
    };
  }, [
    applyRefusal,
    bindApplication,
    campaignId,
    coopMode,
    matchId,
    rejoins,
    roomCode,
    store,
  ]);

  useEffect(() => {
    if (coopMode !== 'guest' || !matchId || !roomCode || !campaignId) {
      return () => undefined;
    }
    const token = readCoopCampaignToken(matchId);
    if (!token) return () => undefined;

    const transport = connectStoredCampaignSyncTransport({
      expectedCampaignId: campaignId,
      matchId,
      role: 'guest',
      roomCode,
      lastSeq: useCampaignMirrorStore.getState().lastSequence,
    });
    if (!transport) return () => undefined;

    const projectMirrorToCampaign = (): void =>
      projectStateOntoCampaignStore(
        store,
        campaignId,
        useCampaignMirrorStore.getState().campaign,
      );

    const application = bindApplication({
      role: 'guest',
      transport,
      campaignId,
      store,
      playerId: token.playerId,
    });
    projectMirrorToCampaign();
    const offFrame = transport.onFrame((message) => {
      const applied = application.consume(message);
      // The guest gets the SAME refusal channel and rules as the host: a
      // guest's replica reads "up to date" because it IS, and "up to date"
      // is precisely what reads as permission.
      applyRefusal(message);
      const event = campaignEventFromMessage(message);
      if (!event || applied) return;
      const mirrorStore = useCampaignMirrorStore.getState();
      if (event.type === 'CampaignSnapshotPublished') {
        if (!mirrorStore.peers) {
          mirrorStore.beginMirror(
            {
              hostPeerId: event.authorPlayerId,
              guestPeerId: token.playerId,
            },
            token.playerId,
          );
        }
        mirrorStore.applySnapshot(event, event.sequence < 0 ? 0 : undefined);
      } else {
        mirrorStore.applyEvent(event);
      }
      projectMirrorToCampaign();
    });
    return () => {
      offFrame();
      application.dispose();
    };
  }, [
    applyRefusal,
    bindApplication,
    campaignId,
    coopMode,
    matchId,
    rejoins,
    roomCode,
    store,
  ]);

  const proposalTransport = useCallback(
    (proposal: IGuestProposal) => {
      const transport = getActiveCampaignSyncTransport(matchId);
      if (coopMode === 'guest' && transport) {
        return submitGuestProposalOverTransport(transport, proposal);
      }
      return submitGuestProposalToHost(matchId, proposal);
    },
    [coopMode, matchId],
  );

  const onDecide = useCallback(
    (proposalId: string, decision: GmDecision): void => {
      const transport = getActiveCampaignSyncTransport(matchId);
      if (coopMode === 'host' && transport) {
        transport.sendDecision(proposalId, decision);
        return;
      }
      void decideGuestProposal(matchId, proposalId, decision);
    },
    [coopMode, matchId],
  );

  const proposingPlayerId = useMemo(() => {
    const storedToken = readCoopCampaignToken(matchId);
    if (campaign?.coopSession?.mode === 'guest' && storedToken) {
      return storedToken.playerId;
    }
    return campaign?.coopSession
      ? getCoopLocalPlayerId(campaign.coopSession)
      : 'co-op-guest';
  }, [campaign?.coopSession, matchId]);

  const guestMirrorSummary = useMemo(() => {
    if (campaign?.coopSession?.mode !== 'guest') return undefined;
    return guestMirrorSummaryOf({
      mirrorCampaign,
      mirrorPaused,
      mirrorLastSequence,
      hasToken: readCoopCampaignToken(matchId) !== null,
    });
  }, [
    campaign?.coopSession?.mode,
    matchId,
    mirrorCampaign,
    mirrorLastSequence,
    mirrorPaused,
  ]);

  return (
    <CampaignCoopRouteSurface
      campaign={campaign}
      routeId={routeId}
      dashboardMount={dashboardMount}
      pendingProposals={pending}
      auditEvents={auditEvents}
      onDecide={onDecide}
      proposalTransport={proposalTransport}
      proposingPlayerId={proposingPlayerId}
      lastRefusalCode={lastRefusalCode}
      lastRefusalAction={lastRefusalAction}
      onClearRefusal={() => {
        setLastRefusalCode(null);
        setLastRefusalAction(null);
      }}
      guestMirrorSummary={guestMirrorSummary}
    />
  );
}

export default CampaignCoopRouteSurfaceConnected;
