/**
 * Idempotent campaign snapshot backfill and the ambiguous-ownership gate
 * (umbrella task 8.2).
 *
 * Task 5.2's `importCampaignBaseline` already knows how to turn one
 * materialized campaign snapshot into a genesis baseline on the `root`
 * branch without fabricating history, and 1.4's adoption path already
 * uses it for a browser copy. What neither does is answer the question
 * production activation actually turns on: **whose are these forces?**
 *
 * A campaign has ONE shared roster - nothing in
 * `ICampaignAuthoritativeState` records ownership - so the only honest
 * source is the durable record of who claimed what: the session's
 * participant seats and its force claims. When those records do not
 * settle it, migration must stop. Guessing would hand a player somebody
 * else's lance permanently, in a journal that by design is never
 * rewritten, so the design's rule is fail closed and require an audited
 * GM remapping instead of inferring.
 *
 * The remapping is the GM's decision, not a bypass: it may only name one
 * of the session's tactical players, and it cannot resolve a unit that
 * two forces both claim, because no force-level assignment can - the unit
 * is owned twice whichever way the forces go, and the roster has to be
 * fixed first.
 *
 * Idempotency comes from the recorded marker, not from the append: the
 * journal REPLAYS an identical retried command rather than refusing it,
 * so a second run without the marker check would happily rewrite when the
 * import happened. Nothing here deletes or edits the snapshot it imported
 * from - the migration is additive, exactly as the requirement says.
 *
 * @spec openspec/changes/harden-gm-two-player-campaign-sessions/specs/campaign-persistence/spec.md
 * @spec openspec/changes/harden-gm-two-player-campaign-sessions/design.md (Migration Plan step 5)
 */

import type { IEventJournal } from '@/lib/events/journal/EventJournalContract';
import type { ICampaignSessionForceClaim } from '@/services/campaignPersistence/CampaignSessionForceClaimStore';
import type { ICampaignAuthoritativeState } from '@/types/campaign/CampaignSync';

import { listCampaignSessionForceClaims } from '@/services/campaignPersistence/CampaignSessionForceClaimStore';
import { listActiveCampaignSessionParticipants } from '@/services/campaignPersistence/CampaignSessionParticipantStore';

import type { ICampaignJournalEnvelope } from '../sync/JournalCampaignEventStore';
import type { ICampaignMarkerIo } from './campaignLegacyAdoption';

import {
  importCampaignBaseline,
  type ICampaignCutoverMarker,
} from './campaignAuthorityMigration';

/** One reason the durable records do not settle who owns something. */
export type CampaignOwnershipAmbiguity =
  /** The snapshot has this force; no participant ever claimed it. */
  | { readonly kind: 'force-unclaimed'; readonly forceId: string }
  /** Claimed, or remapped, to somebody who is not a tactical player. */
  | {
      readonly kind: 'force-owner-not-a-player';
      readonly forceId: string;
      readonly participantId: string;
    }
  /** Different holders across missions; the campaign never settled it. */
  | {
      readonly kind: 'force-claimed-by-several';
      readonly forceId: string;
      readonly participantIds: readonly string[];
    }
  /** Two forces claim the unit, so no force assignment can own it once. */
  | {
      readonly kind: 'unit-in-several-forces';
      readonly unitId: string;
      readonly forceIds: readonly string[];
    };

export interface ICampaignOwnershipEvidence {
  /** Active `player`-seat participants - the two tactical slots. */
  readonly tacticalPlayerIds: readonly string[];
  /** Every durable force claim in the session, across all missions. */
  readonly forceClaims: readonly ICampaignSessionForceClaim[];
}

/** A GM's audited decision about ownership the records left open. */
export interface ICampaignOwnershipRemapping {
  readonly decidedByParticipantId: string;
  readonly decidedAt: string;
  /** `forceId -> tactical player participant id`. */
  readonly forceOwners: Readonly<Record<string, string>>;
}

export type CampaignOwnershipMapping =
  | {
      readonly kind: 'unambiguous';
      readonly forceOwners: Readonly<Record<string, string>>;
    }
  | {
      readonly kind: 'ambiguous';
      readonly ambiguities: readonly CampaignOwnershipAmbiguity[];
    };

