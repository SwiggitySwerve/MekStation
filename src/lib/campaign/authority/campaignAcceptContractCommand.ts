/**
 * The durable accept-contract command (task 6.2a; design D13).
 *
 * Lifted out of `campaignCommandPipeline` because an acceptance is the one
 * intent whose validation input is not known until a SOURCE read has
 * happened: the compact fact it commits is derived from the offer the
 * persisted `SerializedCampaign` body holds, never from the contract object
 * the caller sent. Everything that ordering needs - the market read, the
 * refusal taxonomy, and the prepared-transaction plumbing - lives here, so
 * the shared pipeline keeps describing the shared path.
 *
 * @spec openspec/changes/design-campaign-authority-and-sync/design.md (D13)
 * @spec openspec/changes/design-campaign-authority-and-sync/specs/campaign-authority/spec.md
 */

import type Database from 'better-sqlite3';

import type { IEventJournal } from '@/lib/events/journal/EventJournalContract';
import type { SQLiteEventJournalWriter } from '@/lib/events/journal/SQLiteEventJournalWriter';
import type { ICampaignContractMarket } from '@/types/campaign/CampaignCommandExtensions';
import type {
  ICampaignAuthoritativeState,
  ICampaignEvent,
  ICampaignIntent,
} from '@/types/campaign/CampaignSync';

import { rehydrateContractMarket } from '@/lib/campaign/persistence/missionSerialization';
import { EXPECTED_HEAD_RESYNC_ACTION } from '@/lib/events/journal/EventHistoryExpectedHead';
import { ROOT_EVENT_BRANCH_ID } from '@/lib/events/journal/EventJournalContract';
import { validateCampaignIntent } from '@/lib/multiplayer/server/CampaignMatchHostIntent';

import type {
  CampaignCommandResult,
  ICampaignCommandRequest,
} from './campaignCommandPipeline';

import { replayCampaignEvents } from '../sync/applyCampaignEvent';
import { freezeCampaignEvent } from '../sync/campaignEventScope';
import {
  computeCampaignStateDigest,
  toJournalBatch,
  type ICampaignJournalEnvelope,
} from '../sync/JournalCampaignEventStore';

/**
 * The branch a campaign command commits to.
 *
 * A constant because `JournalCampaignEventStore` pins campaign streams to
 * the genesis branch, so this is a FACT about the pipeline rather than an
 * assumption about the journal. When the root-branch pin is lifted this
 * becomes a read of the resolved effective branch, and this function is
 * the only place that has to change.
 */
export function campaignCommandBranchId(): string {
  return ROOT_EVENT_BRANCH_ID;
}

/**
 * Why an accept-contract command could not find its offer in the source.
 *
 * All three are the same fact to a client - the offer is not durable yet -
 * but they are different faults to an operator: a campaign that has never
 * been saved, a saved campaign whose market has not caught up, and a
 * journal with no transaction-scoped source read at all.
 */
export type CampaignOfferDurabilityReason =
  /** The `campaigns` row, or its market, does not exist. */
  | 'source-record-absent'
  /** The market exists and does not hold this `contractId`. */
  | 'offer-absent'
  /** This journal exposes no prepared transaction to read the source in. */
  | 'source-read-unavailable';

/**
 * A command that lost the race at the append.
 *
 * The head comes from the FAILED APPEND, never from the replay above: by
 * definition something committed in between, so the replayed revision is
 * already history and sending a client back to it would send it somewhere
 * that no longer exists. `actualNextSequence` carries the journal's
 * `actualRevision`, and for a campaign stream the next sequence and the
 * revision are the same number (sequence N lives at revision N + 1).
 */
export function lostRaceConflict(
  expectedSequence: number,
  actualSequence: number,
): CampaignCommandResult {
  return {
    kind: 'conflict',
    reason: 'lost-race',
    head: { branchId: campaignCommandBranchId(), revision: actualSequence },
    // A lost race is not a field collision: this command never got to be
    // compared against anything. Resync is the honest advice.
    recoveryAction: EXPECTED_HEAD_RESYNC_ACTION,
    conflictingFields: [],
    expectedSequence,
    actualSequence,
  };
}

