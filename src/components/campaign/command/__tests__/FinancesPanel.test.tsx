/**
 * Finances Panel — render tests
 *
 * Covers tasks.md 3.7 and the spec scenarios "Finances page shows balance
 * and ledger", "Outstanding loans are listed with their schedule", and
 * the take-loan form behaviour.
 *
 * @spec openspec/changes/add-campaign-command-ui/specs/campaign-command-ui/spec.md
 */

import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import { Money } from '@/types/campaign/Money';

import {
  SAMPLE_DAILY_COST,
  SAMPLE_LOANS,
  SAMPLE_TRANSACTIONS,
} from '../__fixtures__/commandFixtures';
import { FinancesPanel } from '../FinancesPanel';

const EMPTY_DAILY = {
  salaries: 0,
  maintenance: 0,
  loanRepayment: 0,
  total: 0,
};

describe('FinancesPanel', () => {
  it('shows the campaign balance', () => {
    render(
      <FinancesPanel
        balance={new Money(2_450_000)}
        transactions={SAMPLE_TRANSACTIONS}
        dailyCost={SAMPLE_DAILY_COST}
        activeLoans={SAMPLE_LOANS}
        onTakeLoan={() => {}}
      />,
    );
    expect(screen.getByTestId('finances-balance')).toHaveTextContent(
      '2,450,000.00',
    );
  });

  it('lists the transaction ledger', () => {
    render(
      <FinancesPanel
        balance={new Money(0)}
        transactions={SAMPLE_TRANSACTIONS}
        dailyCost={SAMPLE_DAILY_COST}
        activeLoans={[]}
        onTakeLoan={() => {}}
      />,
    );
    for (const tx of SAMPLE_TRANSACTIONS) {
      expect(screen.getByTestId(`ledger-row-${tx.id}`)).toBeInTheDocument();
    }
  });

  it('shows a daily-cost projection including loan repayment', () => {
    render(
      <FinancesPanel
        balance={new Money(0)}
        transactions={[]}
        dailyCost={SAMPLE_DAILY_COST}
        activeLoans={SAMPLE_LOANS}
        onTakeLoan={() => {}}
      />,
    );
    expect(screen.getByTestId('finances-daily-cost')).toBeInTheDocument();
    expect(
      screen.getByTestId('finances-daily-loan-repayment'),
    ).toBeInTheDocument();
  });

  it('lists outstanding loans with their repayment schedule', () => {
    render(
      <FinancesPanel
        balance={new Money(0)}
        transactions={[]}
        dailyCost={SAMPLE_DAILY_COST}
        activeLoans={SAMPLE_LOANS}
        onTakeLoan={() => {}}
      />,
    );
    for (const loan of SAMPLE_LOANS) {
      expect(screen.getByTestId(`loan-row-${loan.id}`)).toBeInTheDocument();
    }
  });

  it('shows an empty ledger state when there are no transactions', () => {
    render(
      <FinancesPanel
        balance={new Money(0)}
        transactions={[]}
        dailyCost={EMPTY_DAILY}
        activeLoans={[]}
        onTakeLoan={() => {}}
      />,
    );
    // Two empty states render: ledger + outstanding loans.
    expect(screen.getAllByTestId('command-empty').length).toBeGreaterThan(0);
  });

  it('submitting the take-loan form invokes onTakeLoan with parsed inputs', () => {
    const onTakeLoan = jest.fn();
    render(
      <FinancesPanel
        balance={new Money(0)}
        transactions={[]}
        dailyCost={EMPTY_DAILY}
        activeLoans={[]}
        onTakeLoan={onTakeLoan}
      />,
    );
    fireEvent.change(screen.getByTestId('loan-input-principal'), {
      target: { value: '500000' },
    });
    fireEvent.change(screen.getByTestId('loan-input-rate'), {
      target: { value: '8' },
    });
    fireEvent.change(screen.getByTestId('loan-input-term'), {
      target: { value: '200' },
    });
    fireEvent.click(screen.getByTestId('loan-submit'));

    expect(onTakeLoan).toHaveBeenCalledWith({
      principal: 500000,
      interestRate: 0.08,
      termDays: 200,
    });
  });

  it('shows a live daily-repayment preview in the take-loan form', () => {
    render(
      <FinancesPanel
        balance={new Money(0)}
        transactions={[]}
        dailyCost={EMPTY_DAILY}
        activeLoans={[]}
        onTakeLoan={() => {}}
      />,
    );
    expect(screen.getByTestId('loan-daily-preview')).toBeInTheDocument();
  });
});
