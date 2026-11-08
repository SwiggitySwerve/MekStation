import type { IRepairBayItem } from '@/types/campaign/CampaignInventory';
import type { ICampaignRosterEntry } from '@/types/campaign/CampaignRosterEntry';
import type { IMission } from '@/types/campaign/Mission';
import type { IRosterUnitProjection } from '@/types/campaign/RosterUnitProjection';
import type { ParsedRosterUnitSource } from '@/types/campaign/RosterUnitSource';

import {
  type CanonicalCombatCatalogSnapshot,
  admitCanonicalExactReference,
} from '@/lib/campaign/readiness/canonicalCatalogAdmission';
import { isActiveRepairTicket } from '@/lib/campaign/repair/repairTicketLifecycle';
import { parseRosterUnitSource } from '@/types/campaign/RosterUnitSource';

import {
  selectUnitReadiness,
  readinessStatusFromReasons,
  type IMissionReadinessReason,
  type MissionReadinessUnitStatus,
  type ReadinessCampaignFacts,
  type ReadinessAuthority,
} from './selectUnitReadiness';
export type {
  IMissionReadinessReason,
  MissionReadinessUnitStatus,
  MissionReadinessReasonSeverity,
} from './selectUnitReadiness';

export interface IMissionReadinessUnitProjection {
  readonly unit: IRosterUnitProjection;
  readonly status: MissionReadinessUnitStatus;
  readonly selected: boolean;
  readonly parsedSource: ParsedRosterUnitSource;
  readonly pilotName?: string;
  readonly pilotStatus?: ICampaignRosterEntry['status'];
  readonly repairTicketCount: number;
  readonly blockingRepairTicketCount: number;
  readonly reasons: readonly IMissionReadinessReason[];
}

export interface IMissionReadinessProjection {
  readonly campaignId: string;
  readonly missionId: string;
  readonly missionName: string;
  readonly selectedRosterUnitIds: readonly string[];
  readonly eligibleUnitIds: readonly string[];
  readonly riskyUnitIds: readonly string[];
  readonly blockedUnitIds: readonly string[];
  readonly units: readonly IMissionReadinessUnitProjection[];
  readonly selectedUnits: readonly IMissionReadinessUnitProjection[];
  readonly unresolvedBlockers: readonly IMissionReadinessReason[];
  readonly warnings: readonly IMissionReadinessReason[];
  readonly canLaunch: boolean;
  readonly catalogStatus?: CanonicalCombatCatalogSnapshot['status'];
  readonly launchConsequences: readonly string[];
}

export interface BuildMissionReadinessProjectionInput {
  readonly campaignId: string;
  readonly mission: IMission | undefined;
  readonly units: readonly IRosterUnitProjection[];
  readonly pilots?: readonly ICampaignRosterEntry[];
  readonly repairBay?: readonly IRepairBayItem[];
  readonly selectedRosterUnitIds?: readonly string[];
  readonly catalog?: CanonicalCombatCatalogSnapshot;
  readonly campaign?: ReadinessCampaignFacts | null;
  readonly authority?: ReadinessAuthority;
  readonly minUnits?: number;
  readonly maxUnits?: number;
  readonly baseCampaignHref?: string;
}

const DEFAULT_MIN_UNITS = 1;
const DEFAULT_MAX_UNITS = 4;

function uniqueIds(ids: readonly string[]): readonly string[] {
  return Array.from(new Set(ids));
}

function buildUnitProjection({
  unit,
  selected,
  pilot,
  repairTickets,
  catalog,
  baseCampaignHref,
  campaign,
  authority,
}: {
  readonly unit: IRosterUnitProjection;
  readonly selected: boolean;
  readonly pilot: ICampaignRosterEntry | undefined;
  readonly repairTickets: readonly IRepairBayItem[];
  readonly catalog?: CanonicalCombatCatalogSnapshot;
  readonly baseCampaignHref: string | undefined;
  readonly campaign?: ReadinessCampaignFacts | null;
  readonly authority?: ReadinessAuthority;
}): IMissionReadinessUnitProjection {
  const reasons: IMissionReadinessReason[] = [];
  const parsedSource = parseRosterUnitSource(unit.unitSource);
  const admission = admitCanonicalExactReference({
    parsed: parsedSource,
    unitRef: unit.unitRef,
    catalog,
    unitId: unit.unitId,
    unitName: unit.unitName,
  });
  if (!admission.admitted) reasons.push(admission.blocker);
  const readiness = selectUnitReadiness({
    unit,
    pilot,
    repairTickets,
    baseCampaignHref,
    campaign,
    authority,
  });
  reasons.push(...readiness.reasons);

  return {
    unit: readiness.unit,
    selected,
    parsedSource,
    pilotName: pilot?.pilotName,
    pilotStatus: pilot?.status,
    repairTicketCount: readiness.repairTicketCount,
    blockingRepairTicketCount: readiness.blockingRepairTicketCount,
    reasons,
    status: readinessStatusFromReasons(reasons),
  };
}

