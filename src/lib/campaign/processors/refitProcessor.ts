/**
 * Refit Day Processor — day-pipeline integration
 *
 * Advances each `in-progress` refit order on the campaign by the day's
 * available tech-hours, mirroring how repair tickets are worked
 * (`add-campaign-refit-and-prestige` design D5). When a refit's
 * `hoursCompleted` reaches its `estimatedHours` the order completes: the
 * unit's campaign configuration (`campaign.unitConfigurations[unitId]`) is
 * replaced with the order's `targetConfiguration` and a day event is
 * emitted.
 *
 * Phase: UNITS — the "maintenance, parts, refits" block. A campaign with
 * no `in-progress` refit orders is a no-op (reference equality preserved).
 *
 * Tech-hour budget: per design D5 and the budget-sharing open question,
 * repairs consume the daily tech-hour pool first and refits consume the
 * remainder. This processor uses a fixed per-day refit allowance
 * (`DEFAULT_DAILY_REFIT_HOURS`) — the simplest policy that keeps refits
 * progressing without starving repairs.
 *
 * @spec openspec/changes/add-campaign-refit-and-prestige/specs/campaign-refit-and-prestige/spec.md
 * @module lib/campaign/processors/refitProcessor
 */

import type { ICampaign } from '@/types/campaign/Campaign';
import type { IRefitOrder } from '@/types/campaign/Refit';
import type { MechBuildConfig } from '@/utils/construction/constructionRules/types';

import {
  DayPhase,
  type IDayEvent,
  type IDayProcessor,
  type IDayProcessorResult,
} from '../dayPipeline';
import {
  DEFAULT_DAILY_REFIT_HOURS,
  applyRefitHours,
} from '../refit/refitPipeline';

/**
 * Day-pipeline processor: advances every `in-progress` refit order by the
 * day's available tech-hours and completes a refit when its hour budget is
 * met.
 *
 * Runs in `DayPhase.UNITS`. Order-tolerant: it only depends on
 * `campaign.refitOrders` being populated by the time it runs.
 */
export const refitProcessor: IDayProcessor = {
  id: 'refit',
  phase: DayPhase.UNITS,
  displayName: 'Unit Refit',

  process(campaign: ICampaign): IDayProcessorResult {
    const orders = campaign.refitOrders ?? [];

    // Fast exit — no in-progress refits means nothing to do.
    const hasActive = orders.some((o) => o.status === 'in-progress');
    if (!hasActive) {
      return { events: [], campaign };
    }

    const events: IDayEvent[] = [];
    const existingConfigs = campaign.unitConfigurations ?? {};
    const nextConfigs: Record<string, MechBuildConfig> = { ...existingConfigs };

    const nextOrders: IRefitOrder[] = orders.map((order) => {
      if (order.status !== 'in-progress') {
        return order;
      }

      const result = applyRefitHours(order, DEFAULT_DAILY_REFIT_HOURS);

      if (result.completed) {
        // Replace the unit's campaign configuration with the target.
        nextConfigs[order.unitId] = order.targetConfiguration;
        events.push({
          type: 'refit-completed',
          description: `Refit of ${order.unitId} completed (${order.refitClass})`,
          severity: 'info',
          data: {
            refitOrderId: order.id,
            unitId: order.unitId,
            refitClass: order.refitClass,
            estimatedHours: order.estimatedHours,
          },
        });
      } else {
        events.push({
          type: 'refit-progressed',
          description: `Refit of ${order.unitId} advanced ${result.hoursConsumed}h (${result.order.hoursCompleted}/${order.estimatedHours}h)`,
          severity: 'info',
          data: {
            refitOrderId: order.id,
            unitId: order.unitId,
            hoursConsumed: result.hoursConsumed,
            hoursCompleted: result.order.hoursCompleted,
            estimatedHours: order.estimatedHours,
          },
        });
      }

      return result.order;
    });

    const updatedCampaign: ICampaign = {
      ...campaign,
      refitOrders: nextOrders,
      unitConfigurations: nextConfigs,
    };

    return { events, campaign: updatedCampaign };
  },
};
