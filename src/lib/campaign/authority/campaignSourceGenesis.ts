/**
 * Campaign source-instance genesis (design-campaign-authority-and-sync
 * task 1.1, journal half; design D1/D2/D10).
 *
 * When journal authority is enabled, campaign creation appends one genesis
 * event — a `CampaignSnapshotPublished` of the created campaign's
 * authoritative projection at sequence 0 under a `system` principal — and
 * persists a journal-native cutover marker, BEFORE the creation is
 * acknowledged to the client. The projection is derived server-side from
 * the stored `SerializedCampaign` envelope by mirroring the co-op wire
 * builder's exact rules (`buildCampaignAuthoritativeState`, the camp-01b
 * attested surface), so the source and the wire agree on what a campaign's
 * authoritative state is.
 *
 * While `CAMPAIGN_JOURNAL_AUTHORITY_ENABLED` is false the hook is inert:
 * no journal handle is even constructed (the journal dependency is a lazy
 * factory). Acknowledgement-ordering and failure semantics therefore
 * activate at 5.7 cutover; the wiring and its tests land here.
 *
 * @spec openspec/changes/design-campaign-authority-and-sync/specs/campaign-authority/spec.md
 * @spec openspec/changes/design-campaign-authority-and-sync/specs/campaign-persistence/spec.md
 */

import type { IEventJournal } from '@/lib/events/journal/EventJournalContract';
import type {
  ICampaignAuthoritativeState,
  ICampaignEvent,
  ICampaignRosterUnit,
} from '@/types/campaign/CampaignSync';
import type { IForce } from '@/types/campaign/Force';
import type { SerializedCampaign } from '@/types/campaign/SerializedCampaign';

import { createEmptyCampaignState } from '@/types/campaign/CampaignSync';
import { parseRosterUnitSource } from '@/types/campaign/RosterUnitSource';

import { freezeCampaignEvent } from '../sync/campaignEventScope';
import {
  appendCampaignCommandBatch,
  computeCampaignStateDigest,
  type ICampaignJournalEnvelope,
} from '../sync/JournalCampaignEventStore';
import {
  createJournalNativeMarker,
  type ICampaignCutoverMarker,
} from './campaignAuthorityMigration';

const READINESS_STATUS = {
  Ready: 'operational',
  Damaged: 'damaged',
  Destroyed: 'destroyed',
} as const;

/**
 * Server-safe mirror of `buildCampaignAuthoritativeState` over the stored
 * envelope. Every rule matches the wire builder: roster projections parse
 * their source and require a catalog ref; empty projections fall back to
 * force-derived placeholder units; force membership rejects absent or
 * doubly-claimed units; pilots/contracts stay empty exactly as the wire
 * builder leaves them. Divergence between this and the client builder is a
 * bug — the parity test pins them together.
 */
export function authoritativeStateFromSerializedCampaign(
  envelope: SerializedCampaign,
): ICampaignAuthoritativeState {
  const body = envelope.body;
  const base = createEmptyCampaignState(envelope.campaignId);
  const rosterUnits = projectRosterUnits(envelope);
  return {
    ...base,
    day: dayBetween(body.campaignStartDate, body.currentDate),
    balance: Number.isFinite(body.finances.balance) ? body.finances.balance : 0,
    rosterUnits,
    forceUnits: projectForceUnits(
      body.forces,
      new Set(Object.keys(rosterUnits)),
    ),
    factionStanding: Object.fromEntries(
      Object.entries(body.factionStandings).map(([factionId, standing]) => [
        factionId,
        standing.regard,
      ]),
    ),
  };
}

function projectRosterUnits(
  envelope: SerializedCampaign,
): Readonly<Record<string, ICampaignRosterUnit>> {
  const units: Record<string, ICampaignRosterUnit> = {};
  const projections = envelope.body.rosterProjection?.units ?? [];
  if (projections.length === 0) {
    for (const [, force] of envelope.body.forces) {
      for (const unitId of force.unitIds) {
        units[unitId] = { unitId, designation: unitId, status: 'operational' };
      }
    }
    return units;
  }
  const ordered = [...projections].sort((left, right) =>
    left.unitId.localeCompare(right.unitId),
  );
  for (const unit of ordered) {
    const parsed = parseRosterUnitSource(unit.unitSource);
    if (parsed.kind === 'invalid') {
      throw new Error(`${unit.unitName} has an invalid roster source`);
    }
    if (!unit.unitRef) {
      throw new Error(`${unit.unitName} is missing a catalog reference`);
    }
    units[unit.unitId] = {
      unitId: unit.unitId,
      designation: unit.unitName,
      status: READINESS_STATUS[unit.readiness],
      unitRef: unit.unitRef,
      unitSource: parsed.source,
      ...(unit.sourceVersion !== undefined
        ? { sourceVersion: unit.sourceVersion }
        : {}),
    };
  }
  return units;
}

