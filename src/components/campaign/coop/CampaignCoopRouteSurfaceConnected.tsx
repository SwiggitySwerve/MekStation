import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import type { ICampaignAuthoritativeFold } from '@/lib/campaign/coop/campaignAuthoritativeFold';
import type { IPendingProposal } from '@/lib/multiplayer/server/CampaignGmArbiter';
import type { ICampaign } from '@/types/campaign/Campaign';
import type { ICampaignEvent } from '@/types/campaign/CampaignSync';
import type {
  GmDecision,
  GuestProposalResult,
  IGuestProposal,
} from '@/types/campaign/CoopCampaign';

import {
  EMPTY_CAMPAIGN_AUTHORITATIVE_FOLD,
  foldCampaignFrame,
} from '@/lib/campaign/coop/campaignAuthoritativeFold';
import { projectAuthoritativeStateOntoCampaign } from '@/lib/campaign/coop/campaignMirrorProjection';
import {
  campaignEventFromMessage,
  connectStoredCampaignSyncTransport,
  getActiveCampaignSyncTransport,
  type ICampaignSyncTransport,
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
import { useCampaignPersistenceStore } from '@/stores/campaign/useCampaignPersistenceStore';
import { useCampaignStore } from '@/stores/campaign/useCampaignStore';

import {
  CampaignCoopRouteSurface,
  type CampaignCoopRouteId,
} from './CampaignCoopRouteSurface';
import { pendingProposalFromWire } from './pendingProposalFromWire';

export interface CampaignCoopRouteSurfaceConnectedProps {
  readonly campaign: ICampaign | null;
  readonly routeId: CampaignCoopRouteId;
  readonly dashboardMount?: boolean;
}

/**
 * Binds the co-op campaign route surface to the live campaign sync stream.
 * A host opens its runtime session, folds each campaign frame its transport
 * delivers, projects every fold that accepted a frame onto the campaign
 * store (the projection a guest uses), and after folding a committed event
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
  // The GM's own fold of the stream it publishes. Held here rather than
  // in a module-scoped store on purpose: the campaign server hydrates
  // every host connection with a fresh baseline, so a surface that comes
  // back holding nothing catches up completely, while one that came back
  // quoting a cursor past that baseline's own `sequence: -1` would
  // REJECT its own hydration frame and backfill nothing.
  //
  // RESIDUAL, deliberately not closed here: a MOUNT starts empty and so
  // always adopts, but the effect below re-runs on a `roomCode` or
  // `matchId` change WITHOUT unmounting, and that reconnect keeps this
  // ref. Such a surface quotes a cursor above 0, rejects the baseline it
  // is hydrated with, and therefore misses anything committed during the
  // socket gap until the next full mount. Same adopt-at-0 rule the guest
  // mirror already carries for a large-gap resync; closing it for both
  // roles needs its own red-first row.
  const hostFold = useRef<ICampaignAuthoritativeFold>(
    EMPTY_CAMPAIGN_AUTHORITATIVE_FOLD,
  );

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
      matchId,
      role: 'host',
      roomCode,
      // Quote the cursor this surface holds, exactly as the guest does
      // below, so the two roles connect the same way (D9). On the wire
      // this is currently INERT for a host and is not claimed otherwise:
      // a cold connect holds -1, which the transport omits, and no arm
      // reachable from a host connection reads `lastSeq` - the host arm
      // and the membership rejoin both call `joinMember` unconditionally
      // and the grant/replica route never reads it, leaving only the
      // fallback resync arm a host does not take. It is carried so the
      // cursor is already correct when the cutover routes a GM replica
      // down the resumable path.
      lastSeq: hostFold.current.lastSequence,
    });
    if (!transport) return () => undefined;

    // The host's own view of the campaign is a grant property, not a
    // hosting property (design D9), so it is projected by the SAME pure
    // function every other viewer uses - no host-specific path.
    const projectHostFoldToCampaign = (): void => {
      const projected = projectAuthoritativeStateOntoCampaign(
        store.getState().campaign,
        campaignId,
        hostFold.current.state,
      );
      if (projected) store.setState({ campaign: projected });
    };

    return transport.onFrame((message) => {
      // Umbrella 19.2: the server's refusal is the ONLY authority on
      // whether a progression command will be taken, and it arrives on
      // this same frame stream. Holding the last one is what lets the GM
      // surface gate the control the server would refuse instead of
      // letting the host press it and find out.
      if (message.kind === 'Error') {
        setLastRefusalCode(message.code);
        setLastRefusalAction(message.recoveryAction ?? null);
      }
      // A committed campaign event means the server accepted a write, so
      // the standing refusal is stale. Clearing it here is deliberately
      // OPTIMISTIC - the block is a hint, not a convergence
      // subscription - and the server re-refuses if the condition still
      // holds. Without this a host who converged would stay gated
      // forever on a message that no longer describes anything.
      if (message.kind === 'CampaignEvent') {
        setLastRefusalCode(null);
        setLastRefusalAction(null);
      }
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
        const folded = foldCampaignFrame(hostFold.current, auditable);
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
        setPending((current) => [
          ...current.filter(
            (entry) =>
              entry.proposal.proposalId !== pendingEntry.proposal.proposalId,
          ),
          pendingEntry,
        ]);
        return;
      }
      if (message.kind === 'CampaignDecision') {
        setPending((current) =>
          current.filter(
            (entry) => entry.proposal.proposalId !== message.proposalId,
          ),
        );
      }
    });
  }, [campaignId, coopMode, matchId, roomCode, store]);

  useEffect(() => {
    if (coopMode !== 'guest' || !matchId || !roomCode || !campaignId) {
      return () => undefined;
    }
    const token = readCoopCampaignToken(matchId);
    if (!token) return () => undefined;

    const transport = connectStoredCampaignSyncTransport({
      matchId,
      role: 'guest',
      roomCode,
      lastSeq: useCampaignMirrorStore.getState().lastSequence,
    });
    if (!transport) return () => undefined;

    const projectMirrorToCampaign = (): void => {
      const projected = projectAuthoritativeStateOntoCampaign(
        store.getState().campaign,
        campaignId,
        useCampaignMirrorStore.getState().campaign,
      );
      if (projected) store.setState({ campaign: projected });
    };

    projectMirrorToCampaign();
    return transport.onFrame((message) => {
      // Umbrella 19.2: the guest gets the SAME refusal channel the host
      // has had since seam 1, for the same reason. The server refuses on
      // the frame stream both roles already subscribe to, and a guest
      // whose commands are being refused was, until this, told nothing at
      // all - their replica reads "up to date" because it IS up to date,
      // and "up to date" is precisely what reads as permission.
      //
      // Deliberately the same two rules as the host, not a second
      // policy: hold the last Error code, and clear it optimistically on
      // the next committed campaign event, because no "you may command
      // again" frame exists and the server stays the enforcer.
      if (message.kind === 'Error') {
        setLastRefusalCode(message.code);
        setLastRefusalAction(message.recoveryAction ?? null);
      }
      if (message.kind === 'CampaignEvent') {
        setLastRefusalCode(null);
        setLastRefusalAction(null);
      }
      const event = campaignEventFromMessage(message);
      if (!event) return;
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
  }, [campaignId, coopMode, matchId, roomCode, store]);

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
    const token = readCoopCampaignToken(matchId);
    return {
      status: mirrorPaused
        ? ('paused' as const)
        : mirrorCampaign
          ? ('synced' as const)
          : token
            ? ('connecting' as const)
            : ('missing-token' as const),
      balance: mirrorCampaign?.balance,
      salvagePool: mirrorCampaign?.salvagePool,
      rosterUnitCount: mirrorCampaign
        ? Object.keys(mirrorCampaign.rosterUnits).length
        : 0,
      pilotCount: mirrorCampaign
        ? Object.keys(mirrorCampaign.pilots).length
        : 0,
      lastSequence: mirrorLastSequence,
    };
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

/**
 * Hands the persistence store a committed-command acknowledgement for the
 * campaign the EVENT names (U35f; owner decision
 * OD-u35d-server-and-host-fix, host half), so the store ignores an event
 * for any campaign other than the one it holds. For its own campaign the
 * store cancels its armed auto-save and re-reads the record through its
 * load path, adopting the row version it read; a read that fails adopts
 * nothing. Not awaited: the store owns the read and its outcome.
 */
function refreshSavedRecordAfterCommit(event: ICampaignEvent): void {
  void useCampaignPersistenceStore.getState().refreshAfterCommittedCommand({
    kind: 'committed',
    state: { campaignId: event.campaignId },
  });
}

function submitGuestProposalOverTransport(
  transport: ICampaignSyncTransport,
  proposal: IGuestProposal,
): Promise<GuestProposalResult> {
  return new Promise((resolve, reject) => {
    let offFrame = (): void => undefined;
    let offError = (): void => undefined;
    const cleanup = (): void => {
      offFrame();
      offError();
    };
    offFrame = transport.onFrame((message) => {
      if (
        message.kind !== 'CampaignDecision' ||
        message.proposalId !== proposal.proposalId
      ) {
        return;
      }
      if (isPendingProposalResult(message.result)) {
        return;
      }
      cleanup();
      resolve(message.result as GuestProposalResult);
    });
    offError = transport.onError((error) => {
      cleanup();
      reject(error instanceof Error ? error : new Error('Campaign sync error'));
    });
    transport.sendProposal(proposal);
  });
}

function isPendingProposalResult(value: unknown): boolean {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as { status?: unknown }).status === 'pending'
  );
}
