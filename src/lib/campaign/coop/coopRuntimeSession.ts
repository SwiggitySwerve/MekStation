/**
 * Co-op campaign runtime session adapter.
 *
 * Binds the existing CO1/CO2 primitives (`CampaignMatchHost`,
 * `CampaignSyncSession`, `CampaignGmArbiter`) to UI-facing route surfaces:
 * host pending queues, guest proposal transports, and per-mission
 * participation broadcasts.
 *
 * This module is intentionally in-memory. It is the live browser/runtime
 * session layer for an opened co-op campaign, not persisted campaign data.
 *
 * @spec openspec/specs/coop-campaign-sync/spec.md
 */

import type { IPendingProposal } from '@/lib/multiplayer/server/CampaignGmArbiter';
import type { ICampaign } from '@/types/campaign/Campaign';
import type {
  CoopParticipationChoice,
  GmArbitrationMode,
  GmDecision,
  GuestProposalResult,
  IGuestProposal,
} from '@/types/campaign/CoopCampaign';
import type { ICoopSession } from '@/types/campaign/CoopSession';
import type { IForce } from '@/types/campaign/Force';

import { InMemoryCampaignEventStore } from '@/lib/campaign/sync/InMemoryCampaignEventStore';
import { CampaignGmArbiter } from '@/lib/multiplayer/server/CampaignGmArbiter';
import { CampaignMatchHost } from '@/lib/multiplayer/server/CampaignMatchHost';
import { CampaignSyncSession } from '@/lib/multiplayer/server/CampaignSyncSession';
import { INVALID_CAMPAIGN_INTENT } from '@/types/campaign/CampaignSync';

import { buildCampaignAuthoritativeState } from './campaignAuthoritativeState';
import { registerActiveCoopHost } from './coopHostRegistry';

// =============================================================================
// Runtime session
// =============================================================================

export interface IOpenCoopRuntimeOptions {
  readonly matchId?: string;
  readonly roomCode?: string;
  readonly hostPlayerId?: string;
  readonly arbitrationMode?: GmArbitrationMode;
}

export interface ICoopRuntimeSession {
  readonly campaignId: string;
  readonly matchId: string;
  readonly host: CampaignMatchHost;
  readonly syncSession: CampaignSyncSession;
  readonly arbiter: CampaignGmArbiter;
}

interface ICoopRuntimeRecord extends ICoopRuntimeSession {
  readonly unregisterHost: () => void;
  readonly resultWaiters: Map<string, (result: GuestProposalResult) => void>;
}

const runtimeByMatchId = new Map<string, ICoopRuntimeRecord>();
const runtimeByCampaignId = new Map<string, ICoopRuntimeRecord>();

export function getCoopMatchId(
  session: Pick<ICoopSession, 'matchId' | 'hostMatchId'> | undefined,
): string | undefined {
  return session?.matchId ?? session?.hostMatchId;
}

export function getCoopLocalPlayerId(
  session: Pick<ICoopSession, 'mode'>,
): 'host' | 'guest' {
  return session.mode === 'host' ? 'host' : 'guest';
}

export function getCoopOtherPlayerId(
  session: Pick<ICoopSession, 'mode'>,
): 'host' | 'guest' {
  return session.mode === 'host' ? 'guest' : 'host';
}

export async function openCoopRuntimeSession(
  campaign: ICampaign,
  options: IOpenCoopRuntimeOptions = {},
): Promise<ICoopRuntimeSession | null> {
  const matchId = options.matchId ?? campaign.coopSession?.matchId;
  if (!matchId) return null;

  const existing = runtimeByMatchId.get(matchId);
  if (existing && existing.campaignId === campaign.id) {
    return existing;
  }

  const host = new CampaignMatchHost({
    campaignId: campaign.id,
    hostPlayerId: options.hostPlayerId ?? 'host',
    eventStore: new InMemoryCampaignEventStore(),
    initialState: buildCampaignAuthoritativeState(campaign),
  });
  const syncSession = new CampaignSyncSession(host);
  await syncSession.open(options.roomCode ?? campaign.coopSession?.roomCode);

  const arbiter = new CampaignGmArbiter(
    host,
    options.arbitrationMode ?? 'host-review',
    // The UI transport resolves pending proposals from explicit GM decisions.
    // A future socket transport can surface timeout resolutions as broadcasts.
    { proposalTimeoutMs: 0 },
  );
  const unregisterHost = registerActiveCoopHost(host);
  const record: ICoopRuntimeRecord = {
    campaignId: campaign.id,
    matchId,
    host,
    syncSession,
    arbiter,
    unregisterHost,
    resultWaiters: new Map(),
  };

  runtimeByMatchId.set(matchId, record);
  runtimeByCampaignId.set(campaign.id, record);
  return record;
}

export function getCoopRuntimeSessionByMatch(
  matchId: string | undefined,
): ICoopRuntimeSession | null {
  return matchId ? (runtimeByMatchId.get(matchId) ?? null) : null;
}

