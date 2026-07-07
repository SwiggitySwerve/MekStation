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
    balance: readCampaignBalance(campaign),
    rosterUnits: buildRosterUnits(campaign),
    factionStanding: buildFactionStanding(campaign),
  };
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
