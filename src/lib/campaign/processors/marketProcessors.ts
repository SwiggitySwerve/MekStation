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
 * @module lib/campaign/processors/marketProcessors
 */

import { IDayProcessor, IDayProcessorResult, DayPhase, IDayEvent, isFirstOfMonth } from '../dayPipeline';
import { ICampaign } from '@/types/campaign/Campaign';
import { generateUnitOffers } from '@/lib/campaign/markets/unitMarket';
import { generatePersonnelForDay } from '@/lib/campaign/markets/personnelMarket';
import { generateAtBContracts } from '@/lib/campaign/contractMarket';

// =============================================================================
// Unit Market Processor
// =============================================================================

/**
 * Refreshes the unit market on the first of each month.
 *
 * Checks `campaign.options.unitMarketMethod` — skips if 'none' or undefined.
 * Only generates offers on the first day of the month using `isFirstOfMonth`.
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

    const offers = generateUnitOffers(campaign, Math.random);
    const events: IDayEvent[] = [
      {
        type: 'market_refresh',
        description: `Unit market refreshed with ${offers.length} offers`,
        severity: 'info',
        data: { market: 'unit', offerCount: offers.length },
      },
    ];

    return { events, campaign };
  },
};

// =============================================================================
// Personnel Market Processor
// =============================================================================

/**
 * Generates daily personnel market offers.
 *
 * Checks `campaign.options.personnelMarketStyle` — skips if 'disabled' or undefined.
 * Runs every day (personnel market refreshes daily).
 */
export const personnelMarketProcessor: IDayProcessor = {
  id: 'personnel-market',
  phase: DayPhase.MARKETS,
  displayName: 'Personnel Market Refresh',

  process(campaign: ICampaign): IDayProcessorResult {
    const style = campaign.options.personnelMarketStyle;
    if (!style || style === 'disabled') {
      return { events: [], campaign };
    }

    const offers = generatePersonnelForDay(campaign, Math.random);
    const events: IDayEvent[] = [
      {
        type: 'market_refresh',
        description: `Personnel market refreshed with ${offers.length} candidates`,
        severity: 'info',
        data: { market: 'personnel', offerCount: offers.length },
      },
    ];

    return { events, campaign };
  },
};

// =============================================================================
// Contract Market Processor
// =============================================================================

/**
 * Refreshes the contract market on the first of each month.
 *
 * Checks `campaign.options.contractMarketMethod` — skips if 'none' or undefined.
 * Only generates contracts on the first day of the month using `isFirstOfMonth`.
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

    const contracts = generateAtBContracts(campaign);
    const events: IDayEvent[] = [
      {
        type: 'market_refresh',
        description: `Contract market refreshed with ${contracts.length} contracts`,
        severity: 'info',
        data: { market: 'contract', contractCount: contracts.length },
      },
    ];

    return { events, campaign };
  },
};
