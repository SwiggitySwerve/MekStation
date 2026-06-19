/**
 * Stable export surface for the 6 campaign dashboard cards composed by
 * `<CampaignDashboard>`.
 *
 * @spec openspec/changes/add-campaign-command-center/specs/campaign-system/spec.md
 */

export {
  ActivityLogCard,
  DayAdvanceCard,
  QuickActionsCard,
} from './CampaignDashboardActivityCards';
export type {
  IActivityLogCardProps,
  IDayAdvanceCardProps,
  IQuickActionsCardProps,
} from './CampaignDashboardActivityCards';
export {
  ActiveContractCard,
  FinancesCard,
  ForceSnapshotCard,
} from './CampaignDashboardSummaryCards';
export type {
  IActiveContractCardProps,
  IFinancesCardProps,
  IForceSnapshotCardProps,
} from './CampaignDashboardSummaryCards';
