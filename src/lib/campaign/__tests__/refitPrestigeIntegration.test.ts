/**
 * Integration tests for the refit + prestige/morale campaign systems
 * (`add-campaign-refit-and-prestige`, tasks 9.1 and 9.2).
 *
 * 9.1 — launch a refit, advance days until it completes, the unit
 *       configuration is swapped.
 * 9.2 — a sequence of victories and defeats moves the company morale state
 *       and updates per-unit prestige.
 *
 * @spec openspec/changes/add-campaign-refit-and-prestige/specs/campaign-refit-and-prestige/spec.md
 */

import type { ICampaign } from '@/types/campaign/Campaign';
import type { ICombatOutcome } from '@/types/combat/CombatOutcome';
import type { MechBuildConfig } from '@/utils/construction/constructionRules/types';

import { CampaignType } from '@/types/campaign/CampaignType';
import { createDefaultCampaignOptions } from '@/types/campaign/createDefaultCampaignOptions';
import { Money } from '@/types/campaign/Money';
import { MoraleState } from '@/types/campaign/Prestige';
import { ArmorTypeEnum } from '@/types/construction/ArmorType';
import { CockpitType } from '@/types/construction/CockpitType';
import { EngineType } from '@/types/construction/EngineType';
import { GyroType } from '@/types/construction/GyroType';
import { HeatSinkType } from '@/types/construction/HeatSinkType';
import { InternalStructureType } from '@/types/construction/InternalStructureType';

import { _resetDayPipeline, getDayPipeline } from '../dayPipeline';
import { applyOutcomePrestige } from '../prestige/applyOutcomePrestige';
import { moraleProcessor } from '../processors/moraleProcessor';
import { refitProcessor } from '../processors/refitProcessor';
import { advanceRefitOrder, createRefitOrder } from '../refit/refitPipeline';

const TEST_DATE = new Date('3025-02-01T00:00:00.000Z');

const CURRENT_CONFIG: MechBuildConfig = {
  tonnage: 50,
  engineRating: 250,
  engineType: EngineType.STANDARD,
  gyroType: GyroType.STANDARD,
  internalStructureType: InternalStructureType.STANDARD,
  armorType: ArmorTypeEnum.STANDARD,
  totalArmorPoints: 160,
  cockpitType: CockpitType.STANDARD,
  heatSinkType: HeatSinkType.SINGLE,
  totalHeatSinks: 10,
  jumpMP: 0,
};

const TARGET_CONFIG: MechBuildConfig = {
  ...CURRENT_CONFIG,
  totalArmorPoints: 200,
};

function makeCampaign(overrides: Partial<ICampaign> = {}): ICampaign {
  return {
    id: 'camp-1',
    name: 'Integration Campaign',
    currentDate: TEST_DATE,
    factionId: 'mercenary',
    forces: new Map(),
    rootForceId: 'force-root',
    missions: new Map(),
    finances: { transactions: [], balance: new Money(0) },
    factionStandings: {},
    options: createDefaultCampaignOptions(),
    campaignType: CampaignType.MERCENARY,
    createdAt: TEST_DATE.toISOString(),
    updatedAt: TEST_DATE.toISOString(),
    unitCombatStates: {},
    ...overrides,
  };
}

describe('refit integration — launch, advance, swap (task 9.1)', () => {
  beforeEach(() => {
    _resetDayPipeline();
    getDayPipeline().register(refitProcessor);
  });

  afterEach(() => {
    _resetDayPipeline();
  });

  it('completes a refit over multiple days and swaps the unit configuration', () => {
    // Launch a refit: create the proposed order, then advance it through
    // the construction-validation gate to in-progress.
    const proposed = createRefitOrder({
      id: 'refit-int-1',
      unitId: 'unit-1',
      currentConfiguration: CURRENT_CONFIG,
      targetConfiguration: TARGET_CONFIG,
      createdAt: TEST_DATE.toISOString(),
    });
    const advanced = advanceRefitOrder(proposed);
    expect(advanced.advanced).toBe(true);
    expect(advanced.order.status).toBe('in-progress');

    let campaign = makeCampaign({ refitOrders: [advanced.order] });
    const estimatedHours = advanced.order.estimatedHours;

    // Advance days until the refit completes. The processor consumes a
    // fixed per-day allowance — bound the loop generously.
    let days = 0;
    const maxDays = Math.ceil(estimatedHours / 8) + 5;
    while (days < maxDays) {
      const result = getDayPipeline().processDay(campaign);
      campaign = result.campaign;
      days += 1;
      const order = campaign.refitOrders?.[0];
      if (order?.status === 'completed') break;
    }

    const finalOrder = campaign.refitOrders?.[0];
    expect(finalOrder?.status).toBe('completed');
    // The unit's campaign configuration is now the refit target.
    expect(campaign.unitConfigurations?.['unit-1']).toEqual(TARGET_CONFIG);
  });
});

