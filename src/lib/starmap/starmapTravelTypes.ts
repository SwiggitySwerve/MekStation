import type { IDayEvent } from '@/lib/campaign/dayPipeline';
import type { ICampaign } from '@/types/campaign/Campaign';
import type { Money } from '@/types/campaign/Money';
import type { IStarSystem } from '@/types/starmap/StarSystem';

import type { IStarmapRouteLeg } from './starmapTravelRoute';
import type { IStarmapTravelRules } from './starmapTravelRules';

export type StarmapTravelPreviewStatus = 'ready' | 'blocked';

export interface IStarmapDeadlineWarning {
  readonly missionId: string;
  readonly missionName: string;
  readonly systemId: string;
  readonly deadlineDate: string;
  readonly arrivalDate: string;
  readonly daysLate: number;
}

export interface IStarmapProgressSummary {
  readonly repairProgressEvents: number;
  readonly repairCompletedEvents: number;
  readonly repairBlockedEvents: number;
  readonly medicalProjection: 'external-roster';
  readonly medicalSummary: string;
}

export interface IStarmapTravelPreview {
  readonly status: StarmapTravelPreviewStatus;
  readonly reasons: readonly string[];
  readonly rules: IStarmapTravelRules;
  readonly fromSystem: IStarSystem;
  readonly destinationSystem?: IStarSystem;
  readonly routeLegs: readonly IStarmapRouteLeg[];
  readonly distanceLy: number;
  readonly jumpCount: number;
  readonly elapsedDays: number;
  readonly departureDate: string;
  readonly arrivalDate: string;
  readonly travelFees: Money;
  readonly dailyCosts: Money;
  readonly projectedFunds: Money;
  readonly deadlineWarnings: readonly IStarmapDeadlineWarning[];
  readonly progressSummary: IStarmapProgressSummary;
  readonly generatedEvents: readonly IDayEvent[];
  readonly routeAssumptions: readonly string[];
  readonly afterCampaign?: ICampaign;
  readonly generatedAt: string;
}
