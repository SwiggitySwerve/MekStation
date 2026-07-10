# Proposal: reconcile-campaign-economy-surfaces

## Why

The 2026-07-07 live playtest surfaced two economy defects that share one root shape: **campaign money and contract state are written in one place but read from another**. This change reconciles the write-side and read-side so the ledger and the dashboard tell the same story the rest of the app already tells.

- **M4 — mission payout never posts at completion.** `postBattleProcessor.applyOutcome` flips a fulfilled contract to terminal and enqueues its id onto `pendingFulfilledContractIds`, but posts **no** finance transaction. The only code that posts the payout is `contractProcessor`, which runs exclusively inside `advanceDay`'s day pipeline (`DayPhase.MISSIONS`). The interactive review / GM apply path (`retryCampaignOutcomeApplication` → `applyPostBattle`) commits the campaign with the queue stamped and posts nothing — so at mission completion the C-bill balance never moves, and the payout only appears after the *next* clean day advance (which the playtest's queue-blocking criticals made rare). No activity-log entry is emitted for the closure either, so Recent Activity never shows the income even when it does eventually post.
- **M2 — the dashboard contradicts the Missions/Forces/Finances tabs.** `useCampaignDashboardSummary` derives its widgets from sources no gameplay mutation writes: the Active Contract card reads `campaign.activeContract` (a field with **zero production writers** — only persistence mirrors), while `acceptContractOffer` writes `campaign.missions`; the finance card hardcodes `50/pilot + 100/unit` and pins `loanRepayment = 0`, ignoring campaign options, multipliers, and loans; and `forceSnapshot.mechCount` counts the roster store while the Forces tab counts force-tree assignment. The visible symptom is a dashboard that says "Choose a contract" with a `600/day` burn while the Missions tab shows an active contract and the Finances page shows `200/day`.

The two defects **overlap on `selectDailyCostProjection`** (the option-aware, loan-aware, force-tree-derived daily-cost selector the Finances page already uses): M2's finance card must adopt it, and M4's `600 vs 200` contradiction is resolved by the same adoption. This change lands that selector adoption **once**.

## What Changes

- **Post the contract payout at the single outcome-application commit point.** Hoist `applyContractClosure` out of `contractProcessor` into a shared module and call it inside `postBattleProcessor.applyOutcome` when `contractDelta.flippedToTerminal` — writing `finances.balance` + a final-payment `TransactionType.Income` transaction onto the returned campaign and stamping the contract id into `processedFulfilledContractIds` (not `pending`), **atomically in the same immutable object** the commit point already returns. Both the day pipeline and the review/GM apply route through `applyOutcome`, so one change makes the payout post exactly once at mission completion regardless of path.
- **Keep the `contractProcessor` drain as an idempotent legacy-save fallback.** Its existing `alreadyClosed` guard (`processedFulfilledContractIds`) prevents double-pay; it now closes only contracts flagged fulfilled-but-not-yet-posted (older saves written before this change).
- **Surface the income.** Emit a `contract_payment` day event and a `finances` activity-log entry at closure so Recent Activity and the DayReport show the payout.
- **Derive every dashboard economy widget from the same source-of-truth the tabs read.** Replace `extractActiveContractSummary` with a shared `selectActiveContract(campaign)` derived from `campaign.missions` (hoisting the `getActiveContracts` predicate from `scenarioGenerationProcessor` into `campaignCommandSelectors` so the dashboard and the pipeline agree); replace the hardcoded finance math with `selectDailyCostProjection`; count force-tree-assigned units in `forceSnapshot`.
- **Deprecate the write-less `ICampaignActiveContract` field** with read-tolerant deserialization so existing saves still load.

## Scope

### In

- Shared `applyContractClosure` module + payout posting inside `postBattleProcessor.applyOutcome` on `flippedToTerminal`.
- `contractProcessor` drain reframed as an idempotent legacy fallback (no behavior change to its guard; documented + tested as fallback).
- `contract_payment` day event + `finances` activity-log entry at closure.
- Shared `selectActiveContract` selector (hoisted `getActiveContracts` predicate) and `selectDailyCostProjection` adoption in `useCampaignDashboardSummary`.
- Force-tree-assigned unit count in `forceSnapshot`.
- `ICampaignActiveContract` deprecation with read-tolerant deserialization.
- Failing-first unit/integration coverage + a live smoke pass.

### Out

- **Co-op transport wiring** for the payout (the disconnected-registry reconciliation seam) — that is the separate `route-coop-battle-reconciliation` change. This change keeps the payout inside authoritative campaign state so it *rides* whatever reconciliation path exists, and adds a co-op parity verification, but does **not** modify co-op transport.
- **Adding new finance ledger entry *types*** or new transaction categories — the payout reuses the existing final-payment `TransactionType.Income` transaction and the existing `contract_closed` / `contract_payment` day-event shape (the `contract_payment` day-event name is distinct from the `TransactionType.ContractPayment` enum member, which is not used here).
- **Faction-standing on closure** — already a documented follow-up in its own change (`add-faction-standing`); untouched here.
- **The co-op onboarding wizard, GM reload commit, and per-day report breakdown** — separate wave-3 items, not this change.
- Any new capability folder.

## Approach

Single commit point, single source of truth. M4 collapses two payout paths into one by posting at `applyOutcome`'s existing D-5 commit point (the same immutable-object discipline already guarantees all-or-nothing apply). M2 stops the dashboard from reading fields nothing writes by routing every economy widget through the selectors the tabs already use — and the one selector both defects share (`selectDailyCostProjection`) is adopted once. Capabilities touched: `contract-types` (payout posts at apply; drain is fallback) and `campaign-hud` (dashboard summary derives from canonical state). See design.md D1 (commit-point posting vs day-drain), D2 (shared-selector SoT rule), and D3 (dead-field deprecation with save compatibility).

## Test Strategy

- **Infrastructure**: exists — Jest + React Testing Library for the processor, selector, and hook contracts; the existing campaign round-trip integration harness for the apply+advance idempotency path.
- **Tests-first per bounded task**: each behavior lands failing-first — (a) payout posts exactly once across `applyOutcome` + a subsequent `advanceDay`; (b) a legacy save with an un-posted `pendingFulfilledContractIds` still drains once; (c) dashboard and Missions tab agree on the active contract; (d) the `600 vs 200` daily-cost contradiction resolves to the option-aware projection.
- **Live smoke (capstone)**: complete a mission from the campaign UI, confirm the finance ledger shows the income immediately (no day advance), and confirm the dashboard finance card matches the Finances page.
