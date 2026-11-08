import type { IRepairBayItem } from '@/types/campaign/CampaignInventory';
import type { ICampaignRosterEntry } from '@/types/campaign/CampaignRosterEntry';
import type { IRosterUnitProjection } from '@/types/campaign/RosterUnitProjection';

import { isRosterPilotDeployable } from '@/lib/campaign/personnel/statusRules';
import { isActiveRepairTicket } from '@/lib/campaign/repair/repairTicketLifecycle';

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

export type ReadinessPilot = Pick<
  ICampaignRosterEntry,
  'pilotId' | 'pilotName' | 'status' | 'departureReason'
>;

export interface ISelectUnitReadinessInput {
  readonly unit: IRosterUnitProjection;
  readonly pilot?: ReadinessPilot;
  readonly repairTickets?: readonly IRepairBayItem[];
  readonly baseCampaignHref?: string;
}

export interface IUnitReadiness {
  readonly readiness: IRosterUnitProjection['readiness'];
  readonly status: MissionReadinessUnitStatus;
  readonly reasons: readonly IMissionReadinessReason[];
  readonly repairTicketCount: number;
  readonly blockingRepairTicketCount: number;
}

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

export function readinessStatusFromReasons(
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

/** Per-unit campaign readiness; catalog and mission limits belong to the caller. */
export function selectUnitReadiness({
  unit,
  pilot,
  repairTickets: tickets = [],
  baseCampaignHref,
}: ISelectUnitReadinessInput): IUnitReadiness {
  const reasons: IMissionReadinessReason[] = [];
  const repairTickets = tickets.filter(isActiveRepairTicket);
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
    } else if (!isRosterPilotDeployable(pilot)) {
      reasons.push({
        code: 'pilot_unavailable',
        severity: 'blocker',
        subjectId: unit.unitId,
        message: `${pilot.pilotName} is ${pilot.departureReason ?? pilot.status} and cannot deploy.`,
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
    readiness: unit.readiness,
    status: readinessStatusFromReasons(reasons),
    reasons,
    repairTicketCount: repairTickets.length,
    blockingRepairTicketCount: blockingRepairTickets.length,
  };
}
