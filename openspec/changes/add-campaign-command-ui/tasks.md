# Tasks: Add Campaign Command UI

## 1. Command Navigation and Loan Type

- [ ] 1.1 Add a "Command" campaign-navigation group with entries for Personnel & Hiring, Finances & Loans, and Contract Market
- [ ] 1.2 Add the `ICampaignLoan` type to `src/types/campaign/` and an optional `loans` field on the campaign defaulting to an empty list
- [ ] 1.3 Add typed campaign-store selectors over personnel-market, finances, contract-market, and loan state
- [ ] 1.4 Tests: selectors return expected projections from a populated campaign and empty results from a fresh campaign

## 2. Personnel & Hiring Page

- [ ] 2.1 Build the Personnel & Hiring page — the current personnel-market candidate list with per-candidate skills, salary, and traits
- [ ] 2.2 Implement the hire action as a thin call-through to the existing `personnel-management` hiring logic
- [ ] 2.3 Implement loading, empty (no candidates), and error states matching `campaign-ui` conventions
- [ ] 2.4 Storybook story with populated, empty, and error variants
- [ ] 2.5 Tests: candidate list renders, hire invokes the existing hiring logic and marks the campaign dirty

## 3. Finances & Loans Page

- [ ] 3.1 Build the Finances & Loans page — campaign balance, the `campaign-finances` transaction ledger, and a daily-cost projection
- [ ] 3.2 Build the loan surface — take a loan (principal, interest, term) and view outstanding loans with repayment schedule
- [ ] 3.3 Implement take-loan — credits principal via a `campaign-finances` transaction, appends an `ICampaignLoan` with `dailyRepayment` fixed at creation time
- [ ] 3.4 Sum active-loan `dailyRepayment` into the daily-cost figure consumed by the existing `dailyCostsProcessor`
- [ ] 3.5 Implement loading, empty, and error states
- [ ] 3.6 Storybook story with populated, empty, and error variants
- [ ] 3.7 Tests: ledger renders, take-loan credits the balance and records the loan, daily cost includes loan repayment

## 4. Contract Market Page

- [ ] 4.1 Build the Contract Market page — current contract-market offers with per-offer employer, pay, salvage rights, and duration
- [ ] 4.2 Implement accept as a thin call-through to the existing `mission-contracts` acceptance logic
- [ ] 4.3 Implement decline — hides the offer until the next market refresh
- [ ] 4.4 Implement loading, empty (no offers), and error states
- [ ] 4.5 Storybook story with populated, empty, and error variants
- [ ] 4.6 Tests: offer list renders, accept invokes the existing acceptance logic and marks the campaign dirty, decline hides the offer

## 5. Verification

- [ ] 5.1 Integration test: hiring a pilot, taking a loan, and accepting a contract each mark the campaign dirty and trigger an auto-save
- [ ] 5.2 Integration test: a loan's daily repayment is debited by the daily-cost pipeline on day advancement until the loan is repaid
- [ ] 5.3 `openspec validate add-campaign-command-ui --strict` clean
- [ ] 5.4 Build, lint, typecheck, and storybook-build pass
