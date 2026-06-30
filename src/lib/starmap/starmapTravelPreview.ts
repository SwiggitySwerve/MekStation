import type { IDayEvent, IDayProcessor } from '@/lib/campaign/dayPipeline';
import type { ICampaign } from '@/types/campaign/Campaign';
import type { IContract, IMission } from '@/types/campaign/Mission';
import type { IStarSystem } from '@/types/starmap/StarSystem';

import {
  contractMarketProcessor,
  contractProcessor,
  dailyCostsProcessor,
  personnelMarketProcessor,
  repairProgressProcessor,
  unitMarketProcessor,
} from '@/lib/campaign/processors';
import { findSystemById } from '@/lib/starmap/loadInnerSphereSeed';
import { MissionStatus } from '@/types/campaign/enums/MissionStatus';
import { TransactionType } from '@/types/campaign/enums/TransactionType';
import { Money } from '@/types/campaign/Money';

import type {
  IStarmapDeadlineWarning,
  IStarmapProgressSummary,
  IStarmapTravelPreview,
} from './starmapTravelTypes';

import {
  buildStarmapRouteLegs,
  calculateTravelFee,
  distanceBetweenSystems,
} from './starmapTravelRoute';
import {
  DEFAULT_STARMAP_TRAVEL_RULES,
  type IStarmapTravelRules,
} from './starmapTravelRules';

export type {
  IStarmapRouteLeg,
  StarmapRouteLegStatus,
} from './starmapTravelRoute';
export type {
  IStarmapDeadlineWarning,
  IStarmapProgressSummary,
  IStarmapTravelPreview,
  StarmapTravelPreviewStatus,
} from './starmapTravelTypes';