export function getCoopPendingProposals(
  matchId: string | undefined,
): readonly IPendingProposal[] {
  const runtime = getRuntimeRecord(matchId);
  return runtime?.arbiter.getPendingProposals() ?? [];
}

export function subscribeCoopPendingProposals(
  matchId: string | undefined,
  listener: (pending: readonly IPendingProposal[]) => void,
): () => void {
  const runtime = getRuntimeRecord(matchId);
  if (!runtime) {
    listener([]);
    return () => undefined;
  }
  listener(runtime.arbiter.getPendingProposals());
  return runtime.arbiter.subscribePending(listener);
}

export async function submitGuestProposalToHost(
  matchId: string | undefined,
  proposal: IGuestProposal,
): Promise<GuestProposalResult> {
  const runtime = getRuntimeRecord(matchId);
  if (!runtime) {
    return sessionClosed(proposal.proposalId);
  }

  const initial = await runtime.arbiter.submitProposal(proposal);
  if (initial.status !== 'pending') {
    return initial;
  }

  return new Promise<GuestProposalResult>((resolve) => {
    runtime.resultWaiters.set(proposal.proposalId, resolve);
  });
}

export async function decideGuestProposal(
  matchId: string | undefined,
  proposalId: string,
  decision: GmDecision,
): Promise<GuestProposalResult | null> {
  const runtime = getRuntimeRecord(matchId);
  if (!runtime) return null;

  const result = await runtime.arbiter.decide(proposalId, decision);
  if (result) {
    resolveGuestProposal(runtime, result);
  }
  return result;
}

export function closeCoopRuntimeSession(matchId: string): void {
  const runtime = runtimeByMatchId.get(matchId);
  if (!runtime) return;
  runtime.host.close();
  runtime.unregisterHost();
  runtimeByMatchId.delete(matchId);
  runtimeByCampaignId.delete(runtime.campaignId);
}

export function _resetCoopRuntimeSessions(): void {
  for (const runtime of Array.from(runtimeByMatchId.values())) {
    runtime.host.close();
    runtime.unregisterHost();
  }
  runtimeByMatchId.clear();
  runtimeByCampaignId.clear();
  participationByMission.clear();
}

function getRuntimeRecord(
  matchId: string | undefined,
): ICoopRuntimeRecord | null {
  return matchId ? (runtimeByMatchId.get(matchId) ?? null) : null;
}

function resolveGuestProposal(
  runtime: ICoopRuntimeRecord,
  result: GuestProposalResult,
): void {
  const waiter = runtime.resultWaiters.get(result.proposalId);
  if (!waiter) return;
  runtime.resultWaiters.delete(result.proposalId);
  waiter(result);
}

function sessionClosed(proposalId: string): GuestProposalResult {
  return {
    status: 'mechanically-rejected',
    proposalId,
    code: INVALID_CAMPAIGN_INTENT,
    reason: 'session-closed',
  };
}

// =============================================================================
// Participation broadcast
// =============================================================================

export interface ICoopParticipationRecord {
  readonly matchId: string;
  readonly missionId: string;
  readonly playerId: 'host' | 'guest' | string;
  readonly role: 'host' | 'guest';
  readonly choice: CoopParticipationChoice;
  readonly force: IForce;
}

type ParticipationListener = (
  records: readonly ICoopParticipationRecord[],
) => void;

interface IParticipationBucket {
  readonly records: Map<string, ICoopParticipationRecord>;
  readonly listeners: Set<ParticipationListener>;
}

const participationByMission = new Map<string, IParticipationBucket>();

export function publishCoopParticipation(
  record: ICoopParticipationRecord,
): void {
  const bucket = getParticipationBucket(record.matchId, record.missionId);
  bucket.records.set(record.playerId, record);
  notifyParticipation(bucket);
}

export function getCoopParticipationRecords(
  matchId: string | undefined,
  missionId: string | undefined,
): readonly ICoopParticipationRecord[] {
  if (!matchId || !missionId) return [];
  const bucket = participationByMission.get(
    participationKey(matchId, missionId),
  );
  return bucket ? Array.from(bucket.records.values()) : [];
}

export function subscribeCoopParticipation(
  matchId: string | undefined,
  missionId: string | undefined,
  listener: ParticipationListener,
): () => void {
  if (!matchId || !missionId) {
    listener([]);
    return () => undefined;
  }
  const bucket = getParticipationBucket(matchId, missionId);
  bucket.listeners.add(listener);
  listener(Array.from(bucket.records.values()));
  return () => {
    bucket.listeners.delete(listener);
  };
}

function getParticipationBucket(
  matchId: string,
  missionId: string,
): IParticipationBucket {
  const key = participationKey(matchId, missionId);
  let bucket = participationByMission.get(key);
  if (!bucket) {
    bucket = { records: new Map(), listeners: new Set() };
    participationByMission.set(key, bucket);
  }
  return bucket;
}

function notifyParticipation(bucket: IParticipationBucket): void {
  const records = Array.from(bucket.records.values());
  bucket.listeners.forEach((listener) => listener(records));
}

function participationKey(matchId: string, missionId: string): string {
  return `${matchId}:${missionId}`;
}
