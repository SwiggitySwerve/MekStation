/**
 * Market Processors - Day pipeline processors for campaign market systems
 *
 * Three processors that integrate market generation into the day pipeline:
 * - unitMarketProcessor: Monthly unit market refresh (AtB style)
 * - personnelMarketProcessor: Daily personnel market generation
 * - contractMarketProcessor: Monthly contract market refresh (AtB style)
 *
 * Each processor checks its corresponding campaign option before running.
 *
 * Per audit finding D-7 (2026-06-09, remediation W3.4): generated offers
 * are STORED on the campaign's command-extension fields (`unitMarket`,
 * `personnelMarket`, `contractMarket`) — the surfaces the command UI
 * pages read — instead of being discarded while the day report claimed a
 * refresh happened.
 *
 * Per audit finding D-10 (same wave): offer rolls draw from the
 * campaign's seeded daily streams (`createDailyRandom`) instead of raw
 * `Math.random`, so market refreshes are replayable.
 *
 * @module lib/campaign/processors/marketProcessors
 */

import { generateAtBContracts } from '@/lib/campaign/contractMarket';
import {
  generatePersonnelForDay,
  removeExpiredOffers,
} from '@/lib/campaign/markets/personnelMarket';
import { generateUnitOffers } from '@/lib/campaign/markets/unitMarket';
import { createDailyRandom } from '@/lib/campaign/utils/campaignRng';
import { ICampaign } from '@/types/campaign/Campaign';
import { ICampaignWithCommand } from '@/types/campaign/CampaignCommandExtensions';

import {
  IDayProcessor,
  IDayProcessorResult,
  DayPhase,
  IDayEvent,
  isFirstOfMonth,
} from '../dayPipeline';

// =============================================================================
// Unit Market Processor
// =============================================================================

/**
 * Refreshes the unit market on the first of each month.
 *
 * Checks `campaign.options.unitMarketMethod` — skips if 'none' or undefined.
 * Only generates offers on the first day of the month using `isFirstOfMonth`.
 * The refresh REPLACES the previous pool (old offers expire at end of the
 * previous month by construction) and stores it on `campaign.unitMarket`.
 */
export const unitMarketProcessor: IDayProcessor = {
  id: 'unit-market',
  phase: DayPhase.MARKETS,
  displayName: 'Unit Market Refresh',

  process(campaign: ICampaign, date: Date): IDayProcessorResult {
    const method = campaign.options.unitMarketMethod;
    if (!method || method === 'none') {
      return { events: [], campaign };
    }

    if (!isFirstOfMonth(date)) {
      return { events: [], campaign };
    }

    // D-10: seeded per-(campaign, day, processor) stream, not Math.random.
    const offers = generateUnitOffers(
      campaign,
      createDailyRandom(campaign, date, 'unit-market'),
    );
    const events: IDayEvent[] = [
      {
        type: 'market_refresh',
        description: `Unit market refreshed with ${offers.length} offers`,
        severity: 'info',
        data: { market: 'unit', offerCount: offers.length },
      },
    ];

    // D-7: store the generated pool where consumers (and persistence)
    // read it — a refresh replaces last month's expired offers wholesale.
    const updated: ICampaignWithCommand = { ...campaign, unitMarket: offers };
    return { events, campaign: updated };
  },
};

// =============================================================================
// Personnel Market Processor
// =============================================================================

/**
 * Generates daily personnel market offers.
 *
 * Checks `campaign.options.personnelMarketStyle` — skips if 'disabled' or
 * undefined. Runs every day (personnel market refreshes daily). The day's
 * new candidates JOIN the existing pool on `campaign.personnelMarket`
 * (the surface the Personnel & Hiring page reads, CP2b design D2) after
 * offers past their expiration date are pruned via `removeExpiredOffers`.
 */
export const personnelMarketProcessor: IDayProcessor = {
  id: 'personnel-market',
  phase: DayPhase.MARKETS,
  displayName: 'Personnel Market Refresh',

  process(campaign: ICampaign, date: Date): IDayProcessorResult {
    const style = campaign.options.personnelMarketStyle;
    if (!style || style === 'disabled') {
      return { events: [], campaign };
    }

    // D-10: seeded per-(campaign, day, processor) stream, not Math.random.
    const offers = generatePersonnelForDay(
      campaign,
      createDailyRandom(campaign, date, 'personnel-market'),
    );
    const events: IDayEvent[] = [
      {
        type: 'market_refresh',
        description: `Personnel market refreshed with ${offers.length} candidates`,
        severity: 'info',
        data: { market: 'personnel', offerCount: offers.length },
      },
    ];

    // D-7: prune expired carry-over offers, then append the day's new
    // candidates to the pool the hiring page reads.
    const extended = campaign as ICampaignWithCommand;
    const currentDateKey = campaign.currentDate.toISOString().split('T')[0];
    const retained = removeExpiredOffers(
      extended.personnelMarket ?? [],
      currentDateKey,
    );
    const updated: ICampaignWithCommand = {
      ...campaign,
      personnelMarket: [...retained, ...offers],
    };
    return { events, campaign: updated };
  },
};

// =============================================================================
// Contract Market Processor
// =============================================================================

/**
 * Refreshes the contract market on the first of each month.
 *
 * Checks `campaign.options.contractMarketMethod` — skips if 'none' or
 * undefined. Only generates contracts on the first day of the month using
 * `isFirstOfMonth`. The refresh REPLACES `campaign.contractMarket.offers`
 * and clears `declinedOfferIds` — per the `ICampaignContractMarket`
 * contract, declined offers stay hidden only "until the next
 * contractMarketProcessor refresh replaces the offers list".
 */
export const contractMarketProcessor: IDayProcessor = {
  id: 'contract-market',
  phase: DayPhase.MARKETS,
  displayName: 'Contract Market Refresh',

  process(campaign: ICampaign, date: Date): IDayProcessorResult {
    const method = campaign.options.contractMarketMethod;
    if (!method || method === 'none') {
      return { events: [], campaign };
    }

    if (!isFirstOfMonth(date)) {
      return { events: [], campaign };
    }

    // D-10: seeded stream threaded through the generator's trailing
    // RandomFn parameter (count/negotiator/standing keep their defaults).
    const contracts = generateAtBContracts(
      campaign,
      undefined,
      undefined,
      undefined,
      createDailyRandom(campaign, date, 'contract-market'),
    );
    const events: IDayEvent[] = [
      {
        type: 'market_refresh',
        description: `Contract market refreshed with ${contracts.length} contracts`,
        severity: 'info',
        data: { market: 'contract', contractCount: contracts.length },
      },
    ];

    // D-7: a refresh starts a new market cycle — offers replaced,
    // declined ids reset so previously-hidden offers can reappear.
    const updated: ICampaignWithCommand = {
      ...campaign,
      contractMarket: { offers: contracts, declinedOfferIds: [] },
    };
    return { events, campaign: updated };
  },
};
