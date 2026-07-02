import type { IRepairBayItem } from '@/types/campaign/CampaignInventory';
import type { ICampaignRosterEntry } from '@/types/campaign/CampaignRosterEntry';
import type { IMission } from '@/types/campaign/Mission';
import type { IRosterUnitProjection } from '@/types/campaign/RosterUnitProjection';

import { CampaignPilotStatus } from '@/types/campaign/CampaignPilotStatus';

export type MissionReadinessReasonSeverity = 'blocker' | 'warning' | 'info';
export type MissionReadinessUnitStatus = 'eligible' | 'risky' | 'blocked';

export interface IMissionReadinessReason {
  readonly code: string;
  readonly message: string;
  readonly severity: MissionReadinessReasonSeverity;
  readonly subjectId?: string;
  readonly actionLabel?: string;
  readonly actionHref?: string;
}

export interface IMissionReadinessUnitProjection {
  readonly unit: IRosterUnitProjection;
  readonly status: MissionReadinessUnitStatus;
  readonly selected: boolean;
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
  readonly launchConsequences: readonly string[];
}

export interface BuildMissionReadinessProjectionInput {
  readonly campaignId: string;
  readonly mission: IMission | undefined;
  readonly units: readonly IRosterUnitProjection[];
  readonly pilots?: readonly ICampaignRosterEntry[];
  readonly repairBay?: readonly IRepairBayItem[];
  readonly selectedRosterUnitIds?: readonly string[];
  readonly minUnits?: number;
  readonly maxUnits?: number;
  readonly baseCampaignHref?: string;
}

const DEFAULT_MIN_UNITS = 1;
const DEFAULT_MAX_UNITS = 4;

const BLOCKING_REPAIR_STATUSES = new Set<IRepairBayItem['status']>([
  'in-progress',
  'parts-needed',
]);

function repairDetailHref(
  baseCampaignHref: string | undefined,
  unitId: string,
): string | undefined {
  if (!baseCampaignHref) return undefined;
  return `${baseCampaignHref}/repair-bay?unit=${encodeURIComponent(unitId)}`;
}

function pilotAssignmentHref(
  baseCampaignHref: string | undefined,
  unitId: string,
): string | undefined {
  if (!baseCampaignHref) return undefined;
  return `${baseCampaignHref}/personnel?intent=assign-pilot&unit=${encodeURIComponent(unitId)}`;
}

function isPilotDeployable(
  status: ICampaignRosterEntry['status'],
): status is CampaignPilotStatus.Active {
  return status === CampaignPilotStatus.Active;
}

function statusFromReasons(
  reasons: readonly IMissionReadinessReason[],
): MissionReadinessUnitStatus {
  if (reasons.some((reason) => reason.severity === 'blocker')) {
    return 'blocked';
  }
  if (reasons.some((reason) => reason.severity === 'warning')) {
    return 'risky';
  }
  return 'eligible';
}

function uniqueIds(ids: readonly string[]): readonly string[] {
  return Array.from(new Set(ids));
}