/**
 * Units that appear in more than one force. Reported first because they
 * are the ambiguity a GM remapping CANNOT resolve: ownership of the unit
 * is doubled by the roster itself, not by an unsettled force.
 */
function doublyClaimedUnits(
  forceUnits: Readonly<Record<string, readonly string[]>>,
): readonly CampaignOwnershipAmbiguity[] {
  const forcesByUnit = new Map<string, string[]>();
  for (const forceId of Object.keys(forceUnits).sort()) {
    for (const unitId of forceUnits[forceId]) {
      const forces = forcesByUnit.get(unitId) ?? [];
      forces.push(forceId);
      forcesByUnit.set(unitId, forces);
    }
  }
  return Array.from(forcesByUnit.entries())
    .filter(([, forceIds]) => forceIds.length > 1)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([unitId, forceIds]) => ({
      kind: 'unit-in-several-forces' as const,
      unitId,
      forceIds,
    }));
}

/** Distinct claimants per force, deduped: one player re-claiming is one. */
function claimantsByForce(
  claims: readonly ICampaignSessionForceClaim[],
): Map<string, string[]> {
  const byForce = new Map<string, Set<string>>();
  for (const claim of claims) {
    const claimants = byForce.get(claim.forceId) ?? new Set<string>();
    claimants.add(claim.participantId);
    byForce.set(claim.forceId, claimants);
  }
  return new Map(
    Array.from(byForce.entries()).map(([forceId, claimants]) => [
      forceId,
      Array.from(claimants).sort(),
    ]),
  );
}

/**
 * Decide who owns each force in the snapshot, from the durable records
 * and (optionally) a GM's audited remapping. Returns every ambiguity it
 * found rather than the first, so a GM sees the whole remapping job.
 */
export function mapCampaignForceOwnership(
  state: ICampaignAuthoritativeState,
  evidence: ICampaignOwnershipEvidence,
  remapping: ICampaignOwnershipRemapping | null = null,
): CampaignOwnershipMapping {
  const forceUnits = state.forceUnits ?? {};
  const ambiguities: CampaignOwnershipAmbiguity[] = [
    ...doublyClaimedUnits(forceUnits),
  ];
  const players = new Set(evidence.tacticalPlayerIds);
  const claimants = claimantsByForce(evidence.forceClaims);
  const forceOwners: Record<string, string> = {};

  for (const forceId of Object.keys(forceUnits).sort()) {
    // The GM's decision wins over the claim rows - resolving a claim the
    // records left open is the entire point of the remapping.
    const decided = remapping?.forceOwners[forceId];
    const claimed = claimants.get(forceId) ?? [];
    let owner: string;
    if (decided !== undefined) {
      owner = decided;
    } else if (claimed.length === 0) {
      ambiguities.push({ kind: 'force-unclaimed', forceId });
      continue;
    } else if (claimed.length > 1) {
      ambiguities.push({
        kind: 'force-claimed-by-several',
        forceId,
        participantIds: claimed,
      });
      continue;
    } else {
      owner = claimed[0];
    }
    // Applies to a GM decision as much as to a claim row: the two
    // tactical slots are the only legal owners, so a GM cannot resolve a
    // block by assigning the force to themselves.
    if (!players.has(owner)) {
      ambiguities.push({
        kind: 'force-owner-not-a-player',
        forceId,
        participantId: owner,
      });
      continue;
    }
    forceOwners[forceId] = owner;
  }

  return ambiguities.length > 0
    ? { kind: 'ambiguous', ambiguities }
    : { kind: 'unambiguous', forceOwners };
}

/**
 * Read ownership evidence from the durable session records. The GM's
 * membership is deliberately not in `tacticalPlayerIds`: a non-playing GM
 * is a member of the session and not one of its two player slots, and
 * that distinction is what the gate rests on.
 */
export function readCampaignOwnershipEvidence(
  campaignId: string,
  sessionId: string,
): ICampaignOwnershipEvidence {
  return {
    tacticalPlayerIds: listActiveCampaignSessionParticipants(
      campaignId,
      sessionId,
    )
      .filter((membership) => membership.seat === 'player')
      .map((membership) => membership.participantId),
    forceClaims: listCampaignSessionForceClaims(campaignId, sessionId),
  };
}