export function buildMissionReadinessProjection({
  campaignId,
  mission,
  units,
  pilots = [],
  repairBay = [],
  campaign,
  authority,
  selectedRosterUnitIds,
  catalog,
  minUnits = DEFAULT_MIN_UNITS,
  maxUnits = DEFAULT_MAX_UNITS,
  baseCampaignHref,
}: BuildMissionReadinessProjectionInput): IMissionReadinessProjection {
  const pilotById = new Map(pilots.map((pilot) => [pilot.pilotId, pilot]));
  const repairTicketsByUnit = new Map<string, IRepairBayItem[]>();
  for (const ticket of repairBay.filter(isActiveRepairTicket)) {
    const bucket = repairTicketsByUnit.get(ticket.unitId);
    if (bucket) {
      bucket.push(ticket);
    } else {
      repairTicketsByUnit.set(ticket.unitId, [ticket]);
    }
  }

  const projected = units.map((unit) =>
    buildUnitProjection({
      unit,
      selected: false,
      pilot: unit.pilotId ? pilotById.get(unit.pilotId) : undefined,
      repairTickets: repairTicketsByUnit.get(unit.unitId) ?? [],
      catalog,
      baseCampaignHref,
      campaign,
      authority,
    }),
  );
  const selectedIds =
    selectedRosterUnitIds === undefined
      ? projected
          .filter((unit) => unit.status !== 'blocked')
          .slice(0, maxUnits)
          .map((unit) => unit.unit.unitId)
      : uniqueIds(selectedRosterUnitIds);
  const selectedIdSet = new Set(selectedIds);
  const unitProjections = projected.map((unit) => ({
    ...unit,
    selected: selectedIdSet.has(unit.unit.unitId),
  }));
  const unitById = new Map(
    unitProjections.map((projection) => [projection.unit.unitId, projection]),
  );
  const selectedUnits = selectedIds
    .map((unitId) => unitById.get(unitId))
    .filter(
      (projection): projection is IMissionReadinessUnitProjection =>
        projection !== undefined,
    );

  const unresolvedBlockers: IMissionReadinessReason[] = [];
  const unknownSelectedUnitIds = selectedIds.filter(
    (unitId) => !unitById.has(unitId),
  );
  for (const unitId of unknownSelectedUnitIds) {
    unresolvedBlockers.push({
      code: 'selected_unit_missing',
      severity: 'blocker',
      subjectId: unitId,
      message: `Selected unit ${unitId} is missing from the campaign roster.`,
    });
  }
  if (selectedIds.length < minUnits) {
    unresolvedBlockers.push({
      code: 'roster_minimum',
      severity: 'blocker',
      message: `Select at least ${minUnits} deployable unit${
        minUnits === 1 ? '' : 's'
      } before launch.`,
    });
  }
  if (selectedIds.length > maxUnits) {
    unresolvedBlockers.push({
      code: 'roster_maximum',
      severity: 'blocker',
      message: `Select no more than ${maxUnits} unit${
        maxUnits === 1 ? '' : 's'
      } for this mission.`,
    });
  }
  for (const selectedUnit of selectedUnits) {
    unresolvedBlockers.push(
      ...selectedUnit.reasons.filter((reason) => reason.severity === 'blocker'),
    );
  }

  const warnings = selectedUnits.flatMap((unit) =>
    unit.reasons.filter((reason) => reason.severity === 'warning'),
  );
  const eligibleUnitIds = unitProjections
    .filter((unit) => unit.status === 'eligible')
    .map((unit) => unit.unit.unitId);
  const riskyUnitIds = unitProjections
    .filter((unit) => unit.status === 'risky')
    .map((unit) => unit.unit.unitId);
  const blockedUnitIds = unitProjections
    .filter((unit) => unit.status === 'blocked')
    .map((unit) => unit.unit.unitId);
  const canLaunch = unresolvedBlockers.length === 0;

  return {
    campaignId,
    missionId: mission?.id ?? 'mission-pending',
    missionName: mission?.name ?? 'Mission',
    selectedRosterUnitIds: selectedIds,
    eligibleUnitIds,
    riskyUnitIds,
    blockedUnitIds,
    units: unitProjections,
    selectedUnits,
    unresolvedBlockers,
    warnings,
    canLaunch,
    catalogStatus: catalog?.status,
    launchConsequences: [
      `Deploy ${selectedUnits.length} selected unit${
        selectedUnits.length === 1 ? '' : 's'
      }`,
      `${warnings.length} readiness warning${warnings.length === 1 ? '' : 's'}`,
      canLaunch ? 'Ready to launch' : 'Launch blocked until blockers clear',
    ],
  };
}

export function selectedRosterUnitsForLaunch(
  projection: IMissionReadinessProjection,
): readonly IRosterUnitProjection[] {
  return projection.selectedUnits.map((unit) => unit.unit);
}
