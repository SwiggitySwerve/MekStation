/**
 * The durable hire-offer command (K14b).
 *
 * The hire twin of `campaignAcceptContractCommand`, and lifted out of the
 * shared pipeline for the same reason: its validation input - the recruit
 * and the price - is not known until a SOURCE read has happened. Both come
 * from the personnel offer the persisted `SerializedCampaign` body holds,
 * never from the caller. A co-op guest used to send a `HirePilot` naming an
 * invented recruit and an invented cost, and the server trusted both.
 *
 * The market read, the append and the source-row write share one immediate
 * transaction, so a whole-envelope PUT cannot change the offer between the
 * read that priced the hire and the commit that records it.
 *
 * Rules: MekHQ e7adc2c `ForceHumanResources.recruitPerson`
 * (MekHQ/src/mekhq/campaign/ForceHumanResources.java:2548-2575) debits the
 * recruitment cost FIRST and enrols nobody when the debit fails.
 */

import type Database from 'better-sqlite3';

import type { IEventJournal } from '@/lib/events/journal/EventJournalContract';
import type { IAuthoritativePersonnelOffer } from '@/lib/multiplayer/server/CampaignMatchHostIntent';
import type {
  ICampaignAuthoritativeState,
  ICampaignEvent,
  ICampaignIntent,
} from '@/types/campaign/CampaignSync';
import type { SerializedCampaign } from '@/types/campaign/SerializedCampaign';

import { hireTransactionId } from '@/lib/campaign/markets/offerLifecycle';
import { validateCampaignIntent } from '@/lib/multiplayer/server/CampaignMatchHostIntent';
import { materializeCampaignSourceRow } from '@/services/campaignPersistence/campaignSourceMaterialization';
import { TransactionType } from '@/types/campaign/enums/TransactionType';

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
import {
  asRecord,
  lostRaceConflict,
  preparedJournalOf,
  storedRecordIsNotSource,
} from './campaignAcceptContractCommand';

/** A stored personnel offer, still in its JSON form. */
type StoredOffer = Readonly<Record<string, unknown>>;

/** The persisted source record, as one hire's prepare step sees it. */
interface ICampaignSourcePersonnelRead {
  /** The `campaigns` row `version` the body was read at (the CAS token). */
  readonly sourceRowVersion: number;
  /** The source's campaign clock, verbatim as the body stores it. */
  readonly campaignDate: string;
  readonly storedRecord: Readonly<Record<string, unknown>>;
  readonly storedBody: Readonly<Record<string, unknown>>;
  readonly storedFinances: Readonly<Record<string, unknown>>;
  readonly storedTransactions: readonly unknown[];
  readonly storedOffers: readonly StoredOffer[];
}

/**
 * Read the campaign's persisted personnel market on a BORROWED handle - the
 * prepared transaction's own, for the reason `readCampaignSourceMarket`
 * documents.
 *
 * `null` means the source holds nothing a hire can be judged against: no
 * row, an unreadable body, a non-source row (D2's source-mutation gate), a
 * body with no readable clock, or a market or ledger in a shape the row
 * write could not put back faithfully. An ABSENT market is an empty one:
 * the offer is then simply not found.
 */
function readCampaignSourcePersonnelMarket(
  db: Database.Database,
  campaignId: string,
): ICampaignSourcePersonnelRead | null {
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
  if (storedRecordIsNotSource(storedRecord)) return null;
  const campaignDate = storedBody.currentDate;
  if (
    typeof campaignDate !== 'string' ||
    Number.isNaN(new Date(campaignDate).getTime())
  ) {
    return null;
  }
  const storedFinances = asRecord(storedBody.finances);
  if (storedFinances === null) return null;
  const transactions = storedFinances.transactions ?? [];
  if (!Array.isArray(transactions)) return null;
  const market = storedBody.personnelMarket ?? [];
  if (!Array.isArray(market)) return null;
  const storedOffers = market.map((one) => asRecord(one));
  if (storedOffers.some((one) => one === null)) return null;
  return {
    sourceRowVersion: row.version,
    campaignDate,
    storedRecord,
    storedBody,
    storedFinances,
    storedTransactions: transactions,
    storedOffers: storedOffers as readonly StoredOffer[],
  };
}

