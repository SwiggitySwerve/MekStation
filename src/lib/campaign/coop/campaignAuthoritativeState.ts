import type { ICampaign } from '@/types/campaign/Campaign';
import type {
  ICampaignAuthoritativeState,
  ICampaignRosterUnit,
} from '@/types/campaign/CampaignSync';
import type { IRosterUnitProjection } from '@/types/campaign/RosterUnitProjection';

import { createEmptyCampaignState } from '@/types/campaign/CampaignSync';
import { parseRosterUnitSource } from '@/types/campaign/RosterUnitSource';

const READINESS_STATUS = {
  Ready: 'operational',
  Damaged: 'damaged',
  Destroyed: 'destroyed',
} as const;

export function buildCampaignAuthoritativeState(
  campaign: ICampaign,
  rosterUnits: readonly IRosterUnitProjection[] = [],
): ICampaignAuthoritativeState {
  const base = createEmptyCampaignState(campaign.id);
  return {
    ...base,
    day: campaignDayFor(campaign),
    balance: readCampaignBalance(campaign),
    rosterUnits: projectRosterUnits(rosterUnits),
    forceUnits: projectForceUnits(campaign, rosterUnits),
    factionStanding: buildFactionStanding(campaign),
  };
}

function projectRosterUnits(
  rosterUnits: readonly IRosterUnitProjection[],
): Readonly<Record<string, ICampaignRosterUnit>> {
  const units: Record<string, ICampaignRosterUnit> = {};
  const ordered = [...rosterUnits].sort((left, right) =>
    left.unitId.localeCompare(right.unitId),
  );
  for (const unit of ordered) {
    const parsed = parseRosterUnitSource(unit.unitSource);
    if (parsed.kind === 'invalid') {
      throw new Error(`${unit.unitName} has an invalid roster source`);
    }
    if (!unit.unitRef) {
      throw new Error(`${unit.unitName} is missing a catalog reference`);
    }
    units[unit.unitId] = {
      unitId: unit.unitId,
      designation: unit.unitName,
      status: READINESS_STATUS[unit.readiness],
      unitRef: unit.unitRef,
      unitSource: parsed.source,
    };
  }
  return units;
}

function projectForceUnits(
  campaign: ICampaign,
  rosterUnits: readonly IRosterUnitProjection[],
): Readonly<Record<string, readonly string[]>> {
  const rosterIds = new Set(rosterUnits.map((unit) => unit.unitId));
  const claimed = new Set<string>();
  const forceUnits: Record<string, readonly string[]> = {};
  const forces = Array.from(campaign.forces.values()).sort((left, right) =>
    left.id.localeCompare(right.id),
  );
  for (const force of forces) {
    const unitIds = [...force.unitIds].sort((left, right) =>
      left.localeCompare(right),
    );
    for (const unitId of unitIds) {
      if (!rosterIds.has(unitId)) {
        throw new Error(
          `Force ${force.id} references absent roster unit ${unitId}`,
        );
      }
      if (claimed.has(unitId)) {
        throw new Error(`Roster unit ${unitId} is in more than one force`);
      }
      claimed.add(unitId);
    }
    forceUnits[force.id] = unitIds;
  }
  return forceUnits;
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

function buildFactionStanding(
  campaign: ICampaign,
): Readonly<Record<string, number>> {
  const standing: Record<string, number> = {};
  for (const [factionId, value] of Object.entries(campaign.factionStandings)) {
    standing[factionId] = value.regard;
  }
  return standing;
}
