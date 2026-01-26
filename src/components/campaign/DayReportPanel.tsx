import { Card } from '@/components/ui';
import {
  DayReport,
  HealedPersonEvent,
  ExpiredContractEvent,
  DailyCostBreakdown,
} from '@/lib/campaign/dayAdvancement';
import { Money } from '@/types/campaign/Money';

interface DayReportPanelProps {
  reports: DayReport[];
  onDismiss: () => void;
}

function aggregateCosts(reports: DayReport[]): DailyCostBreakdown {
  let salariesTotal = 0;
  let maintenanceTotal = 0;
  let maxPersonnel = 0;
  let maxUnits = 0;

  for (const report of reports) {
    salariesTotal += report.costs.salaries.amount;
    maintenanceTotal += report.costs.maintenance.amount;
    maxPersonnel = Math.max(maxPersonnel, report.costs.personnelCount);
    maxUnits = Math.max(maxUnits, report.costs.unitCount);
  }

  return {
    salaries: new Money(salariesTotal),
    maintenance: new Money(maintenanceTotal),
    total: new Money(salariesTotal + maintenanceTotal),
    personnelCount: maxPersonnel,
    unitCount: maxUnits,
  };
}

function collectHealedPersonnel(reports: DayReport[]): HealedPersonEvent[] {
  const seen = new Set<string>();
  const result: HealedPersonEvent[] = [];

  for (const report of reports) {
    for (const evt of report.healedPersonnel) {
      if (!seen.has(evt.personId)) {
        seen.add(evt.personId);
        result.push(evt);
      }
    }
  }

  return result;
}

function collectExpiredContracts(reports: DayReport[]): ExpiredContractEvent[] {
  const seen = new Set<string>();
  const result: ExpiredContractEvent[] = [];

  for (const report of reports) {
    for (const evt of report.expiredContracts) {
      if (!seen.has(evt.contractId)) {
        seen.add(evt.contractId);
        result.push(evt);
      }
    }
  }

  return result;
}

export function DayReportPanel({ reports, onDismiss }: DayReportPanelProps): React.ReactElement {
  if (reports.length === 0) {
    return <></>;
  }

  const isMultiDay = reports.length > 1;
  const costs = isMultiDay ? aggregateCosts(reports) : reports[0].costs;
  const healedPersonnel = isMultiDay ? collectHealedPersonnel(reports) : reports[0].healedPersonnel;
  const expiredContracts = isMultiDay ? collectExpiredContracts(reports) : reports[0].expiredContracts;
  const lastReport = reports[reports.length - 1];
  const balanceNegative = lastReport.campaign.finances.balance.isNegative();

  const hasEvents = healedPersonnel.length > 0 || expiredContracts.length > 0 || costs.total.amount > 0;

  return (
    <Card className="mb-6 border-l-4 border-l-accent">
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-semibold text-text-theme-primary">
            {isMultiDay
              ? `Day Report — ${reports.length} days processed`
              : `Day Report — ${reports[0].date.toLocaleDateString()}`}
          </h3>
          <button
            onClick={onDismiss}
            className="text-text-theme-secondary hover:text-text-theme-primary transition-colors p-1"
            aria-label="Dismiss report"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {!hasEvents && (
          <p className="text-sm text-text-theme-secondary">Nothing notable happened.</p>
        )}

        {costs.total.amount > 0 && (
          <div className="mb-3">
            <h4 className="text-sm font-medium text-text-theme-secondary mb-1">Costs</h4>
            <div className="grid grid-cols-3 gap-2 text-sm">
              <div>
                <span className="text-text-theme-secondary">Salaries:</span>{' '}
                <span className="text-text-theme-primary">{costs.salaries.format()}</span>
              </div>
              <div>
                <span className="text-text-theme-secondary">Maintenance:</span>{' '}
                <span className="text-text-theme-primary">{costs.maintenance.format()}</span>
              </div>
              <div>
                <span className="text-text-theme-secondary font-medium">Total:</span>{' '}
                <span className={`font-medium ${balanceNegative ? 'text-red-400' : 'text-text-theme-primary'}`}>
                  {costs.total.format()}
                </span>
              </div>
            </div>
            {balanceNegative && (
              <p className="text-sm text-red-400 mt-1 flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Balance is negative: {lastReport.campaign.finances.balance.format()}
              </p>
            )}
          </div>
        )}

        {healedPersonnel.length > 0 && (
          <div className="mb-3">
            <h4 className="text-sm font-medium text-text-theme-secondary mb-1">Personnel Healed</h4>
            <ul className="text-sm space-y-0.5">
              {healedPersonnel.map((evt) => (
                <li key={evt.personId} className="text-text-theme-primary">
                  <span className="font-medium">{evt.personName}</span>
                  {evt.returnedToActive && (
                    <span className="text-green-400 ml-2">— returned to active duty</span>
                  )}
                  {evt.healedInjuries.length > 0 && !evt.returnedToActive && (
                    <span className="text-text-theme-secondary ml-2">
                      — {evt.healedInjuries.length} injury(s) healed
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {expiredContracts.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-text-theme-secondary mb-1">Contracts Completed</h4>
            <ul className="text-sm space-y-0.5">
              {expiredContracts.map((evt) => (
                <li key={evt.contractId} className="text-text-theme-primary">
                  <span className="font-medium">{evt.contractName}</span>
                  <span className="text-green-400 ml-2">— completed</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Card>
  );
}
