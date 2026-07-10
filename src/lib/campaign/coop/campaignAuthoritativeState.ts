import type { ICampaign } from '@/types/campaign/Campaign';
import type {
  ICampaignAuthoritativeState,
  ICampaignRosterUnit,
} from '@/types/campaign/CampaignSync';

import { createEmptyCampaignState } from '@/types/campaign/CampaignSync';

export function buildCampaignAuthoritativeState(
  campaign: ICampaign,
): ICampaignAuthoritativeState {
  const base = createEmptyCampaignState(campaign.id);
  return {
    ...base,
    day: campaignDayFor(campaign),
    balance: readCampaignBalance(campaign),
    rosterUnits: buildRosterUnits(campaign),
    factionStanding: buildFactionStanding(campaign),
  };
}

function campaignDayFor(campaign: ICampaign): number {
  const currentTime = dateTimeFor(campaign.currentDate);
  const startTime = dateTimeFor(campaign.campaignStartDate) ?? currentTime;
  if (currentTime === null || startTime === null) {
    return 0;
  }
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.max(0, Math.floor((currentTime - startTime) / msPerDay));
}

function dateTimeFor(value: Date | string | undefined): number | null {
  if (value instanceof Date) {
    const time = value.getTime();
    return Number.isFinite(time) ? time : null;
  }
  if (typeof value === 'string') {
    const time = new Date(value).getTime();
    return Number.isFinite(time) ? time : null;
  }
  return null;
}

function readCampaignBalance(campaign: ICampaign): number {
  const balance = campaign.finances.balance as unknown;
  if (
    typeof balance === 'object' &&
    balance !== null &&
    'amount' in balance &&
    typeof (balance as { amount: unknown }).amount === 'number'
  ) {
    return (balance as { amount: number }).amount;
  }
  return typeof balance === 'number' && Number.isFinite(balance) ? balance : 0;
}

function buildRosterUnits(
  campaign: ICampaign,
): Readonly<Record<string, ICampaignRosterUnit>> {
  const units: Record<string, ICampaignRosterUnit> = {};
  for (const force of Array.from(campaign.forces.values())) {
    for (const unitId of force.unitIds) {
      units[unitId] = {
        unitId,
        designation: unitId,
        status: 'operational',
      };
    }
  }
  return units;
}

function buildFactionStanding(
  campaign: ICampaign,
): Readonly<Record<string, number>> {
  const standing: Record<string, number> = {};
  for (const [factionId, value] of Object.entries(campaign.factionStandings)) {
    standing[factionId] = value.regard;
  }
  return standing;
}
