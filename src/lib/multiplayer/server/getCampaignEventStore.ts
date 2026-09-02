/**
 * getCampaignEventStore - environment-aware `ICampaignEventStore` selection
 * (umbrella task 8.1).
 *
 * The server-resident campaign host used to pick its event store inline:
 * durable when SQLite happened to be open, in-memory otherwise, silently.
 * A silent downgrade is the failure the `Server Journal Is Campaign
 * Authority` requirement exists to prevent - the in-memory log is a
 * projection, and a process that quietly ran a campaign on one would look
 * healthy right up until the restart that lost the campaign.
 *
 * So the choice is stated here, in the same shape as
 * `getDefaultMatchStore`, and it has three arms rather than two:
 *
 *   - SQLite open                     -> the durable journal store.
 *   - durability promised, no SQLite  -> THROW. The design's migration
 *     plan refuses in-memory substitutes as durability evidence, and a
 *     production process that cannot journal must fail where the
 *     operator can see it, not where the players can.
 *   - dev / test                      -> the ephemeral adapter, kept and
 *     announced. Unit tests and browser hosts have no database and must
 *     keep working; what they must not do is look durable.
 *
 * Rollback (design Migration Plan): `CAMPAIGN_EVENT_STORE=memory` forces
 * the ephemeral adapter everywhere, production included - an operator who
 * names the downgrade has accepted it, which is exactly the distinction
 * the production refusal is drawn on.
 *
 * @spec openspec/changes/harden-gm-two-player-campaign-sessions/specs/campaign-persistence/spec.md
 * @spec openspec/changes/harden-gm-two-player-campaign-sessions/design.md (Migration Plan)
 */

import type { ICampaignEventStore } from '@/lib/campaign/sync/ICampaignEventStore';
import type { ICampaignJournalEnvelope } from '@/lib/campaign/sync/JournalCampaignEventStore';

import { InMemoryCampaignEventStore } from '@/lib/campaign/sync/InMemoryCampaignEventStore';
import { bindJournalCapabilityPorts } from '@/lib/campaign/sync/journalCapabilityPorts';
import { JournalCampaignEventStore } from '@/lib/campaign/sync/JournalCampaignEventStore';
import { SQLiteEventJournal } from '@/lib/events/journal/SQLiteEventJournal';
import { getSQLiteService } from '@/services/persistence/SQLiteService';

/** Which log the selected store actually writes to. */
export type CampaignEventStoreDurability = 'journal' | 'ephemeral';

export interface ICampaignEventStoreSelection {
  readonly durability: CampaignEventStoreDurability;
  readonly store: ICampaignEventStore;
}

/**
 * Raised when a process that promised durable campaign authority cannot
 * open the journal. Typed so a caller can report the durability loss as
 * itself rather than as a generic boot failure.
 */
export class CampaignDurableStoreUnavailableError extends Error {
  constructor(reason: string) {
    super(
      `Durable campaign journal unavailable (${reason}); refusing an in-memory substitute`,
    );
    this.name = 'CampaignDurableStoreUnavailableError';
  }
}

/**
 * The process journal, constructed lazily. A campaign host is created on
 * a request path, so opening the database eagerly at module load would
 * make an unrelated import fail wherever SQLite is not initialised.
 */
function campaignJournal(): SQLiteEventJournal<ICampaignJournalEnvelope> {
  return new SQLiteEventJournal<ICampaignJournalEnvelope>(
    getSQLiteService().getDatabase(),
    () => new Date().toISOString(),
  );
}

/**
 * Whether this process has already been told it is running without a
 * durable campaign log. The fact is about the PROCESS, not about any one
 * campaign, so repeating it per host would bury the startup log without
 * adding information.
 */
let announcedEphemeral = false;

/** Test-only: let a suite observe the announcement more than once. */
export function _resetCampaignEventStoreAnnouncementForTests(): void {
  announcedEphemeral = false;
}

/** The kept dev/test adapter - loud on first use, quiet thereafter. */
function ephemeralSelection(): ICampaignEventStoreSelection {
  if (!announcedEphemeral) {
    announcedEphemeral = true;
    // eslint-disable-next-line no-console
    console.warn(
      '[CampaignEventStore] dev-only in-memory campaign log in use; campaign history will NOT survive a restart',
    );
  }
  return { durability: 'ephemeral', store: new InMemoryCampaignEventStore() };
}

/**
 * Pick the campaign event store for this process.
 *
 * Resolution order mirrors `shouldUseDurableStore`: the explicit
 * `CAMPAIGN_EVENT_STORE` override first (`durable` | `memory`), then the
 * live database, then the environment.
 */
export function selectCampaignEventStore(): ICampaignEventStoreSelection {
  const override = process.env.CAMPAIGN_EVENT_STORE?.toLowerCase();
  // Checked BEFORE the database: the lever's whole purpose is to keep a
  // process off the durable path even where the durable path would work.
  if (override === 'memory') {
    return ephemeralSelection();
  }
  if (getSQLiteService().isInitialized()) {
    return {
      durability: 'journal',
      // Server-only selection: bind ports here. The store no longer
      // imports journalCapabilityPorts itself, so a client bundle that
      // constructs the same class without this option stays off SQLite.
      store: new JournalCampaignEventStore(campaignJournal(), undefined, {
        capabilityPorts: bindJournalCapabilityPorts,
      }),
    };
  }
  if (override === 'durable') {
    throw new CampaignDurableStoreUnavailableError(
      'CAMPAIGN_EVENT_STORE=durable but SQLite is not initialized',
    );
  }
  if (process.env.NODE_ENV === 'production') {
    throw new CampaignDurableStoreUnavailableError(
      'production process has no initialized SQLite database',
    );
  }
  return ephemeralSelection();
}
