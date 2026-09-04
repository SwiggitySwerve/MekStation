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
import type {
  GmDecision,
  GuestProposalResult,
  IGuestProposal,
} from '@/types/campaign/CoopCampaign';

import { applyAuthoritativeStateToGuestCampaign } from '@/lib/campaign/coop/campaignMirrorProjection';
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
import { useCampaignStore } from '@/stores/campaign/useCampaignStore';

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
    if (coopMode !== 'host' || !matchId || !roomCode) {
      return () => undefined;
    }
    const transport = connectStoredCampaignSyncTransport({
      matchId,
      role: 'host',
      roomCode,
    });
    if (!transport) return () => undefined;

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
  }, [coopMode, matchId, roomCode]);

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
      const authoritative = useCampaignMirrorStore.getState().campaign;
      const current = store.getState().campaign;
      if (!authoritative || !current || current.id !== campaignId) return;
      store.setState({
        campaign: applyAuthoritativeStateToGuestCampaign(
          current,
          authoritative,
        ),
      });
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

function pendingProposalFromWire(
  value: unknown,
  campaign: ICampaign,
): IPendingProposal | null {
  if (isPendingProposal(value)) {
    return value;
  }
  if (!isGuestProposal(value)) {
    return null;
  }
  return {
    proposal: value,
    balanceAtSubmit: readCampaignBalance(campaign),
    relevantStanding: readRelevantStanding(value, campaign),
    effectSummary: describeProposalEffect(value),
  };
}

function isPendingProposal(value: unknown): value is IPendingProposal {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Partial<IPendingProposal>;
  return (
    isGuestProposal(candidate.proposal) &&
    typeof candidate.balanceAtSubmit === 'number' &&
    'relevantStanding' in candidate &&
    typeof candidate.effectSummary === 'string'
  );
}

function isGuestProposal(value: unknown): value is IGuestProposal {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Partial<IGuestProposal>;
  return (
    typeof candidate.proposalId === 'string' &&
    typeof candidate.campaignId === 'string' &&
    typeof candidate.proposingPlayerId === 'string' &&
    typeof candidate.ts === 'string' &&
    typeof candidate.intent === 'object' &&
    candidate.intent !== null
  );
}

function readCampaignBalance(campaign: ICampaign): number {
  const balance = campaign.finances.balance as unknown;
  if (
    typeof balance === 'object' &&
    balance !== null &&
    'amount' in balance &&
    typeof (balance as { amount: unknown }).amount === 'number'
  ) {
    return (balance as { amount: number }).amount;
  }
  return 0;
}

function readRelevantStanding(
  proposal: IGuestProposal,
  campaign: ICampaign,
): number | null {
  if (proposal.intent.kind !== 'AcceptContract') return null;
  const employer = proposal.intent.payload.contract.employerFactionId;
  return campaign.factionStandings[employer]?.regard ?? 0;
}

function describeProposalEffect(proposal: IGuestProposal): string {
  const intent = proposal.intent;
  switch (intent.kind) {
    case 'SpendFunds':
      return `Spend ${intent.payload.amount.toLocaleString()} C-bills - ${intent.payload.reason}`;
    case 'HirePilot':
      return `Hire pilot ${intent.payload.pilot.name}`;
    case 'AcceptContract':
      return `Accept contract ${intent.payload.contract.name}`;
    case 'AllocateSalvage':
      return `Allocate ${intent.payload.value.toLocaleString()} C-bills of salvage`;
    case 'AdvanceDay':
      return `Advance ${intent.payload.days ?? 1} day`;
    case 'RemoveParticipant':
      // Host-only; a guest proposal never carries it, but the union is
      // exhaustive and the label must exist for the compiler's sake.
      return `Remove participant ${intent.payload.participantId}`;
    default: {
      const exhaustive: never = intent;
      void exhaustive;
      return 'Guest proposal';
    }
  }
}