function buildUnitProjection({
  unit,
  selected,
  pilot,
  repairTickets,
  baseCampaignHref,
}: {
  readonly unit: IRosterUnitProjection;
  readonly selected: boolean;
  readonly pilot: ICampaignRosterEntry | undefined;
  readonly repairTickets: readonly IRepairBayItem[];
  readonly baseCampaignHref: string | undefined;
}): IMissionReadinessUnitProjection {
  const reasons: IMissionReadinessReason[] = [];
  const blockingRepairTickets = repairTickets.filter((ticket) =>
    BLOCKING_REPAIR_STATUSES.has(ticket.status),
  );

  if (unit.readiness === 'Destroyed') {
    reasons.push({
      code: 'unit_destroyed',
      severity: 'blocker',
      subjectId: unit.unitId,
      message: 'Unit is destroyed and cannot deploy.',
      actionLabel: 'Open repair detail',
      actionHref: repairDetailHref(baseCampaignHref, unit.unitId),
    });
  } else if (unit.readiness === 'Damaged') {
    reasons.push({
      code: 'unit_damaged',
      severity: 'warning',
      subjectId: unit.unitId,
      message: 'Unit is damaged; launch is allowed but carries risk.',
      actionLabel: 'Review repair detail',
      actionHref: repairDetailHref(baseCampaignHref, unit.unitId),
    });
  }

  if (unit.pilotId) {
    if (!pilot) {
      reasons.push({
        code: 'pilot_record_missing',
        severity: 'blocker',
        subjectId: unit.unitId,
        message: `Assigned pilot ${unit.pilotId} is missing from the campaign roster.`,
      });
    } else if (!isPilotDeployable(pilot.status)) {
      reasons.push({
        code: 'pilot_unavailable',
        severity: 'blocker',
        subjectId: unit.unitId,
        message: `${pilot.pilotName} is ${pilot.status} and cannot deploy.`,
      });
    }
  } else {
    reasons.push({
      code: 'pilot_unassigned',
      severity: 'warning',
      subjectId: unit.unitId,
      // Direct imperative — the old "if pilot rules apply" hedge read as the
      // app being unsure of its own rules (re-audit DC-06).
      message: 'No pilot assigned. Assign one before launch.',
      actionLabel: 'Assign pilot',
      actionHref: pilotAssignmentHref(baseCampaignHref, unit.unitId),
    });
  }

  if (blockingRepairTickets.length > 0) {
    reasons.push({
      code: 'repair_blocking',
      severity: 'blocker',
      subjectId: unit.unitId,
      message: `${blockingRepairTickets.length} repair ticket${
        blockingRepairTickets.length === 1 ? '' : 's'
      } must be resolved before deployment.`,
      actionLabel: 'Open repair detail',
      actionHref: repairDetailHref(baseCampaignHref, unit.unitId),
    });
  } else if (repairTickets.length > 0) {
    reasons.push({
      code: 'repair_queued',
      severity: 'warning',
      subjectId: unit.unitId,
      message: `${repairTickets.length} repair ticket${
        repairTickets.length === 1 ? '' : 's'
      } remain queued for this unit.`,
      actionLabel: 'Review repair detail',
      actionHref: repairDetailHref(baseCampaignHref, unit.unitId),
    });
  }

  return {
    unit,
    selected,
    pilotName: pilot?.pilotName,
    pilotStatus: pilot?.status,
    repairTicketCount: repairTickets.length,
    blockingRepairTicketCount: blockingRepairTickets.length,
    reasons,
    status: statusFromReasons(reasons),
  };
}

export function buildMissionReadinessProjection({
  campaignId,
  mission,
  units,
  pilots = [],
  repairBay = [],
  selectedRosterUnitIds,
  minUnits = DEFAULT_MIN_UNITS,
  maxUnits = DEFAULT_MAX_UNITS,
  baseCampaignHref,
}: BuildMissionReadinessProjectionInput): IMissionReadinessProjection {
  const pilotById = new Map(pilots.map((pilot) => [pilot.pilotId, pilot]));
  const repairTicketsByUnit = new Map<string, IRepairBayItem[]>();
  for (const ticket of repairBay) {
    const bucket = repairTicketsByUnit.get(ticket.unitId);
    if (bucket) {
      bucket.push(ticket);
    } else {
      repairTicketsByUnit.set(ticket.unitId, [ticket]);
    }
  }

  const selectedIds =
    selectedRosterUnitIds === undefined
      ? units
          .filter((unit) => unit.readiness !== 'Destroyed')
          .slice(0, maxUnits)
          .map((unit) => unit.unitId)
      : uniqueIds(selectedRosterUnitIds);
  const selectedIdSet = new Set(selectedIds);

  const unitProjections = units.map((unit) =>
    buildUnitProjection({
      unit,
      selected: selectedIdSet.has(unit.unitId),
      pilot: unit.pilotId ? pilotById.get(unit.pilotId) : undefined,
      repairTickets: repairTicketsByUnit.get(unit.unitId) ?? [],
      baseCampaignHref,
    }),
  );
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
