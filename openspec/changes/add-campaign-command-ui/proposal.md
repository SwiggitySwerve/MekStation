# Change: Add Campaign Command UI

## Why

The command-tier campaign systems — personnel hiring, finances, loans, and the
contract market — all have working business logic. `personnel-management` and
the `personnelMarketProcessor` handle hiring; `campaign-finances` provides the
Money value object, transactions, and balance calculation; `contractMarketProcessor`
and `mission-contracts` cover contract generation and negotiation. But the
player has no command screens. `campaign-ui` covers the campaign list,
dashboard, roster, forces, and missions pages — there is **no hiring screen, no
finances screen, no contract-market screen**. The player can advance days and
watch markets refresh in event logs but cannot act on any of it.

This change adds the three command UI surfaces — **personnel & hiring**,
**finances & loans**, and **contract market** — over the existing business
logic. It is a UI change: it builds screens and exposes actions on existing
engines; it does not add new campaign business logic.

## What Changes

- ADDED a Personnel & Hiring page: the current personnel-market candidate list
  with per-candidate detail (skills, salary, traits) and a hire action that
  routes through the existing personnel-hiring logic
- ADDED a Finances & Loans page: the campaign balance, the transaction ledger
  from `campaign-finances`, daily-cost projection, and a loan surface (take a
  loan, view outstanding loans and repayment schedule)
- ADDED a Contract Market page: the current contract-market offers with
  per-contract detail (employer, pay, salvage rights, duration) and accept /
  decline actions routing through the existing contract-acceptance logic
- ADDED command navigation entries under the campaign navigation so the three
  surfaces are reachable from the campaign dashboard
- ADDED loading, empty, and error states for each surface consistent with the
  existing `campaign-ui` patterns
- ADDED a loan record type and a loan-ledger projection so outstanding loans and
  repayment are visible (loan repayment itself is processed by the existing
  daily-cost / finance pipeline)
- ADDED Storybook stories for each command surface covering populated, empty,
  and error states

## Dependencies

- **Requires**: `add-campaign-persistence` (CP0 — hire / accept-contract / take-loan
  actions mutate the campaign through the persistence store), `campaign-ui` (the
  page/navigation/state patterns this matches), `campaign-finances` (Money,
  transactions, balance), `personnel-management` (hiring logic),
  `mission-contracts` (contract model and acceptance)
- **Required By**: none — terminal Wave 4 UI change alongside CP3

## Impact

- Affected specs: `campaign-command-ui` (new capability) — chosen over adding to
  `campaign-ui` because the command surfaces are a cohesive management cluster
  with their own navigation group; a dedicated capability keeps the three-surface
  set coherent and parallels `campaign-bay-ui`
- Affected code: `src/pages/campaigns/[id]/` (new command pages),
  `src/components/campaign/command/` (new command components),
  `src/stores/campaign/` (read selectors over personnel-market / finances /
  contract-market state; hire / accept-contract / take-loan actions),
  `src/types/campaign/` (new loan record type)
- The loan record is the only new data — every other surface renders existing
  campaign state; the loan type is small and the repayment is handled by the
  existing daily-cost pipeline
- Reversible: the command pages are additive routes; removing them leaves the
  command logic functional but unsurfaced, as today

## Non-Goals

- The post-battle bay surfaces (mech / repair / medical / salvage) — those are
  CP2a `add-campaign-bay-ui`
- The refit / equipment-swap and prestige surfaces — those are CP3
  `add-campaign-refit-and-prestige`
- New hiring, finance, or contract business logic — the engines exist; this
  change surfaces them and exposes their actions
- Faction-standing and market-generation logic — already built; not re-specced
- A full loan-amortisation engine — the loan record carries a simple repayment
  schedule and the existing daily-cost pipeline applies repayments; no new
  amortisation math
