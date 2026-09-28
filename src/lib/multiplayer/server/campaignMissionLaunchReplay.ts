import type {
  CampaignEventScope,
  ICampaignEvent,
} from '@/types/campaign/CampaignSync';

/**
 * Launch facts do not survive a state fold. Select only those facts from
 * the caller's ordered campaign log, preserving their durable identities.
 * The cut is an authority sequence, never a grant delivery sequence.
 */
export function selectCampaignMissionLaunches(
  history: readonly ICampaignEvent[],
  cut: number,
  admits: (scope: CampaignEventScope) => boolean,
): readonly ICampaignEvent<'CampaignMissionLaunched'>[] {
  return history.filter(
    (event): event is ICampaignEvent<'CampaignMissionLaunched'> =>
      event.type === 'CampaignMissionLaunched' &&
      event.sequence <= cut &&
      admits(event.scope),
  );
}

/** Scoped historical sends must not step the live gate or lower its watermark. */
export function replayCampaignMissionLaunches(
  history: readonly ICampaignEvent[],
  cut: number,
  admits: (scope: CampaignEventScope) => boolean,
  sink: (event: ICampaignEvent) => void,
  delivered: ICampaignEvent[],
): void {
  for (const event of selectCampaignMissionLaunches(history, cut, admits)) {
    sink(event);
    delivered.push(event);
  }
}