export type CampaignSnapshotBackfillResult =
  | {
      readonly kind: 'backfilled';
      readonly marker: ICampaignCutoverMarker;
      readonly forceOwners: Readonly<Record<string, string>>;
    }
  /** A baseline is already recorded; this run appended nothing. */
  | {
      readonly kind: 'already-backfilled';
      readonly marker: ICampaignCutoverMarker | null;
    }
  | {
      readonly kind: 'ambiguous-ownership';
      readonly ambiguities: readonly CampaignOwnershipAmbiguity[];
    }
  | { readonly kind: 'import-rejected'; readonly reason: string }
  | { readonly kind: 'skipped' };

export interface ICampaignSnapshotBackfillInput {
  readonly campaignId: string;
  /** The materialized snapshot's authoritative projection. */
  readonly state: ICampaignAuthoritativeState;
  /** Store `version` of the snapshot being imported. */
  readonly sourceSnapshotRevision: number;
  readonly evidence: ICampaignOwnershipEvidence;
  readonly remapping?: ICampaignOwnershipRemapping | null;
  readonly importedAt: string;
}

/**
 * Back an existing campaign's snapshot with a genesis baseline, once.
 *
 * Order is load-bearing: the marker check comes before the ownership
 * gate (an already-migrated campaign is not re-litigated), and the
 * ownership gate comes before the append (a blocked campaign must have
 * nothing written for it at all - no baseline, no marker - so it is
 * still a plain legacy campaign afterwards).
 */
export async function backfillCampaignFromSnapshot(
  journal: IEventJournal<ICampaignJournalEnvelope>,
  markerIo: ICampaignMarkerIo,
  input: ICampaignSnapshotBackfillInput,
): Promise<CampaignSnapshotBackfillResult> {
  const existing = markerIo.read(input.campaignId);
  if (existing !== null && existing.importedBaseline !== null) {
    return { kind: 'already-backfilled', marker: existing };
  }

  const mapping = mapCampaignForceOwnership(
    input.state,
    input.evidence,
    input.remapping ?? null,
  );
  if (mapping.kind === 'ambiguous') {
    return { kind: 'ambiguous-ownership', ambiguities: mapping.ambiguities };
  }

  const result = await importCampaignBaseline(journal, {
    campaignId: input.campaignId,
    state: input.state,
    sourceSnapshotRevision: input.sourceSnapshotRevision,
    importedAt: input.importedAt,
  });
  if (result.kind === 'imported') {
    const baseline = result.marker.importedBaseline;
    const marker: ICampaignCutoverMarker =
      input.remapping && baseline
        ? {
            ...result.marker,
            importedBaseline: {
              ...baseline,
              ownershipRemapping: {
                decidedByParticipantId: input.remapping.decidedByParticipantId,
                decidedAt: input.remapping.decidedAt,
              },
            },
          }
        : result.marker;
    markerIo.write(marker);
    return { kind: 'backfilled', marker, forceOwners: mapping.forceOwners };
  }
  // 5.2 reports a rejected append as `stream-not-empty` with a sentinel
  // sequence. Reporting that as "already backfilled" would tell the
  // caller their campaign is safely imported when nothing committed.
  if (result.kind === 'stream-not-empty' && result.highestSequence < 0) {
    return {
      kind: 'import-rejected',
      reason: 'journal append rejected the baseline batch',
    };
  }
  return { kind: 'already-backfilled', marker: existing };
}

/**
 * The hook an activation path awaits. Inert while journal authority is
 * off - the journal dependency is a lazy factory so the disabled path
 * constructs nothing, matching the genesis and adoption hooks.
 */
export async function maybeBackfillCampaignFromSnapshot(
  input: ICampaignSnapshotBackfillInput & {
    readonly enabled: boolean;
    readonly journal: () => IEventJournal<ICampaignJournalEnvelope>;
    readonly markerIo: ICampaignMarkerIo;
  },
): Promise<CampaignSnapshotBackfillResult> {
  if (!input.enabled) {
    return { kind: 'skipped' };
  }
  return backfillCampaignFromSnapshot(input.journal(), input.markerIo, input);
}
