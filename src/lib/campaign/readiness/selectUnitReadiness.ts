import type { CampaignAuthorityMode } from '@/lib/campaign/authority/campaignAuthorityMode';
import type { ICampaign } from '@/types/campaign/Campaign';
import type { IRepairBayItem } from '@/types/campaign/CampaignInventory';
import type { ICampaignInventory } from '@/types/campaign/CampaignInventory';
import type { ICampaignRosterEntry } from '@/types/campaign/CampaignRosterEntry';
import type { ICampaignRosterUnit } from '@/types/campaign/CampaignSync';
import type { IRefitOrder } from '@/types/campaign/Refit';
import type { IRosterUnitProjection } from '@/types/campaign/RosterUnitProjection';
import type {
  IUnitCombatState,
  IUnitMaxState,
} from '@/types/campaign/UnitCombatState';

import { projectRepairBay } from '@/lib/campaign/inventory/projectCampaignInventory';
import { isRosterPilotDeployable } from '@/lib/campaign/personnel/statusRules';
import { isActiveRepairTicket } from '@/lib/campaign/repair/repairTicketLifecycle';
import { deriveRosterReadiness } from '@/types/campaign/RosterUnitProjection';

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

export type ReadinessAuthority =
  | { readonly kind: 'snapshot' }
  | {
      readonly kind: 'journal';
      readonly units: Readonly<Record<string, ICampaignRosterUnit['status']>>;
    }
  | { readonly kind: 'blocked'; readonly reason: string };

/** Transport only the public unit statuses from an already-resolved authority. */
export function projectReadinessAuthority(
  mode: CampaignAuthorityMode,
  units: Readonly<Record<string, Pick<ICampaignRosterUnit, 'status'>>> = {},
): ReadinessAuthority {
  return mode.kind === 'journal'
    ? {
        kind: 'journal',
        units: Object.fromEntries(
          Object.entries(units).map(([id, unit]) => [id, unit.status]),
        ),
      }
    : mode;
}

export const SNAPSHOT_READINESS_AUTHORITY: ReadinessAuthority = Object.freeze({
  kind: 'snapshot',
});

export type ReadinessCampaignFacts = Partial<
  Pick<ICampaign, 'unitCombatStates' | 'unitMaxStates' | 'repairQueue'>
> & {
  readonly refitOrders?: readonly Pick<IRefitOrder, 'unitId' | 'status'>[];
  readonly campaignInventory?: Pick<ICampaignInventory, 'repairBay'>;
};

export interface ISelectUnitReadinessInput {
  readonly unit: IRosterUnitProjection;
  readonly pilot?: ReadinessPilot;
  readonly pilots?: readonly ReadinessPilot[];
  readonly campaign?: ReadinessCampaignFacts | null;
  readonly combatState?: IUnitCombatState;
  readonly maxState?: IUnitMaxState;
  readonly authority?: ReadinessAuthority;
  readonly repairTickets?: readonly IRepairBayItem[];
  readonly baseCampaignHref?: string;
}

export interface IUnitReadiness {
  readonly unit: IRosterUnitProjection;
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
  pilot: assignedPilot,
  pilots = [],
  campaign,
  combatState,
  maxState,
  repairTickets: tickets,
  authority = SNAPSHOT_READINESS_AUTHORITY,
  baseCampaignHref,
}: ISelectUnitReadinessInput): IUnitReadiness {
  const reasons: IMissionReadinessReason[] = [];
  const pilot =
    assignedPilot ?? pilots.find((entry) => entry.pilotId === unit.pilotId);
  const state = combatState ?? campaign?.unitCombatStates?.[unit.unitId];
  const maxima = maxState ?? campaign?.unitMaxStates?.[unit.unitId];
  const journalStatus =
    authority.kind === 'journal' ? authority.units[unit.unitId] : undefined;
  const journalReadiness =
    journalStatus === 'operational'
      ? 'Ready'
      : journalStatus === 'damaged'
        ? 'Damaged'
        : 'Destroyed';
  let readiness =
    authority.kind === 'journal'
      ? journalReadiness
      : state
        ? deriveRosterReadiness(state, maxima)
        : unit.readiness;
  // With no maxima, an old armor-only damage cache cannot be disproved.
  if (
    authority.kind !== 'journal' &&
    state &&
    !maxima &&
    readiness === 'Ready' &&
    unit.readiness === 'Damaged'
  )
    readiness = 'Damaged';
  const bay =
    campaign?.repairQueue !== undefined
      ? projectRepairBay(campaign.repairQueue)
      : (tickets ?? campaign?.campaignInventory?.repairBay ?? []);
  const repairTickets = bay.filter(
    (ticket) => ticket.unitId === unit.unitId && isActiveRepairTicket(ticket),
  );
  if (authority.kind === 'blocked')
    reasons.push({
      code: 'readiness_authority_unavailable',
      severity: 'blocker',
      subjectId: unit.unitId,
      message: 'Readiness authority is unavailable.',
    });
  if (authority.kind === 'journal' && journalStatus === undefined)
    reasons.push({
      code: 'unit_record_missing',
      severity: 'blocker',
      subjectId: unit.unitId,
      message: 'Unit is missing from the authoritative roster.',
    });
  const blockingRepairTickets = repairTickets.filter((ticket) =>
    BLOCKING_REPAIR_STATUSES.has(ticket.status),
  );
  if (readiness === 'Destroyed') {
    reasons.push({
      code: 'unit_destroyed',
      severity: 'blocker',
      subjectId: unit.unitId,
      message: 'Unit is destroyed and cannot deploy.',
      actionLabel: 'Open repair detail',
      actionHref: repairDetailHref(baseCampaignHref, unit.unitId),
    });
  } else if (readiness === 'Damaged') {
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
      severity: 'blocker',
      subjectId: unit.unitId,
      // Direct imperative — the old "if pilot rules apply" hedge read as the
      // app being unsure of its own rules (re-audit DC-06).
      message: 'No pilot assigned. Assign one before launch.',
      actionLabel: 'Assign pilot',
      actionHref: pilotAssignmentHref(baseCampaignHref, unit.unitId),
    });
  }

  if (
    campaign?.refitOrders?.some(
      (order) => order.unitId === unit.unitId && order.status === 'in-progress',
    )
  ) {
    reasons.push({
      code: 'refit_in_progress',
      severity: 'blocker',
      subjectId: unit.unitId,
      message: 'Unit is being refit and cannot deploy.',
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
    unit: readiness === unit.readiness ? unit : { ...unit, readiness },
    readiness,
    status: readinessStatusFromReasons(reasons),
    reasons,
    repairTicketCount: repairTickets.length,
    blockingRepairTicketCount: blockingRepairTickets.length,
  };
}