export interface IBuildStarmapTravelPreviewOptions {
  readonly rules?: IStarmapTravelRules;
  readonly generatedAt?: string;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const TRAVEL_PROCESSORS = [
  repairProgressProcessor,
  contractProcessor,
  dailyCostsProcessor,
  unitMarketProcessor,
  personnelMarketProcessor,
  contractMarketProcessor,
] as const satisfies readonly IDayProcessor[];

export function buildStarmapTravelPreview(
  campaign: ICampaign,
  destinationSystemId: string,
  options: IBuildStarmapTravelPreviewOptions = {},
): IStarmapTravelPreview {
  const rules = options.rules ?? DEFAULT_STARMAP_TRAVEL_RULES;
  const generatedAt = options.generatedAt ?? new Date().toISOString();
  const fromSystem = findSystemById(campaign.currentSystemId ?? 'terra');
  const fallbackFrom = fromSystem ?? findSystemById('terra');
  if (!fallbackFrom) {
    throw new Error('Starmap seed is missing canonical Terra system.');
  }

  const destinationSystem = findSystemById(destinationSystemId);
  const departureDate = campaign.currentDate.toISOString();
  const emptyProgress = buildProgressSummary([]);
  if (!destinationSystem) {
    return blockedPreview({
      campaign,
      fromSystem: fallbackFrom,
      rules,
      generatedAt,
      departureDate,
      reason: `Destination system "${destinationSystemId}" was not found.`,
      code: 'destination-unknown',
      progressSummary: emptyProgress,
    });
  }

  const currentSystemId = campaign.currentSystemId ?? 'terra';
  if (currentSystemId === destinationSystem.id) {
    return blockedPreview({
      campaign,
      fromSystem: fallbackFrom,
      destinationSystem,
      rules,
      generatedAt,
      departureDate,
      reason: `${destinationSystem.name} is already the campaign location.`,
      code: 'destination-current-system',
      progressSummary: emptyProgress,
    });
  }

  const distanceLy = distanceBetweenSystems(fallbackFrom, destinationSystem);
  const jumpCount = Math.max(
    1,
    Math.ceil(distanceLy / rules.maxJumpDistanceLy),
  );
  const routeLegs = buildStarmapRouteLegs({
    fromSystem: fallbackFrom,
    destinationSystem,
    jumpCount,
    distanceLy,
    rules,
  });
  const elapsedDays =
    jumpCount * rules.rechargeDaysPerJump + rules.transitBufferDays;
  const arrivalDate = addDays(campaign.currentDate, elapsedDays).toISOString();
  const travelFees = calculateTravelFee(distanceLy, jumpCount, rules);
  const projectionBlockedReasons: string[] = [];
  if (jumpCount > rules.maxJumpsPerTravelOrder) {
    projectionBlockedReasons.push(
      `Route requires ${jumpCount} jumps, above the ${rules.maxJumpsPerTravelOrder}-jump travel-order limit.`,
    );
  }

  if (projectionBlockedReasons.length > 0) {
    return {
      status: 'blocked',
      reasons: projectionBlockedReasons,
      rules,
      fromSystem: fallbackFrom,
      destinationSystem,
      routeLegs: routeLegs.map((leg) => ({
        ...leg,
        status: 'illegal',
        reasons: [...leg.reasons, ...projectionBlockedReasons],
      })),
      distanceLy,
      jumpCount,
      elapsedDays,
      departureDate,
      arrivalDate,
      travelFees,
      dailyCosts: Money.ZERO,
      projectedFunds: campaign.finances.balance,
      deadlineWarnings: [],
      progressSummary: emptyProgress,
      generatedEvents: [],
      routeAssumptions: rules.routeAssumptions,
      generatedAt,
    };
  }

  const campaignWithTravelFee = applyTravelFeeAndDestination({
    campaign,
    destinationSystem,
    fromSystem: fallbackFrom,
    jumpCount,
    distanceLy,
    travelFees,
    generatedAt,
  });
  const projection = projectTravelDays(
    campaignWithTravelFee,
    elapsedDays,
    generatedAt,
  );
  const deadlineWarnings = buildDeadlineWarnings(
    campaign,
    destinationSystem,
    arrivalDate,
  );
  const progressSummary = buildProgressSummary(projection.events);
  const dailyCosts = sumDailyCosts(projection.events);

  return {
    status: 'ready',
    reasons: [],
    rules,
    fromSystem: fallbackFrom,
    destinationSystem,
    routeLegs,
    distanceLy,
    jumpCount,
    elapsedDays,
    departureDate,
    arrivalDate,
    travelFees,
    dailyCosts,
    projectedFunds: projection.campaign.finances.balance,
    deadlineWarnings,
    progressSummary,
    generatedEvents: projection.events,
    routeAssumptions: rules.routeAssumptions,
    afterCampaign: projection.campaign,
    generatedAt,
  };
}

function applyTravelFeeAndDestination(input: {
  readonly campaign: ICampaign;
  readonly destinationSystem: IStarSystem;
  readonly fromSystem: IStarSystem;
  readonly jumpCount: number;
  readonly distanceLy: number;
  readonly travelFees: Money;
  readonly generatedAt: string;
}): ICampaign {
  const txId = `tx-travel-${input.campaign.id}-${input.generatedAt}-${input.destinationSystem.id}`;
  return {
    ...input.campaign,
    currentSystemId: input.destinationSystem.id,
    finances: {
      transactions: [
        ...input.campaign.finances.transactions,
        {
          id: txId,
          type: TransactionType.Overhead,
          amount: input.travelFees,
          date: input.campaign.currentDate,
          description: `Travel fee from ${input.fromSystem.name} to ${input.destinationSystem.name} (${input.jumpCount} jumps, ${formatLy(input.distanceLy)} LY)`,
        },
      ],
      balance: input.campaign.finances.balance.subtract(input.travelFees),
    },
    updatedAt: input.generatedAt,
  };
}

function projectTravelDays(
  campaign: ICampaign,
  days: number,
  generatedAt: string,
): { readonly campaign: ICampaign; readonly events: readonly IDayEvent[] } {
  let current = campaign;
  const events: IDayEvent[] = [];
  const processors = [...TRAVEL_PROCESSORS].sort((a, b) => a.phase - b.phase);

  for (let dayIndex = 0; dayIndex < days; dayIndex += 1) {
    const processedDate = current.currentDate;
    let working = current;
    for (const processor of processors) {
      const result = processor.process(working, processedDate);
      working = result.campaign;
      events.push(...result.events);
    }
    current = {
      ...working,
      currentDate: addDays(processedDate, 1),
      updatedAt: generatedAt,
    };
  }

  return { campaign: current, events };
}

function buildDeadlineWarnings(
  campaign: ICampaign,
  destinationSystem: IStarSystem,
  arrivalDateIso: string,
): readonly IStarmapDeadlineWarning[] {
  const arrivalDate = new Date(arrivalDateIso);
  return Array.from(campaign.missions.values())
    .filter(
      (mission): mission is IContract | IMission =>
        mission.systemId === destinationSystem.id &&
        !isTerminalMission(mission) &&
        typeof mission.endDate === 'string',
    )
    .map((mission) => {
      const deadline = new Date(`${mission.endDate}T00:00:00.000Z`);
      const daysLate = Math.ceil(
        (arrivalDate.getTime() - deadline.getTime()) / DAY_MS,
      );
      return {
        missionId: mission.id,
        missionName: mission.name,
        systemId: mission.systemId,
        deadlineDate: deadline.toISOString(),
        arrivalDate: arrivalDateIso,
        daysLate,
      };
    })
    .filter((warning) => warning.daysLate > 0);
}

function buildProgressSummary(
  events: readonly IDayEvent[],
): IStarmapProgressSummary {
  return {
    repairProgressEvents: events.filter(
      (event) => event.type === 'repair_progress',
    ).length,
    repairCompletedEvents: events.filter(
      (event) => event.type === 'repair_completed',
    ).length,
    repairBlockedEvents: events.filter(
      (event) => event.type === 'repair_blocked',
    ).length,
    medicalProjection: 'external-roster',
    medicalSummary:
      'Medical recovery is roster-owned; this starmap preview shows travel time but leaves exact pilot recovery to the Medical Bay or GM time cascade.',
  };
}

function sumDailyCosts(events: readonly IDayEvent[]): Money {
  return events
    .filter((event) => event.type === 'daily_costs')
    .reduce((total, event) => {
      const amount = moneyFromUnknown(
        (event.data as { readonly total?: unknown } | undefined)?.total,
      );
      return total.add(amount);
    }, Money.ZERO);
}

function moneyFromUnknown(value: unknown): Money {
  if (value instanceof Money) return value;
  if (typeof value === 'number') return new Money(value);
  if (value && typeof value === 'object') {
    const maybe = value as {
      readonly amount?: unknown;
      readonly centsValue?: unknown;
    };
    if (typeof maybe.amount === 'number') return new Money(maybe.amount);
    if (typeof maybe.centsValue === 'number')
      return Money.fromCents(maybe.centsValue);
  }
  return Money.ZERO;
}

function blockedPreview(input: {
  readonly campaign: ICampaign;
  readonly fromSystem: IStarSystem;
  readonly destinationSystem?: IStarSystem;
  readonly rules: IStarmapTravelRules;
  readonly generatedAt: string;
  readonly departureDate: string;
  readonly reason: string;
  readonly code: string;
  readonly progressSummary: IStarmapProgressSummary;
}): IStarmapTravelPreview {
  return {
    status: 'blocked',
    reasons: [`${input.code}: ${input.reason}`],
    rules: input.rules,
    fromSystem: input.fromSystem,
    destinationSystem: input.destinationSystem,
    routeLegs: [],
    distanceLy: 0,
    jumpCount: 0,
    elapsedDays: 0,
    departureDate: input.departureDate,
    arrivalDate: input.departureDate,
    travelFees: Money.ZERO,
    dailyCosts: Money.ZERO,
    projectedFunds: input.campaign.finances.balance,
    deadlineWarnings: [],
    progressSummary: input.progressSummary,
    generatedEvents: [],
    routeAssumptions: input.rules.routeAssumptions,
    generatedAt: input.generatedAt,
  };
}

function isTerminalMission(mission: IMission): boolean {
  return [
    MissionStatus.SUCCESS,
    MissionStatus.PARTIAL,
    MissionStatus.FAILED,
    MissionStatus.BREACH,
    MissionStatus.CANCELLED,
    MissionStatus.ABORTED,
  ].includes(mission.status);
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

function formatLy(value: number): string {
  return value.toFixed(1);
}
