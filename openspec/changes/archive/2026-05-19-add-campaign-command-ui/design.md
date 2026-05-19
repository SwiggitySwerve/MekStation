# Design: Add Campaign Command UI

## Context

The command-tier campaign engines are built: `personnelMarketProcessor`
refreshes the hiring pool, `campaign-finances` owns Money / transactions /
balance, `contractMarketProcessor` and `mission-contracts` cover contract
offers and acceptance. `campaign-ui` establishes the campaign-screen
conventions — a page per concern, a campaign-navigation group, standard loading
/ empty / error states. The missing piece is any *screen* for the player to
hire pilots, manage money, or take contracts.

This change builds three command surfaces over the existing engines. It is
UI-plus-actions: it adds screens, selectors, and three actions (hire,
accept-contract, take-loan). The only new data model is a small loan record;
loan repayment reuses the existing daily-cost pipeline.

## Goals / Non-Goals

**Goals:**

- Make personnel hiring, finances, and the contract market visible and
  actionable.
- Match `campaign-ui` page, navigation, and state-handling conventions.
- Keep the change UI-plus-thin-actions — surface existing engines, add only the
  loan record.

**Non-Goals:**

- Bay surfaces (CP2a), refit / prestige (CP3).
- New hiring / finance / contract business logic.
- A full loan-amortisation engine.

## Decisions

### D1. New capability `campaign-command-ui`, three surfaces, one navigation group

The three command surfaces are a cohesive management cluster. A dedicated
capability keeps them coherent and parallels `campaign-bay-ui`. They share one
campaign-navigation group ("Command").

### D2. Personnel & Hiring renders the existing market pool

The Personnel & Hiring page lists the current personnel-market candidates (the
pool `personnelMarketProcessor` maintains). Each candidate shows skills, salary,
and traits. The **hire** action routes through the existing
`personnel-management` hiring logic — it does not reimplement hiring; it calls
it and the resulting roster/finance mutation flows through existing code.

### D3. Finances & Loans renders the ledger and adds a loan surface

The Finances & Loans page shows the campaign balance, the `campaign-finances`
transaction ledger, and a daily-cost projection — all read from existing
`campaign-finances` state. The new element is the **loan surface**: take a loan
(principal, interest, term), and view outstanding loans with their repayment
schedule.

### D4. Loan record and repayment via the existing daily-cost pipeline

A loan is a small record:

```typescript
interface ICampaignLoan {
  readonly id: string;
  readonly principal: number;        // C-bills borrowed
  readonly interestRate: number;     // fractional, e.g. 0.10
  readonly termDays: number;
  readonly takenOnDate: string;      // ISO 8601
  readonly remainingBalance: number; // C-bills still owed
  readonly dailyRepayment: number;   // C-bills per day
  readonly status: 'active' | 'repaid' | 'defaulted';
}
```

Loans are stored on the campaign. Repayment is **not** a new engine: the loan's
`dailyRepayment` is summed into the daily-cost figure the existing
`dailyCostsProcessor` already debits. Taking a loan credits `principal` to the
balance via an existing `campaign-finances` transaction. The loan ledger UI is a
projection over `campaign.loans`; the math is fixed at loan-creation time
(`dailyRepayment = principal * (1 + interestRate) / termDays`).

### D5. Contract Market renders offers with accept/decline

The Contract Market page lists current contract-market offers (the pool
`contractMarketProcessor` maintains). Each offer shows employer, pay, salvage
rights, and duration. **Accept** routes through the existing
`mission-contracts` contract-acceptance logic; **decline** removes the offer
from the player's view. Neither reimplements contract logic.

### D6. All mutations route through the persistence store

Hire, accept-contract, and take-loan mutate the live `ICampaign`, marking it
dirty; the `campaign-persistence` store's debounced auto-save (CP0) picks them
up. No command surface writes to the server directly.

### D7. State handling matches `campaign-ui`

Each command page implements the `campaign-ui` loading / empty / error pattern.
An empty market (nothing on offer this cycle) shows an empty state, not an
error. SSR/hydration safety follows the existing `campaign-ui` requirement.

### D8. Storybook coverage per surface

Each of the three surfaces ships a Storybook story with populated, empty, and
error variants — consistent with the storybook-build CI gate.

## Risks / Trade-offs

- **[Risk] The loan surface grows into a full amortisation engine** →
  Mitigation: D4 fixes the loan math at creation time and reuses the daily-cost
  pipeline for repayment; compound interest, refinancing, and early payoff are
  explicit non-goals.
- **[Risk] Hiring / contract actions duplicate engine logic** → Mitigation: the
  actions are thin call-throughs to `personnel-management` and
  `mission-contracts` — the UI gathers input and invokes existing functions.
- **[Risk] A loan default has no defined consequence** → Mitigation: `status`
  carries a `defaulted` value for the daily-cost pipeline to set when the
  balance cannot cover repayment; the *consequence* of a default (faction
  standing hit, etc.) is out of scope and an open question.
- **[Risk] Market state changes under the player between render and action** →
  Mitigation: the action re-reads current market state at invocation; a hire or
  accept of an offer no longer present fails gracefully with an error state.

## Migration Plan

Purely additive. The three command pages are new routes; the navigation group
is a new entry. The loan record is a new optional `loans` field on the campaign,
absent on existing campaigns and defaulting to an empty list. Repayment reuses
the existing daily-cost pipeline. No destructive migration. Rollback = revert
the change-set; command logic keeps working unsurfaced, as before CP2b.

## Open Questions

- Loan-default consequence — proposed: `status = defaulted` flagged by the
  daily-cost pipeline; the downstream consequence (faction standing, contract
  access) is deferred to a later change.
- Whether declined contract offers reappear next market cycle — proposed: a
  declined offer is hidden until the next `contractMarketProcessor` refresh,
  which may legitimately re-offer it; confirm against the processor's dedup
  behavior during implementation.