/**
 * The stored offer as an authoritative hire fact, or `null` when it is not
 * one. Every field the hire commits must be PRESENT in the stored offer: a
 * missing price must never become a free recruit, and a missing name must
 * never become a pilot the market did not offer.
 */
function authoritativeOfferOf(
  stored: StoredOffer,
  campaignDate: string,
): IAuthoritativePersonnelOffer | null {
  const { id, name, hireCost, expirationDate } = stored;
  if (
    typeof id !== 'string' ||
    typeof name !== 'string' ||
    name.length === 0 ||
    typeof hireCost !== 'number' ||
    !Number.isFinite(hireCost) ||
    hireCost < 0 ||
    typeof expirationDate !== 'string' ||
    expirationDate.length === 0
  ) {
    return null;
  }
  return { offerId: id, name, hireCost, expirationDate, campaignDate };
}

/**
 * The `campaigns` row the source record becomes once the hire commits: the
 * offer leaves the market, the ledger gains the hire's expense under the id
 * K14a's `isPersonnelOfferConsumed` reads, and the balance is the journal's
 * post-hire balance. Everything else rides along as stored. The fence is
 * stamped by `materializeCampaignSourceRow`, which performs the write.
 */
function nextSourceRecordAfterHire(
  source: ICampaignSourcePersonnelRead,
  stored: StoredOffer,
  offer: IAuthoritativePersonnelOffer,
  balance: number,
): {
  readonly expectedRowVersion: number;
  readonly version: number;
  readonly balance: number;
  readonly record: SerializedCampaign;
} {
  const version = source.sourceRowVersion + 1;
  const role = typeof stored.role === 'string' ? ` (${stored.role})` : '';
  const nextBody = {
    ...source.storedBody,
    personnelMarket: source.storedOffers.filter(
      (one) => one.id !== offer.offerId,
    ),
    finances: {
      ...source.storedFinances,
      balance,
      transactions: [
        ...source.storedTransactions,
        {
          id: hireTransactionId(offer.offerId),
          type: TransactionType.Expense,
          amount: offer.hireCost,
          date: source.campaignDate,
          description: `Hired ${offer.name}${role}`,
        },
      ],
    },
  };
  return {
    expectedRowVersion: source.sourceRowVersion,
    version,
    balance,
    record: {
      ...source.storedRecord,
      version,
      body: nextBody,
    } as unknown as SerializedCampaign,
  };
}

/** What `prepare` carries to `extend` across the one transaction. */
interface IPreparedHireContext {
  readonly events: readonly ICampaignEvent[];
  readonly digest: string;
  readonly sourceRecord: ReturnType<typeof nextSourceRecordAfterHire>;
  /** The journal revision the materialized row will stand at. */
  readonly fenceRevision: number;
}

/** What the prepared hire path hands back to the shared acknowledgement. */
export type PreparedHireOutcome =
  | { readonly kind: 'refused'; readonly result: CampaignCommandResult }
  | {
      readonly kind: 'appended';
      readonly events: readonly ICampaignEvent[];
      readonly expectedDigest: string;
    };

function refuseHire(result: CampaignCommandResult): PreparedHireOutcome {
  return { kind: 'refused', result };
}

function rejectHire(reason: string): PreparedHireOutcome {
  return refuseHire({ kind: 'rejected', reason });
}

/**
 * Hire a personnel-market offer against the offer the SOURCE holds, in one
 * transaction. The caller's intent names the offer id and nothing else.
 */
