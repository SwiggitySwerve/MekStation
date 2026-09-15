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
import type { SerializedCampaign } from '@/types/campaign/SerializedCampaign';

import { rehydrateContractMarket } from '@/lib/campaign/persistence/missionSerialization';
import { EXPECTED_HEAD_RESYNC_ACTION } from '@/lib/events/journal/EventHistoryExpectedHead';
import { ROOT_EVENT_BRANCH_ID } from '@/lib/events/journal/EventJournalContract';
import { validateCampaignIntent } from '@/lib/multiplayer/server/CampaignMatchHostIntent';
import { materializeCampaignSourceRow } from '@/services/campaignPersistence/campaignSourceMaterialization';
import { MissionStatus } from '@/types/campaign/enums/MissionStatus';
import { isContract } from '@/types/campaign/Mission';

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
import { isSourceInstance, parseCampaignAuthority } from './campaignAuthority';
import { buildCampaignSourcePrivateEnvelope } from './campaignSourcePrivateEnvelope';

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
  /**
   * The `campaigns` row does not exist, cannot be read, or is not a record
   * this command may write - a replica, per D2's source-mutation gate.
   */
  | 'source-record-absent'
  /**
   * The market reads fine and holds no USABLE contract under this
   * `contractId` - absent, or present as something that is not a faithfully
   * serialized offer.
   */
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

/** One `[missionId, mission]` pair as the serialized body stores them. */
type StoredMissionEntry = readonly unknown[];
/** A stored offer, still in its JSON form - never rehydrated. */
type StoredOffer = Readonly<Record<string, unknown>>;

/**
 * The persisted source record, as one command's prepare step sees it.
 *
 * `sourceRecordBody` is the `SerializedCampaign` body re-serialized from the
 * stored payload - the exact string the private baseline records and the one
 * its digest is taken over, so the baseline stays self-consistent.
 *
 * `market` is REHYDRATED (its `Money` fields are objects) because that is
 * what validation and the private envelope consume. The `stored*` fields are
 * the raw JSON the row holds, and they are what the row write puts back, so
 * an untouched field round-trips byte-identically instead of being
 * re-serialized through a rehydration this command never needed.
 */
interface ICampaignSourceMarketRead {
  readonly sourceRecordBody: string;
  /** The `campaigns` row `version` the body was read at (the CAS token). */
  readonly sourceRowVersion: number;
  readonly market: ICampaignContractMarket;
  /** The stored envelope, parsed - everything outside `body` rides along. */
  readonly storedRecord: Readonly<Record<string, unknown>>;
  readonly storedBody: Readonly<Record<string, unknown>>;
  readonly storedMarket: Readonly<Record<string, unknown>>;
  readonly storedOffers: readonly StoredOffer[];
  readonly storedMissions: readonly StoredMissionEntry[];
}

function asRecord(value: unknown): Readonly<Record<string, unknown>> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Readonly<Record<string, unknown>>)
    : null;
}

/**
 * The stored `missions` map, or `null` when the body does not hold one.
 *
 * Absent is tolerated (`rehydrateMissionMap` already treats it as empty),
 * but a `missions` that is not an array of pair arrays is NOT: the row write
 * below indexes every entry's key, and a body that cannot answer "which
 * mission is this" is a body this command must refuse rather than rewrite.
 */
function storedMissionsOf(
  body: Readonly<Record<string, unknown>>,
): readonly StoredMissionEntry[] | null {
  const missions = body.missions;
  if (missions === undefined) return [];
  if (!Array.isArray(missions)) return null;
  return missions.every((entry) => Array.isArray(entry))
    ? (missions as readonly StoredMissionEntry[])
    : null;
}

/**
 * True when the stored record's authority PARSES as something other than
 * source - the one state this command must not write into.
 *
 * Deliberately `parsed-and-not-source`, never `not-parsed-as-source`: a
 * record predating D2 carries no `authority` at all, `parseCampaignAuthority`
 * answers `failed` for it, and refusing those would refuse every legacy row.
 * `saveCampaign` can afford the stricter reading because it re-stamps the
 * authority it writes; this command only reads, so it declines to invent a
 * verdict about a record that never claimed one.
 */
function storedRecordIsNotSource(
  storedRecord: Readonly<Record<string, unknown>>,
): boolean {
  const parsed = parseCampaignAuthority(storedRecord.authority);
  return parsed.kind === 'ok' && !isSourceInstance(parsed.authority);
}

/**
 * A stored payment amount `rehydrateMoney` reads as an AMOUNT rather than
 * silently defaulting to zero. Mirrors that function's accepted shapes
 * (`missionSerialization.ts:19-27`) instead of narrowing to the `number`
 * `Money.toJSON` emits, so a legacy row it can already read stays readable.
 */
function isStoredMoney(value: unknown): boolean {
  if (typeof value === 'number') return true;
  const record = asRecord(value);
  return (
    record !== null &&
    (typeof record.amount === 'number' || typeof record.centsValue === 'number')
  );
}

