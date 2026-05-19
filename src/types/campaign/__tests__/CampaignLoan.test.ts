/**
 * Campaign Loan — unit tests
 *
 * Covers the loan math fixed at creation time (design D4):
 * `dailyRepayment = principal * (1 + interestRate) / termDays`.
 *
 * @spec openspec/changes/add-campaign-command-ui/specs/campaign-command-ui/spec.md
 */

import {
  computeDailyRepayment,
  computeTotalRepayable,
  createCampaignLoan,
  isCampaignLoan,
} from '../CampaignLoan';

describe('CampaignLoan math', () => {
  it('computeTotalRepayable adds the interest over the principal', () => {
    expect(computeTotalRepayable(1_000_000, 0.1)).toBeCloseTo(1_100_000);
    expect(computeTotalRepayable(500_000, 0)).toBe(500_000);
  });

  it('computeDailyRepayment divides the total over the term', () => {
    // 1,000,000 * 1.1 / 100 = 11,000 / day.
    expect(computeDailyRepayment(1_000_000, 0.1, 100)).toBeCloseTo(11_000);
  });

  it('computeDailyRepayment returns zero for a non-positive term', () => {
    expect(computeDailyRepayment(1_000_000, 0.1, 0)).toBe(0);
    expect(computeDailyRepayment(1_000_000, 0.1, -5)).toBe(0);
  });
});

describe('createCampaignLoan', () => {
  it('fixes remainingBalance and dailyRepayment at creation', () => {
    const loan = createCampaignLoan({
      id: 'loan-1',
      principal: 1_000_000,
      interestRate: 0.1,
      termDays: 100,
      takenOnDate: '3025-01-01T00:00:00.000Z',
    });
    expect(loan.remainingBalance).toBeCloseTo(1_100_000);
    expect(loan.dailyRepayment).toBeCloseTo(11_000);
    expect(loan.status).toBe('active');
    expect(loan.principal).toBe(1_000_000);
  });
});

describe('isCampaignLoan', () => {
  it('accepts a well-formed loan', () => {
    const loan = createCampaignLoan({
      id: 'loan-1',
      principal: 100_000,
      interestRate: 0.05,
      termDays: 50,
      takenOnDate: '3025-01-01T00:00:00.000Z',
    });
    expect(isCampaignLoan(loan)).toBe(true);
  });

  it('rejects a non-loan value', () => {
    expect(isCampaignLoan(null)).toBe(false);
    expect(isCampaignLoan({ id: 'x' })).toBe(false);
    expect(isCampaignLoan({ ...{}, status: 'bad' })).toBe(false);
  });
});