describe('prestige + morale integration — battle sequence (task 9.2)', () => {
  beforeEach(() => {
    _resetDayPipeline();
    getDayPipeline().register(moraleProcessor);
  });

  afterEach(() => {
    _resetDayPipeline();
  });

  /** Build a win/loss outcome stub for a single player unit. */
  function outcome(
    matchId: string,
    winner: 'player' | 'opponent',
  ): ICombatOutcome {
    return {
      matchId,
      report: { winner },
      unitDeltas: [
        {
          unitId: 'unit-1',
          side: 'player',
          destroyed: false,
          finalStatus: winner === 'player' ? 'damaged' : 'crippled',
          armorRemaining: {},
          internalsRemaining: {},
          destroyedLocations: [],
          destroyedComponents: [],
          heatEnd: 0,
          ammoRemaining: {},
          pilotState: {
            conscious: true,
            wounds: 0,
            killed: false,
            finalStatus: 'active',
          },
        },
      ],
    } as unknown as ICombatOutcome;
  }

  it('raises morale and prestige across a victory streak', () => {
    let campaign = makeCampaign({ moraleState: MoraleState.Steady });
    let prestige = campaign.unitPrestige ?? [];

    // Three days, each with a victory. Stage the day's outcome on
    // `recentlyAppliedOutcomes` (the post-battle processor does this live)
    // and apply the prestige step.
    for (let day = 0; day < 3; day += 1) {
      const dayOutcome = outcome(`win-${day}`, 'player');
      prestige = applyOutcomePrestige(
        dayOutcome,
        prestige,
        campaign.currentDate.toISOString(),
      );
      const staged = {
        ...campaign,
        unitPrestige: prestige,
        recentlyAppliedOutcomes: [dayOutcome],
      } as ICampaign;
      const result = getDayPipeline().processDay(staged);
      campaign = result.campaign;
    }

    // Morale climbed from Steady at least one step.
    expect([MoraleState.High, MoraleState.Elite]).toContain(
      campaign.moraleState,
    );
    // Prestige rose above the default.
    const record = prestige.find((p) => p.unitId === 'unit-1');
    expect(record?.score).toBeGreaterThan(50);
  });

  it('lowers morale and prestige across a defeat streak', () => {
    let campaign = makeCampaign({ moraleState: MoraleState.Steady });
    let prestige = applyOutcomePrestige(
      outcome('seed', 'player'),
      [],
      TEST_DATE.toISOString(),
    );
    const seededScore = prestige.find((p) => p.unitId === 'unit-1')?.score ?? 0;

    for (let day = 0; day < 3; day += 1) {
      const dayOutcome = outcome(`loss-${day}`, 'opponent');
      const dayOutcomeB = outcome(`loss-b-${day}`, 'opponent');
      // Two defeats per day clears the +1 met-pay signal and still nets
      // negative, so morale steps down each day (a single defeat alone is
      // cancelled by met pay — see the morale-signal weighting).
      prestige = applyOutcomePrestige(
        dayOutcome,
        prestige,
        campaign.currentDate.toISOString(),
      );
      const staged = {
        ...campaign,
        unitPrestige: prestige,
        recentlyAppliedOutcomes: [dayOutcome, dayOutcomeB],
      } as ICampaign;
      const result = getDayPipeline().processDay(staged);
      campaign = result.campaign;
    }

    // Morale fell from Steady at least one step.
    expect([MoraleState.Unhappy, MoraleState.Mutinous]).toContain(
      campaign.moraleState,
    );
    // Prestige dropped below the seeded score.
    const record = prestige.find((p) => p.unitId === 'unit-1');
    expect(record?.score).toBeLessThan(seededScore);
  });
});