/** Every field `IPaymentTerms` declares as an amount. */
const STORED_PAYMENT_AMOUNT_FIELDS = [
  'basePayment',
  'successPayment',
  'partialPayment',
  'failurePayment',
  'transportPayment',
  'supportPayment',
] as const;

/**
 * True when the RAW stored offer is a faithfully serialized contract.
 *
 * `isContract` alone is not enough here, and the reason is specific to this
 * command: the raw offer is copied VERBATIM into the source record, so
 * whatever it omits becomes a mission the campaign claims to have accepted.
 * `isContract` accepts any non-null `paymentTerms` object, so `{}` passes it
 * - and rehydration then turns every missing amount into `Money.ZERO`, which
 * is a contract worth nothing presented as one the campaign signed. A field
 * that would be silently invented is exactly the "must be refused rather
 * than rewritten" case the source read already takes on.
 */
function isStoredContractOffer(offer: StoredOffer): boolean {
  if (!isContract(offer)) return false;
  const terms = asRecord(offer.paymentTerms);
  if (terms === null) return false;
  return (
    typeof terms.salvagePercent === 'number' &&
    STORED_PAYMENT_AMOUNT_FIELDS.every((field) => isStoredMoney(terms[field]))
  );
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
 *
 * TOTAL by construction: an unparseable payload, a body that is not an
 * object, a market whose `offers` is not an array of objects, and a
 * `missions` that is not the serialized map all return `null` and become the
 * typed `source-record-absent` refusal. They used to throw out of the
 * prepared transaction as an untyped 500, which told a caller nothing and
 * looked like a server fault rather than an unusable source record.
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
  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(row.payload);
  } catch {
    return null;
  }
  const storedRecord = asRecord(parsedJson);
  const storedBody = storedRecord === null ? null : asRecord(storedRecord.body);
  if (storedRecord === null || storedBody === null) return null;
  // D2's source-mutation gate, honored here because the acceptance's row
  // write is a writer of `campaigns` like any other. `saveCampaign` runs it
  // through `prepareCampaignWrite` and `storeRedeemedReplica` runs its own
  // would-overwrite-source refusal; this command must not be the one door
  // into that table that skips it.
  if (storedRecordIsNotSource(storedRecord)) return null;
  const storedMarket = asRecord(storedBody.contractMarket);
  if (storedMarket === null) return null;
  const rawOffers = storedMarket.offers;
  if (!Array.isArray(rawOffers)) return null;
  const storedOffers = rawOffers.map((one) => asRecord(one));
  if (storedOffers.some((one) => one === null)) return null;
  const storedMissions = storedMissionsOf(storedBody);
  if (storedMissions === null) return null;
  const market = rehydrateContractMarket(
    storedBody.contractMarket as ICampaignContractMarket,
  );
  if (market === undefined) return null;
  return {
    sourceRecordBody: JSON.stringify(storedBody),
    sourceRowVersion: row.version,
    market,
    storedRecord,
    storedBody,
    storedMarket,
    storedOffers: storedOffers as readonly StoredOffer[],
    storedMissions,
  };
}

/**
 * The `campaigns` row the source record becomes once the acceptance commits.
 *
 * Built from the RAW stored offer rather than the rehydrated one, so the
 * mission the row gains is byte-for-byte the offer it already held with the
 * one field acceptance changes - `status: ACTIVE`, exactly what the client's
 * `acceptContractOffer` writes through `acceptContract`. The market loses
 * that offer and keeps everything else, including `declinedOfferIds`.
 *
 * Any prior entry under this id is dropped before the accepted one is
 * appended: the serialized `missions` is a Map's entries, so two entries
 * under one key is a shape no reader expects, and a body that somehow
 * carried one must not be turned into two by this write.
 *
 * `version` advances because that column IS the whole-envelope PUT's
 * compare-and-swap token, and it lives in two places a client can see - the
 * row and the envelope GET returns - which must agree. A client still
 * holding the pre-acceptance version therefore loses the CAS and takes the
 * existing 409 path. Closing that window is task 6.4's bridge, not this
 * write's job; this write is what makes the window honest.
 *
 * The record is handed back unserialized and WITHOUT a fence: stamping the
 * `sourceReplayFence` belongs to `materializeCampaignSourceRow`, which is the
 * thing that actually performs the write and therefore the only thing that
 * can record a watermark guaranteed to match it.
 */
