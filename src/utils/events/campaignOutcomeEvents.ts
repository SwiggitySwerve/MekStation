import { getEventStore } from '@/services/events';
import { type IBaseEvent } from '@/types/events';

import { createCampaignEvent } from './eventFactory';

export const CampaignOutcomeEventTypes = {
  PendingOutcomeAdded: 'PendingOutcomeAdded',
} as const;

export type CampaignOutcomeEventType =
  (typeof CampaignOutcomeEventTypes)[keyof typeof CampaignOutcomeEventTypes];

export interface IPendingOutcomeAddedPayload {
  readonly campaignId: string;
  readonly matchId: string;
  readonly contractId: string | null;
  readonly scenarioId: string | null;
  readonly queueLength: number;
}

function appendWhenEnabled<T>(event: IBaseEvent<T>, emit: boolean): void {
  if (emit) {
    getEventStore().append(event);
  }
}

export function emitPendingOutcomeAdded(
  params: IPendingOutcomeAddedPayload,
  emit = true,
): IBaseEvent<IPendingOutcomeAddedPayload> {
  const event = createCampaignEvent(
    CampaignOutcomeEventTypes.PendingOutcomeAdded,
    params,
    params.campaignId,
    params.contractId ?? undefined,
    {
      gameId: params.matchId,
    },
  );

  appendWhenEnabled(event, emit);
  return event;
}
