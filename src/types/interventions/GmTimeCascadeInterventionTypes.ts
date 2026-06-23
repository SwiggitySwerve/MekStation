import type { IDayEvent } from '@/lib/campaign/dayPipeline';
import type { ICampaign } from '@/types/campaign/Campaign';
import type { ICampaignWithCommand } from '@/types/campaign/CampaignCommandExtensions';

import type {
  IGmPrivateMetadata,
  IGmPublicEffect,
} from './GmInterventionAuthorityTypes';

export type GmTimeCascadeInterventionDomain = 'time';

export type GmTimeCascadeCorrectionFamily = 'time-advance';

export interface IGmTimeCascadeInterventionState extends ICampaignWithCommand {
  readonly timeCascadeEvents?: readonly IGmTimeCascadeProjectedEffect[];
}

export interface IGmTimeCascadeInterventionConflictInput {
  readonly code: string;
  readonly message: string;
  readonly affectedRefs?: readonly string[];
  readonly requiresManualTakeover?: boolean;
}

export interface IGmTimeCascadeExternalEffectProjection {
  readonly ref: string;
  readonly summary: string;
  readonly before?: unknown;
  readonly after?: unknown;
  readonly visibleToPlayerIds?: readonly string[];
}

export interface IGmTimeCascadeAdvanceCorrection {
  readonly family: 'time-advance';
  readonly days: number;
  readonly destinationSystemId?: string;
  readonly baseUpdatedAt?: string;
  readonly baseCurrentDate?: string;
  readonly generatedAt?: string;
  readonly externalEffectRefs?: readonly string[];
  readonly projectedExternalEffects?: readonly IGmTimeCascadeExternalEffectProjection[];
}

export type GmTimeCascadeInterventionCorrection =
  IGmTimeCascadeAdvanceCorrection;

export interface IGmTimeCascadeInterventionCommandPayload {
  readonly correction: GmTimeCascadeInterventionCorrection;
  readonly privateMetadata: IGmPrivateMetadata;
  readonly publicSummary?: string;
  readonly visibleToPlayerIds?: readonly string[];
  readonly conflicts?: readonly IGmTimeCascadeInterventionConflictInput[];
}

export interface IGmTimeCascadeDaySummary {
  readonly dayIndex: number;
  readonly processedDate: string;
  readonly resultingDate: string;
  readonly eventCount: number;
  readonly eventTypes: readonly string[];
  readonly processorsRun: readonly string[];
}

export interface IGmTimeCascadeStateSnapshot {
  readonly currentDate: string;
  readonly updatedAt: string;
  readonly currentSystemId?: string;
}

export type GmTimeCascadeProjectedEffectType =
  'gm.campaign.time_cascade_applied';

export interface IGmTimeCascadeProjectedEffect {
  readonly type: GmTimeCascadeProjectedEffectType;
  readonly domain: GmTimeCascadeInterventionDomain;
  readonly family: GmTimeCascadeCorrectionFamily;
  readonly interventionId?: string;
  readonly days: number;
  readonly destinationSystemId?: string;
  readonly before: IGmTimeCascadeStateSnapshot;
  readonly after: IGmTimeCascadeStateSnapshot;
  readonly afterCampaign: ICampaign;
  readonly daySummaries: readonly IGmTimeCascadeDaySummary[];
  readonly generatedEvents: readonly IDayEvent[];
  readonly changedStateRefs: readonly string[];
  readonly externalEffects: readonly IGmTimeCascadeExternalEffectProjection[];
  readonly publicSummary: string;
}

export interface IGmTimeCascadeInterventionDomainPayload {
  readonly correction: GmTimeCascadeInterventionCorrection;
  readonly projectedEffects: readonly IGmTimeCascadeProjectedEffect[];
}

export interface IGmTimeCascadePublicEffect extends IGmPublicEffect {
  readonly family: GmTimeCascadeCorrectionFamily;
  readonly days: number;
  readonly fromDate: string;
  readonly toDate: string;
  readonly fromSystemId?: string;
  readonly toSystemId?: string;
}