function nextSourceRecordAfterAccept(
  source: ICampaignSourceMarketRead,
  contractId: string,
  acceptedOffer: StoredOffer,
): {
  readonly expectedRowVersion: number;
  readonly version: number;
  readonly record: SerializedCampaign;
} {
  const version = source.sourceRowVersion + 1;
  const nextBody = {
    ...source.storedBody,
    missions: [
      ...source.storedMissions.filter((entry) => entry[0] !== contractId),
      [contractId, { ...acceptedOffer, status: MissionStatus.ACTIVE }],
    ],
    contractMarket: {
      ...source.storedMarket,
      offers: source.storedOffers.filter((one) => one.id !== contractId),
    },
  };
  return {
    expectedRowVersion: source.sourceRowVersion,
    version,
    record: {
      ...source.storedRecord,
      version,
      body: nextBody,
    } as unknown as SerializedCampaign,
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

/** What `prepare` carries to `extend` across the one transaction. */
interface IPreparedAcceptContext {
  readonly events: readonly ICampaignEvent[];
  readonly digest: string;
  /** The row the source record becomes, applied only after the append. */
  readonly sourceRecord: {
    readonly expectedRowVersion: number;
    readonly version: number;
    readonly record: SerializedCampaign;
  };
  /**
   * The journal revision the materialized row will stand AT: every prior
   * campaign event plus the ones this acceptance appends. Strictly greater
   * than any fence the row can already carry, which is why a committing
   * acceptance never meets its own no-op or stale-replay guard.
   */
  readonly fenceRevision: number;
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
    IPreparedAcceptContext,
    PreparedAcceptOutcome
  >(
    (db) => {
      const source = readCampaignSourceMarket(db, request.campaignId);
      if (source === null) {
        return { kind: 'refused', result: notDurable('source-record-absent') };
      }
      const offer =
        source.market.offers.find((one) => one.id === contractId) ?? null;
      const storedOffer =
        source.storedOffers.find((one) => one.id === contractId) ?? null;
      // `offer-absent` rather than `source-record-absent` for an entry that
      // is present but unusable, and the choice is deliberate: the record
      // and its market READ FINE - rows (c)/(c2)/(c3) own the case where
      // they do not - and only this one entry fails to be an offer. Telling
      // the caller the source record is absent would send an operator to
      // investigate a record that is perfectly readable, while
      // `offer-absent` names what is true and points at the recovery that
      // can actually work: get a usable offer to the source, then retry.
      if (
        offer === null ||
        storedOffer === null ||
        !isStoredContractOffer(storedOffer)
      ) {
        return { kind: 'refused', result: notDurable('offer-absent') };
      }

      // Validation runs against the SERVER-DERIVED compact fact, so the
      // faction-standing gate judges the employer the source stored rather
      // than the one the caller typed.
      const validation = validateCampaignIntent(
        {
          ...intent,
          payload: {
            contract: {
              contractId: offer.id,
              name: offer.name,
              employerFactionId: offer.employerId,
            },
          },
        },
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
        context: {
          events: sequenced,
          digest,
          fenceRevision: priorEvents.length + sequenced.length,
          // Computed here, where the source read is in hand, and APPLIED
          // below only once the append has committed - `prepare` stays
          // read-only, and the row never moves for a command that did not.
          sourceRecord: nextSourceRecordAfterAccept(
            source,
            contractId,
            storedOffer,
          ),
        },
        raw: toJournalBatch({
          campaignId: request.campaignId,
          commandId: request.commandId,
          events: sequenced,
          expectedPostStateDigest: digest,
          sourcePrivate: buildCampaignSourcePrivateEnvelope({
            baseline: {
              sourceRecordBody: source.sourceRecordBody,
              sourceRowVersion: source.sourceRowVersion,
              rootPublicRevision: priorEvents.length,
            },
            acceptedContract: offer,
            remainingMarket: {
              ...source.market,
              offers: source.market.offers.filter(
                (one) => one.id !== contractId,
              ),
            },
          }),
        }),
      };
    },
    (db, context, append) => {
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
      // The source record follows the commit, on the SAME handle and inside
      // the SAME transaction: the compact ledger entry and the row's mission
      // plus reduced market are one write, so the state the spec calls
      // unreachable - a ledger holding an acceptance the source record does
      // not - has no window to exist in.
      //
      // Routed through the service's fenced writer (task 6.1) rather than
      // written raw, so the write carries the compare-and-swap predicate and
      // leaves the durable `sourceReplayFence` a later replay is judged by.
      const materialized = materializeCampaignSourceRow(db, {
        campaignId: request.campaignId,
        expectedRowVersion: context.sourceRecord.expectedRowVersion,
        fenceRevision: context.fenceRevision,
        record: context.sourceRecord.record,
        nextVersion: context.sourceRecord.version,
      });
      if (materialized.kind !== 'ok') {
        // Unreachable from here: the row read, the append and this write are
        // one immediate transaction, and the new fence is strictly above any
        // the row can hold. Throwing rather than returning a refusal is
        // deliberate - it rolls the transaction back, append included, so a
        // ledger entry can never survive a materialization that did not.
        throw new Error(
          `Source materialization did not apply: ${materialized.kind}`,
        );
      }
      return {
        kind: 'appended',
        events: context.events,
        expectedDigest: context.digest,
      };
    },
  );
}
