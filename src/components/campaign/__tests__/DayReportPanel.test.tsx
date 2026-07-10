import { render, screen, within } from '@testing-library/react';

import type { DayReport } from '@/lib/campaign/dayAdvancement';

import { Money } from '@/types/campaign/Money';

import { DayReportPanel } from '../DayReportPanel';

function createReport(
  date: string,
  overrides: Partial<DayReport> = {},
): DayReport {
  return {
    date: new Date(date),
    healedPersonnel: [],
    expiredContracts: [],
    costs: {
      salaries: new Money(0),
      maintenance: new Money(0),
      loanRepayment: new Money(0),
      total: new Money(0),
      personnelCount: 0,
      unitCount: 0,
    },
    turnoverDepartures: [],
    campaign: {
      finances: { balance: new Money(0) },
    } as DayReport['campaign'],
    ...overrides,
  };
}

describe('DayReportPanel', () => {
  it('keeps the aggregate and shows only event days in collapsed per-day rows', () => {
    const firstReport = createReport('2025-01-01T00:00:00.000Z', {
      healedPersonnel: [
        {
          personId: 'person-1',
          personName: 'Alex Mercer',
          healedInjuries: ['arm'],
          returnedToActive: true,
        },
      ],
    });
    const eventlessReport = createReport('2025-01-02T00:00:00.000Z');
    const finalReport = createReport('2025-01-03T00:00:00.000Z', {
      expiredContracts: [
        {
          contractId: 'contract-1',
          contractName: 'Operation Thunder',
          previousStatus: 'ACTIVE' as never,
          newStatus: 'COMPLETED' as never,
        },
      ],
    });

    render(
      <DayReportPanel
        reports={[firstReport, eventlessReport, finalReport]}
        onDismiss={jest.fn()}
      />,
    );

    expect(
      screen.getByRole('heading', {
        name: 'Day Report — 3 days processed',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(firstReport.date.toLocaleDateString(), {
        selector: 'summary',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(finalReport.date.toLocaleDateString(), {
        selector: 'summary',
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(eventlessReport.date.toLocaleDateString(), {
        selector: 'summary',
      }),
    ).not.toBeInTheDocument();
    const eventDayRows = screen.getAllByRole('group');
    expect(eventDayRows).toHaveLength(2);
    expect(eventDayRows[0]).not.toHaveAttribute('open');
    expect(eventDayRows[1]).not.toHaveAttribute('open');
    expect(
      within(eventDayRows[0]).getByText('Alex Mercer'),
    ).toBeInTheDocument();
    expect(
      within(eventDayRows[1]).getByText('Operation Thunder'),
    ).toBeInTheDocument();
  });
});