/**
 * The persisted source record, as one command's prepare step sees it.
 *
 * `sourceRecordBody` is the `SerializedCampaign` body re-serialized from the
 * stored payload - the exact string the private baseline records and the one
 * its digest is taken over, so the baseline stays self-consistent.
 */
interface ICampaignSourceMarketRead {
  readonly sourceRecordBody: string;
  /** The `campaigns` row `version` the body was read at (the CAS token). */
  readonly sourceRowVersion: number;
  readonly market: ICampaignContractMarket;
}

/**
 * Read the campaign's persisted contract market on a BORROWED handle.
 *
 * `null` means the source holds no market to look an offer up in - no row,
 * an unreadable body, or a body with no `contractMarket` - and the caller
 * must refuse. There is deliberately no fallback to anything the caller
 * supplied: accepting the caller's contract object is precisely the
 * "browser-generated offer persistence is NOT assumed" failure D13 forbids.
 *
 * The handle is the one the journal's prepared transaction already holds,
 * so this read and the append are one immediate transaction rather than two
 * a rival PUT can slip between. Opening a handle here (`getSQLiteService()`)
 * would reintroduce that window while looking identical at the call site.
 *
 * Synchronous and read-only by construction, as the prepared-transaction
 * contract requires: one `SELECT`, no writes, no retained statement.
 *
 * NOT a call into `replayCampaignSourceContracts`: that refuses with
 * `no-private-payload` when a stream holds no prior private row, which is
 * the state of every campaign before its FIRST acceptance - so a
 * stored-baseline read would deadlock exactly the case that must work.
 */
function readCampaignSourceMarket(
  db: Database.Database,
  campaignId: string,
): ICampaignSourceMarketRead | null {
  const row = db
    .prepare('SELECT version, payload FROM campaigns WHERE id = ?')
    .get(campaignId) as
    | { readonly version: number; readonly payload: string }
    | undefined;
  if (row === undefined) return null;
  const parsed = JSON.parse(row.payload) as {
    readonly body?: { readonly contractMarket?: ICampaignContractMarket };
  };
  const body = parsed.body;
  if (body === undefined) return null;
  const market = rehydrateContractMarket(body.contractMarket);
  if (market === undefined) return null;
  return {
    sourceRecordBody: JSON.stringify(body),
    sourceRowVersion: row.version,
    market,
  };
}

/**
 * A journal that can run a caller's read inside its own append transaction.
 *
 * Structural, and the signature is borrowed from the concrete writer rather
 * than restated, so the two cannot drift. `appendPreparedWithExtension` is
 * deliberately NOT on `IEventJournal` - an in-memory journal has no source
 * record to read and no transaction to read it in.
 */
type PreparedCampaignJournal = IEventJournal<ICampaignJournalEnvelope> &
  Pick<
    SQLiteEventJournalWriter<ICampaignJournalEnvelope>,
    'appendPreparedWithExtension'
  >;

function preparedJournalOf(
  journal: IEventJournal<ICampaignJournalEnvelope>,
): PreparedCampaignJournal | null {
  const candidate = journal as Partial<PreparedCampaignJournal>;
  return typeof candidate.appendPreparedWithExtension === 'function'
    ? (journal as PreparedCampaignJournal)
    : null;
}

/** What the prepared accept path hands back to the shared acknowledgement. */
type PreparedAcceptOutcome =
  | { readonly kind: 'refused'; readonly result: CampaignCommandResult }
  | {
      readonly kind: 'appended';
      readonly events: readonly ICampaignEvent[];
      readonly expectedDigest: string;
    };

function refuseAccept(result: CampaignCommandResult): PreparedAcceptOutcome {
  return { kind: 'refused', result };
}

