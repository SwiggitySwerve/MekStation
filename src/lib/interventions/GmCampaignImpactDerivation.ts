/**
 * Campaign affected-artifact deriver (umbrella 16.4-a).
 *
 * 16.1 names FAMILIES. This module names the artifact IDs a rewind
 * would stale, then seals them through the existing manifest store
 * against a real C1c-ii candidate. Later use of those IDs is 16.4-b
 * and is not claimed here.
 *
 * The walk is the campaign journal fold past the cutoff (the same
 * reconstructible past 16.1 uses) plus extras the journal event types
 * cannot carry yet: scenario drafts, encounters, salvage rolls, and
 * unprojected time-cascade refs.
 */

import type Database from 'better-sqlite3';

import type { ICampaignJournalEnvelope } from '@/lib/campaign/sync/JournalCampaignEventStore';
import type {
  IAffectedArtifact,
  IArtifactManifestHeader,
} from '@/lib/events/journal/EventHistoryArtifactManifest';
import type { IEventHistoryStreamRef } from '@/lib/events/journal/EventHistoryBranchContract';
import type { IEventJournal } from '@/lib/events/journal/EventJournalContract';

import {
  CAMPAIGN_STREAM_TYPE,
  envelopeOf,
} from '@/lib/campaign/sync/JournalCampaignEventStore';
import { SQLiteEventHistoryArtifactManifestStore } from '@/lib/events/journal/EventHistoryArtifactManifest';
import {
  EVENT_JOURNAL_MAX_PAGE_SIZE,
  ROOT_EVENT_BRANCH_ID,
} from '@/lib/events/journal/EventJournalContract';

export type CampaignFoldFact =
  | {
      readonly kind: 'scenario';
      readonly scenarioId: string;
      readonly sourceRevision: number;
    }
  | {
      readonly kind: 'encounter';
      readonly encounterId: string;
      readonly sourceRevision: number;
    }
  | {
      readonly kind: 'salvage';
      readonly matchId: string;
      readonly sourceRevision: number;
    }
  | {
      readonly kind: 'contract';
      readonly contractId: string;
      readonly sourceRevision: number;
    }
  | {
      readonly kind: 'external-effect';
      readonly ref: string;
      readonly sourceRevision: number;
      readonly projected: boolean;
    };

export interface ICampaignImpactDerivationRequest {
  readonly stream: IEventHistoryStreamRef;
  readonly candidateBranchId: string;
  readonly cutoffRevision: number;
  readonly derivedAt: string;
  /**
   * Identities the journal types do not carry (scn-…, encounter.id,
   * salvage matchId, opaque externalEffectRefs).
   */
  readonly extras?: readonly CampaignFoldFact[];
}

export interface IDerivedCampaignImpact {
  readonly header: IArtifactManifestHeader;
  readonly entries: readonly IAffectedArtifact[];
}

function artifactFromFact(fact: CampaignFoldFact): IAffectedArtifact | null {
  switch (fact.kind) {
    case 'scenario':
      return {
        artifactKind: 'scenario',
        artifactId: fact.scenarioId,
        sourceRevision: fact.sourceRevision,
      };
    case 'encounter':
      return {
        artifactKind: 'encounter',
        artifactId: fact.encounterId,
        sourceRevision: fact.sourceRevision,
      };
    case 'salvage':
      return {
        artifactKind: 'salvage',
        artifactId: fact.matchId,
        sourceRevision: fact.sourceRevision,
      };
    case 'contract':
      return {
        artifactKind: 'contract',
        artifactId: fact.contractId,
        sourceRevision: fact.sourceRevision,
      };
    case 'external-effect':
      // Projected refs already have a replacement; only the unprojected
      // opaque string is stale-and-unnamed.
      return fact.projected
        ? null
        : {
            artifactKind: 'external-effect',
            artifactId: fact.ref,
            sourceRevision: fact.sourceRevision,
          };
    default: {
      const exhausted: never = fact;
      return exhausted;
    }
  }
}

/** IDs created or changed after the cutoff. Never a family name. */
export function nameCampaignArtifactsAfterCutoff(
  fold: readonly CampaignFoldFact[],
  cutoffRevision: number,
): readonly IAffectedArtifact[] {
  const named = new Map<string, IAffectedArtifact>();
  const ordered = [...fold].sort(
    (left, right) => left.sourceRevision - right.sourceRevision,
  );
  for (const fact of ordered) {
    if (fact.sourceRevision <= cutoffRevision) continue;
    const artifact = artifactFromFact(fact);
    if (artifact === null) continue;
    const key = `${artifact.artifactKind}/${artifact.artifactId}`;
    if (!named.has(key)) named.set(key, artifact);
  }
  return Object.freeze(Array.from(named.values()));
}

export async function foldFactsFromCampaignJournal(
  journal: IEventJournal<ICampaignJournalEnvelope>,
  campaignId: string,
): Promise<readonly CampaignFoldFact[]> {
  const facts: CampaignFoldFact[] = [];
  let afterRevision = 0;
  for (;;) {
    const page = await journal.readStream({
      streamType: CAMPAIGN_STREAM_TYPE,
      streamId: campaignId,
      branchId: ROOT_EVENT_BRANCH_ID,
      afterRevision,
      limit: EVENT_JOURNAL_MAX_PAGE_SIZE,
    });
    for (const stored of page) {
      const event = envelopeOf(stored);
      if (event.type === 'ContractAccepted') {
        facts.push({
          kind: 'contract',
          contractId: event.payload.contract.contractId,
          sourceRevision: stored.streamRevision,
        });
      }
    }
    if (page.length < EVENT_JOURNAL_MAX_PAGE_SIZE) return facts;
    afterRevision = page[page.length - 1].streamRevision;
  }
}

/**
 * Walk the journal fold past the cutoff, merge extras, seal against the
 * candidate. Activation still has to call the store; this only writes.
 */
export async function deriveAndSealCampaignImpact(
  db: Database.Database,
  journal: IEventJournal<ICampaignJournalEnvelope>,
  request: ICampaignImpactDerivationRequest,
): Promise<IDerivedCampaignImpact> {
  if (request.stream.streamType !== CAMPAIGN_STREAM_TYPE) {
    throw new Error(
      `Campaign impact derivation requires streamType '${CAMPAIGN_STREAM_TYPE}'`,
    );
  }
  const fold = [
    ...(await foldFactsFromCampaignJournal(journal, request.stream.streamId)),
    ...(request.extras ?? []),
  ];
  const entries = nameCampaignArtifactsAfterCutoff(
    fold,
    request.cutoffRevision,
  );
  const store = new SQLiteEventHistoryArtifactManifestStore(db);
  const header = store.sealArtifactManifest(
    request.stream,
    request.candidateBranchId,
    entries,
    request.derivedAt,
  );
  // Activation publishes the sealed rows; return that order, not discovery.
  const sealed = store.readArtifactManifest(
    request.stream,
    request.candidateBranchId,
  );
  return Object.freeze({
    header,
    entries: sealed === null ? entries : sealed.entries,
  });
}