function projectForceUnits(
  forcePairs: ReadonlyArray<readonly [string, IForce]>,
  rosterIds: ReadonlySet<string>,
): Readonly<Record<string, readonly string[]>> {
  const claimed = new Set<string>();
  const forceUnits: Record<string, readonly string[]> = {};
  const ordered = [...forcePairs].sort(([left], [right]) =>
    left.localeCompare(right),
  );
  for (const [forceId, force] of ordered) {
    const unitIds = [...force.unitIds].sort((left, right) =>
      left.localeCompare(right),
    );
    for (const unitId of unitIds) {
      if (!rosterIds.has(unitId)) {
        throw new Error(
          `Force ${forceId} references absent roster unit ${unitId}`,
        );
      }
      if (claimed.has(unitId)) {
        throw new Error(`Roster unit ${unitId} is in more than one force`);
      }
      claimed.add(unitId);
    }
    forceUnits[forceId] = unitIds;
  }
  return forceUnits;
}

function dayBetween(start: string | undefined, current: string): number {
  const currentTime = new Date(current).getTime();
  const startTime =
    start === undefined ? currentTime : new Date(start).getTime();
  if (!Number.isFinite(currentTime) || !Number.isFinite(startTime)) {
    return 0;
  }
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.max(0, Math.floor((currentTime - startTime) / msPerDay));
}

export type CampaignGenesisResult =
  | {
      readonly kind: 'genesis-appended';
      readonly marker: ICampaignCutoverMarker;
      readonly stateDigest: string;
    }
  | { readonly kind: 'already-journaled' }
  | { readonly kind: 'invalid-campaign-projection'; readonly reason: string }
  | { readonly kind: 'skipped' };

/**
 * Append the genesis snapshot and persist the journal-native marker.
 * Idempotency rides the journal's command identity: an IDENTICAL retried
 * genesis replays the cached committed batch (success again, nothing
 * double-appended, the marker upsert repeats harmlessly), while a
 * DIVERGENT retry or an already-populated stream reports
 * `already-journaled` without appending or overwriting.
 */
export async function appendCampaignGenesis(
  journal: IEventJournal<ICampaignJournalEnvelope>,
  writeMarker: (marker: ICampaignCutoverMarker) => void,
  input: {
    readonly envelope: SerializedCampaign;
    readonly occurredAt: string;
  },
): Promise<CampaignGenesisResult> {
  let state: ICampaignAuthoritativeState;
  try {
    state = authoritativeStateFromSerializedCampaign(input.envelope);
  } catch (error) {
    return {
      kind: 'invalid-campaign-projection',
      reason: error instanceof Error ? error.message : 'projection failed',
    };
  }
  const campaignId = input.envelope.campaignId;
  const genesisEvent: ICampaignEvent<'CampaignSnapshotPublished'> =
    freezeCampaignEvent({
      sequence: 0,
      campaignId,
      ts: input.occurredAt,
      authorPlayerId: 'system',
      type: 'CampaignSnapshotPublished',
      // Genesis is the shared source baseline, not a GM-hidden fact.
      scope: 'campaign',
      payload: { state, revision: 0 },
    });
  const stateDigest = computeCampaignStateDigest(state);

  const result = await appendCampaignCommandBatch(journal, {
    campaignId,
    commandId: `campaign-genesis:${campaignId}`,
    events: [genesisEvent],
    expectedPostStateDigest: stateDigest,
    principal: {
      actorKind: 'system',
      actorId: 'campaign-source-genesis',
      authorityType: 'campaign-source',
      authorityId: campaignId,
    },
  });
  if (
    result.kind === 'sequence-conflict' ||
    result.kind === 'duplicate-command'
  ) {
    return { kind: 'already-journaled' };
  }
  if (result.kind !== 'committed') {
    return {
      kind: 'invalid-campaign-projection',
      reason: 'journal append rejected the genesis batch',
    };
  }
  const marker = createJournalNativeMarker(campaignId);
  writeMarker(marker);
  return { kind: 'genesis-appended', marker, stateDigest };
}

/**
 * The creation hook the PUT route awaits before acknowledging a create.
 * Inert unless journal authority is enabled AND this save created the
 * campaign (baseVersion 0); the journal dependency is a lazy factory so
 * the disabled path constructs nothing.
 */
export async function maybeAppendCampaignGenesisOnCreate(input: {
  readonly enabled: boolean;
  readonly created: boolean;
  readonly envelope: SerializedCampaign;
  readonly occurredAt: string;
  readonly journal: () => IEventJournal<ICampaignJournalEnvelope>;
  readonly writeMarker: (marker: ICampaignCutoverMarker) => void;
}): Promise<CampaignGenesisResult> {
  if (!input.enabled || !input.created) {
    return { kind: 'skipped' };
  }
  return appendCampaignGenesis(input.journal(), input.writeMarker, {
    envelope: input.envelope,
    occurredAt: input.occurredAt,
  });
}