export async function appendDurableHireOffer(
  journal: IEventJournal<ICampaignJournalEnvelope>,
  request: ICampaignCommandRequest,
  intent: Extract<ICampaignIntent, { kind: 'HireOffer' }>,
  priorEvents: readonly ICampaignEvent[],
  priorState: ICampaignAuthoritativeState,
): Promise<PreparedHireOutcome> {
  const offerId = intent.payload.offerId;
  const prepared = preparedJournalOf(journal);
  if (prepared === null) return rejectHire('offer-source-unavailable');
  // A retry of a hire that committed must read as the duplicate it is. The
  // committed hire consumed the offer, so the source read below would
  // otherwise answer `offer-not-found` and tell the caller its hire failed.
  if ((await journal.getCommandReceipt(request.commandId)) !== null) {
    return refuseHire({ kind: 'duplicate', commandId: request.commandId });
  }

  return prepared.appendPreparedWithExtension<
    IPreparedHireContext,
    PreparedHireOutcome
  >(
    (db) => {
      const source = readCampaignSourcePersonnelMarket(db, request.campaignId);
      if (source === null) {
        return {
          kind: 'refused',
          result: rejectHire('offer-source-unavailable'),
        };
      }
      const stored =
        source.storedOffers.find((one) => one.id === offerId) ?? null;
      const offer =
        stored === null
          ? null
          : authoritativeOfferOf(stored, source.campaignDate);

      // The one validator every authority shares, handed the offer THIS
      // transaction read. An unusable stored offer reads as not found.
      const validation = validateCampaignIntent(
        intent,
        priorState,
        request.authorPlayerId,
        request.ts,
        undefined,
        { personnelOffer: (id) => (id === offerId ? offer : null) },
      );
      if (!validation.ok) {
        return { kind: 'refused', result: rejectHire(validation.reason) };
      }
      if (validation.events.length === 0 || stored === null || offer === null) {
        return { kind: 'refused', result: rejectHire('no-derived-events') };
      }

      const sequenced = validation.events.map((event, index) =>
        freezeCampaignEvent({ ...event, sequence: priorEvents.length + index }),
      ) as readonly ICampaignEvent[];
      const postState = replayCampaignEvents(request.campaignId, [
        ...priorEvents,
        ...sequenced,
      ]);
      const digest = computeCampaignStateDigest(postState);
      return {
        kind: 'ready',
        context: {
          events: sequenced,
          digest,
          fenceRevision: priorEvents.length + sequenced.length,
          sourceRecord: nextSourceRecordAfterHire(
            source,
            stored,
            offer,
            postState.balance,
          ),
        },
        raw: toJournalBatch({
          campaignId: request.campaignId,
          commandId: request.commandId,
          events: sequenced,
          expectedPostStateDigest: digest,
        }),
      };
    },
    (db, context, append) => {
      const appended = append();
      if (appended.kind === 'revision-conflict') {
        return refuseHire(
          lostRaceConflict(appended.expectedRevision, appended.actualRevision),
        );
      }
      if (appended.kind === 'command-identity-conflict') {
        return refuseHire({ kind: 'duplicate', commandId: appended.commandId });
      }
      if (appended.kind !== 'committed') {
        return rejectHire('journal-rejected-batch');
      }
      // Same handle, same transaction: the ledger's hire and the row's
      // consumed offer are one write, so neither can exist without the other.
      const materialized = materializeCampaignSourceRow(db, {
        campaignId: request.campaignId,
        expectedRowVersion: context.sourceRecord.expectedRowVersion,
        fenceRevision: context.fenceRevision,
        record: context.sourceRecord.record,
        nextVersion: context.sourceRecord.version,
      });
      if (materialized.kind !== 'ok') {
        // Unreachable inside the one immediate transaction; throwing rolls
        // the append back with it, as the accept command does.
        throw new Error(
          `Source materialization did not apply: ${materialized.kind}`,
        );
      }
      // The summary column a campaign list reads; the payload's balance
      // moved, so the column moves with it in the same transaction.
      db.prepare('UPDATE campaigns SET balance = ? WHERE id = ?').run(
        context.sourceRecord.balance,
        request.campaignId,
      );
      return {
        kind: 'appended',
        events: context.events,
        expectedDigest: context.digest,
      };
    },
  );
}