/**
 * Accept a contract against the offer the SOURCE holds, in one transaction.
 *
 * The market read and the append share a single immediate transaction, so a
 * whole-envelope PUT cannot rewrite the market between the lookup that
 * authorised this acceptance and the commit that records it. The compact
 * fact is then derived from the stored offer - `employerFactionId` is the
 * exact opaque `IContract.employerId`, with no alias table and no case
 * folding - and the full contract plus the reduced market go to the
 * journal-private envelope, which no wire read path can reach.
 *
 * The caller's own `contract` object is used for nothing but naming the id
 * to look up. Deriving the committed name or employer from it would let a
 * browser mint a contract the source never stored.
 */
export async function appendDurableAcceptContract(
  journal: IEventJournal<ICampaignJournalEnvelope>,
  request: ICampaignCommandRequest,
  intent: Extract<ICampaignIntent, { kind: 'AcceptContract' }>,
  priorEvents: readonly ICampaignEvent[],
  priorState: ICampaignAuthoritativeState,
): Promise<PreparedAcceptOutcome> {
  const contractId = intent.payload.contract.contractId;
  const notDurable = (
    reason: CampaignOfferDurabilityReason,
  ): PreparedAcceptOutcome =>
    refuseAccept({ kind: 'offer-not-durable', contractId, reason });

  const prepared = preparedJournalOf(journal);
  if (prepared === null) return notDurable('source-read-unavailable');

  return prepared.appendPreparedWithExtension<
    { readonly events: readonly ICampaignEvent[]; readonly digest: string },
    PreparedAcceptOutcome
  >(
    (db) => {
      const source = readCampaignSourceMarket(db, request.campaignId);
      if (source === null) {
        return { kind: 'refused', result: notDurable('source-record-absent') };
      }
      const offer =
        source.market.offers.find((one) => one.id === contractId) ?? null;
      if (offer === null) {
        return { kind: 'refused', result: notDurable('offer-absent') };
      }

      // This prefix establishes only that the offer IS durable. Deriving
      // the committed compact fact from it, and writing the full contract
      // to the journal-private envelope, is the next prefix - so the fact
      // committed here is still the caller's, exactly as before.
      const validation = validateCampaignIntent(
        intent,
        priorState,
        request.authorPlayerId,
        request.ts,
      );
      if (!validation.ok) {
        return {
          kind: 'refused',
          result: refuseAccept({
            kind: 'rejected',
            reason: validation.reason,
          }),
        };
      }
      if (validation.events.length === 0) {
        return {
          kind: 'refused',
          result: refuseAccept({
            kind: 'rejected',
            reason: 'no-derived-events',
          }),
        };
      }

      const sequenced = validation.events.map((event, index) =>
        freezeCampaignEvent({ ...event, sequence: priorEvents.length + index }),
      ) as readonly ICampaignEvent[];
      const digest = computeCampaignStateDigest(
        replayCampaignEvents(request.campaignId, [
          ...priorEvents,
          ...sequenced,
        ]),
      );
      return {
        kind: 'ready',
        context: { events: sequenced, digest },
        raw: toJournalBatch({
          campaignId: request.campaignId,
          commandId: request.commandId,
          events: sequenced,
          expectedPostStateDigest: digest,
        }),
      };
    },
    (_db, context, append) => {
      const appended = append();
      if (appended.kind === 'revision-conflict') {
        return refuseAccept(
          lostRaceConflict(appended.expectedRevision, appended.actualRevision),
        );
      }
      if (appended.kind === 'command-identity-conflict') {
        return refuseAccept({
          kind: 'duplicate',
          commandId: appended.commandId,
        });
      }
      if (appended.kind !== 'committed') {
        return refuseAccept({
          kind: 'rejected',
          reason: 'journal-rejected-batch',
        });
      }
      return {
        kind: 'appended',
        events: context.events,
        expectedDigest: context.digest,
      };
    },
  );
}
