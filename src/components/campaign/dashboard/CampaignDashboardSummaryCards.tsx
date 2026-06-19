import Link from 'next/link';
import React from 'react';

import type {
  IActiveContractSummary,
  IFinancesSummary,
  IForceSnapshotSummary,
} from '@/lib/campaign/hooks/useCampaignDashboardSummary';

import { DashboardCard } from './CampaignDashboardCardShell';

export interface IForceSnapshotCardProps {
  readonly campaignId: string;
  readonly snapshot: IForceSnapshotSummary;
}

export function ForceSnapshotCard({
  campaignId,
  snapshot,
}: IForceSnapshotCardProps): React.ReactElement {
  return (
    <DashboardCard
      title="Force Snapshot"
      testid="dashboard-card-force-snapshot"
    >
      <ul className="space-y-2 text-sm text-slate-200">
        <li>
          <Link
            data-testid="force-snapshot-mech-count"
            href={`/gameplay/campaigns/${campaignId}/forces`}
            className="hover:text-sky-400"
          >
            <span className="font-mono">{snapshot.mechCount}</span> mechs
          </Link>
        </li>
        <li>
          <Link
            data-testid="force-snapshot-pilot-count"
            href={`/gameplay/campaigns/${campaignId}/personnel`}
            className="hover:text-sky-400"
          >
            <span className="font-mono">{snapshot.pilotCount}</span> pilots
          </Link>
        </li>
        <li>
          <Link
            data-testid="force-snapshot-injured-count"
            href={`/gameplay/campaigns/${campaignId}/medical-bay`}
            className="hover:text-sky-400"
          >
            <span className="font-mono">{snapshot.injuredPilotCount}</span>{' '}
            injured
          </Link>
        </li>
        <li>
          <Link
            data-testid="force-snapshot-repair-depth"
            href={`/gameplay/campaigns/${campaignId}/repair-bay`}
            className="hover:text-sky-400"
          >
            <span className="font-mono">{snapshot.repairQueueDepth}</span> in
            repair
          </Link>
        </li>
      </ul>
    </DashboardCard>
  );
}

export interface IActiveContractCardProps {
  readonly campaignId: string;
  readonly summary: IActiveContractSummary;
}

export function ActiveContractCard({
  campaignId,
  summary,
}: IActiveContractCardProps): React.ReactElement {
  if (!summary.contract) {
    return (
      <DashboardCard
        title="Active Contract"
        testid="dashboard-card-active-contract"
      >
        <div className="text-sm text-slate-400">
          <p data-testid="active-contract-empty">No active contract.</p>
          <Link
            data-testid="active-contract-cta-browse"
            href={`/gameplay/campaigns/${campaignId}/contract-market`}
            className="mt-2 inline-block rounded border border-sky-600 px-3 py-1 text-sky-300 hover:bg-sky-900/30"
          >
            Browse contracts
          </Link>
        </div>
      </DashboardCard>
    );
  }
  const { contract } = summary;
  const completionPct =
    contract.objectivesTotal === 0
      ? 0
      : Math.floor(
          (contract.objectivesCompleted / contract.objectivesTotal) * 100,
        );
  return (
    <DashboardCard
      title="Active Contract"
      testid="dashboard-card-active-contract"
      footer={
        <Link
          href={`/gameplay/campaigns/${campaignId}/missions`}
          className="text-xs text-sky-400 hover:text-sky-200"
        >
          View missions →
        </Link>
      }
    >
      <p className="text-base font-semibold text-slate-100">{contract.name}</p>
      <p className="text-xs text-slate-400">Employer: {contract.employer}</p>
      <p
        data-testid="active-contract-days-remaining"
        className="mt-2 text-sm text-slate-300"
      >
        {contract.daysRemaining} days remaining
      </p>
      <div className="mt-2 text-xs text-slate-400">
        <span data-testid="active-contract-objectives-progress">
          {contract.objectivesCompleted} / {contract.objectivesTotal} objectives
        </span>
        <div className="mt-1 h-1.5 w-full rounded bg-slate-800">
          <div
            className="h-1.5 rounded bg-sky-500"
            style={{ width: `${completionPct}%` }}
          />
        </div>
      </div>
    </DashboardCard>
  );
}

export interface IFinancesCardProps {
  readonly campaignId: string;
  readonly summary: IFinancesSummary;
}

export function FinancesCard({
  campaignId,
  summary,
}: IFinancesCardProps): React.ReactElement {
  return (
    <DashboardCard
      title="Finances"
      testid="dashboard-card-finances"
      footer={
        <Link
          href={`/gameplay/campaigns/${campaignId}/finances`}
          className="text-xs text-sky-400 hover:text-sky-200"
        >
          View ledger →
        </Link>
      }
    >
      <p
        data-testid="finances-balance"
        className="text-base font-semibold text-slate-100"
      >
        {summary.balanceFormatted}
      </p>
      <dl className="mt-3 grid grid-cols-2 gap-y-1 text-xs">
        <dt className="text-slate-400">Salaries</dt>
        <dd
          data-testid="finances-daily-salaries"
          className="text-right font-mono text-slate-200"
        >
          {summary.dailySalariesAmount.toLocaleString()}/day
        </dd>
        <dt className="text-slate-400">Maintenance</dt>
        <dd
          data-testid="finances-daily-maintenance"
          className="text-right font-mono text-slate-200"
        >
          {summary.dailyMaintenanceAmount.toLocaleString()}/day
        </dd>
        <dt className="text-slate-400">Loan repay</dt>
        <dd
          data-testid="finances-daily-loan-repayment"
          className="text-right font-mono text-slate-200"
        >
          {summary.dailyLoanRepaymentAmount.toLocaleString()}/day
        </dd>
        <dt className="border-t border-slate-700 pt-1 text-slate-300">Total</dt>
        <dd
          data-testid="finances-daily-total"
          className="border-t border-slate-700 pt-1 text-right font-mono text-slate-200"
        >
          {summary.dailyTotalAmount.toLocaleString()}/day
        </dd>
      </dl>
      <p
        data-testid="finances-runway-days"
        className="mt-2 text-xs text-slate-300"
      >
        Runway:{' '}
        {summary.runwayDays === Number.POSITIVE_INFINITY
          ? '∞'
          : `${summary.runwayDays} days`}
      </p>
    </DashboardCard>
  );
}
