# Design: reconcile-campaign-economy-surfaces

## Technical Approach

Both defects are read/write splits in the campaign economy. M4 writes contract-terminal state in `postBattleProcessor` but writes the *payout* in `contractProcessor` (a different pipeline phase, reachable only via `advanceDay`). M2 reads dashboard widgets from fields (`campaign.activeContract`, hardcoded cost constants, roster-store unit counts) that no gameplay mutation writes, while the Missions/Forces/Finances tabs read the canonical stores (`campaign.missions`, `selectDailyCostProjection`, force-tree assignment). The fix in both cases is to collapse to one writer / one reader against the existing source of truth — no new schema, no new transport, no new capability.

Key existing anchors (verified this session):

- `postBattleProcessor.applyOutcome` — `src/lib/campaign/processors/postBattleProcessor.ts:114-261`. The `flippedToTerminal` branch (`:177-179`, `:217-229`, `:237-245`) already stamps `pendingFulfilledContractIds` and publishes the fulfillment bus event at the D-5 commit point (`:230-245`), but posts no transaction.
- `applyContractClosure` — `src/lib/campaign/processors/contractProcessor.ts:85-125`, a **private** function that builds the final-payment `TransactionType.Income` transaction (id `tx-contract-close-<id>-<iso>`) + credited balance + `contract_closed` day event. (Note: the enum member is `TransactionType.Income`, NOT the separate `TransactionType.ContractPayment`.) The drain loop (`:163-182`) is reachable only in the day pipeline (`DayPhase.MISSIONS`); its `alreadyClosed` guard (`:156`, `:164`) keyed on `processedFulfilledContractIds` is the existing double-pay guard.
- `selectDailyCostProjection` — `src/stores/campaign/campaignCommandSelectors.ts:146` (option-aware, loan-aware, force-tree-derived; the Finances page already uses it).
- `getActiveContracts` predicate — private at `src/lib/campaign/processors/scenarioGenerationProcessor.ts:73` (`isContract` + future/undefined `endDate`).
- Dashboard read-side — `src/lib/campaign/hooks/useCampaignDashboardSummary.ts`: `extractActiveContractSummary` (`:147-177`, reads `campaign.activeContract`), `extractFinancesSummary` (`:188-246`, hardcoded `50/100`, `loanRepayment = 0`), `extractForceSnapshot` (`:252-277`, `mechCount = rosterUnits.length`).
- Dead field — `ICampaignActiveContract` at `src/types/campaign/CampaignCommandExtensions.ts:78`; only readers/writers are persistence mirrors (`useCampaignStore.persistence.ts:145,298,391`; `serializeCampaign.ts:195,263`). `acceptContractOffer` (`src/stores/campaign/campaignCommandActions.ts:454`) never writes it.

## Architecture Decisions

### Decision: D1 — Post the payout at the outcome-application commit point, not the day-drain

**Choice**: Hoist `applyContractClosure` into a shared module (e.g. `src/lib/campaign/processors/contractClosure.ts`) and invoke it inside `postBattleProcessor.applyOutcome` when `contractDelta?.flippedToTerminal`. Write the credited `finances.balance` + appended final-payment `TransactionType.Income` transaction onto the `updatedCampaign` object the function already returns, and stamp the contract id into `processedFulfilledContractIds` (instead of `pendingFulfilledContractIds`) **in that same immutable object**. `contractProcessor` imports the shared function and keeps its drain loop unchanged as a legacy fallback.

**Rationale**:
- Both entry points — the day pipeline (`advanceDay` → `postBattleProcessor`) and the interactive review/GM path (`retryCampaignOutcomeApplication` → `applyPostBattle` → `applyOutcome`) — route through `applyOutcome`. Posting there makes the payout land once at mission completion regardless of which path applied the outcome.
- The commit-point already enforces D-5 all-or-nothing discipline (`postBattleProcessor.ts:230-245`): every throwing computation runs before the side-effect block, so the balance write + the `processedFulfilledContractIds` stamp landing in the *same* returned object means a throw anywhere above leaves finances untouched and the outcome queued for retry. **The transaction append and the id stamp must be in the same immutable object** — this is the double-payment guard.
- The `processedFulfilledContractIds` ledger already dedups: because `postBattleProcessor` (`DayPhase.MISSIONS - 50`) runs *before* `contractProcessor` (`DayPhase.MISSIONS`) in the pipeline, a same-day advance sees the id already in `alreadyClosed` and skips. No new dedup mechanism is introduced.

**Alternatives considered**:
- **Post from a new dedicated processor** between post-battle and contracts. Rejected: adds a third payout path to reason about and does not fix the interactive apply path (which never runs the pipeline).
- **Have the review/GM path call `contractProcessor` directly after apply.** Rejected: couples the apply path to the day pipeline, runs *all* contract-processing side effects (expiration, market) out of phase, and re-introduces two payout code paths.

### Decision: D2 — Every dashboard economy widget derives from the canonical selector the tab uses (shared-selector SoT rule)

**Choice**: The dashboard summary hook SHALL NOT read a field no gameplay mutation writes. Replace `extractActiveContractSummary` with a shared `selectActiveContract(campaign)` derived from `campaign.missions`, replace `extractFinancesSummary`'s hardcoded math with `selectDailyCostProjection`, and count force-tree-assigned units in `forceSnapshot`. The active-contract selector composes two filters: the scenario-generation pipeline's **hoisted `getActiveContracts` predicate** (endDate future-or-undefined — moved from `scenarioGenerationProcessor` into `campaignCommandSelectors` **unchanged**, preserving pipeline behavior) AND the Missions tab's active filter (`status === MissionStatus.ACTIVE`). The pipeline predicate is endDate-only and does NOT check status, so `selectActiveContract = getActiveContracts(campaign) ∧ status === ACTIVE` — the status check is what the pipeline lacked and what the dashboard must add to agree with the Missions tab.

**Rationale**:
- The contradiction is a read-source mismatch, not a compute bug. Pointing the dashboard at the same selectors the tabs use resolves all four widget mismatches (active contract, daily cost, forces count, and — via the emitted closure entry from D1 — recent activity) without changing any card's `IDashboardSummary` output shape.
- Composing the *shared* pipeline predicate with the Missions-tab status filter is load-bearing: if the dashboard's `selectActiveContract` used only the endDate predicate (as the pipeline does) or only a status filter, it would disagree with one of the two surfaces. Hoisting `getActiveContracts` unchanged keeps the pipeline stable, and `∧ status === ACTIVE` makes dashboard/Missions agreement structural.
- `selectDailyCostProjection` is the overlap point between M2 and M4. Adopting it in the finance card fixes M2's option-blind estimate *and* M4's `600 vs 200` contradiction in one edit — landed once, cited from both.

**Alternatives considered**:
- **Fix the hardcoded constants in place** (make `extractFinancesSummary` option-aware itself). Rejected: duplicates `selectDailyCostProjection`'s logic, creating a third daily-cost computation to keep in sync — the opposite of the SoT rule.
- **Write `campaign.activeContract` from `acceptContractOffer`** so the existing reader becomes correct. Rejected: keeps a redundant denormalized field that must be kept consistent with `campaign.missions` on every mutation (accept, expire, fulfill, fail) — a permanent drift surface. Deriving from `campaign.missions` removes the field instead.

### Decision: D3 — Deprecate the write-less `activeContract` field with save-compatible deserialization

**Choice**: Stop reading `campaign.activeContract` in production (D2 removes the last reader). Mark `ICampaignActiveContract` deprecated and keep deserialization **read-tolerant**: existing saves that carry a serialized `activeContract` still load without error; the field is ignored on read and not required on write. Do not remove the persistence envelope key in this change.

**Rationale**:
- The field has zero production writers, so nothing depends on its value — but old saves on disk carry it. Removing the deserialization path would break-load those saves.
- Read-tolerance (accept-and-ignore) is the minimum that satisfies both "no code reads a write-less field" and "old saves still load." A later change can drop the envelope key once no persisted save carries it.

**Consequence**: `serializeCampaign.ts` / `useCampaignStore.persistence.ts` keep the `activeContract` passthrough for now; a follow-up may remove it. This is documented as an accepted residual rather than silently retained.

## Co-op Parity Note

The payout now posts inside `applyOutcome`, i.e. as part of the authoritative campaign state mutation. The decidable claim this change makes is: **after `applyOutcome`, the payout lands on the host-authoritative `campaign.finances` and persists via `saveCampaign`** — nothing more. It does **not** claim guest mirrors see the balance change: on the current tree `reconcileCoopOutcomeForCampaign` fires at outcome *enqueue* with a hardcoded `missionPayout: 0`, so a guest-visible `FundsChanged` does not propagate today. Wiring the guest-visible propagation is owned by `route-coop-battle-reconciliation` (iter 2), not this change. This change only ensures the payout is part of authoritative persisted state so that reconciliation change has correct funds to propagate; the smoke task verifies the host-authoritative + persisted claim, not guest visibility.

## Risks

- **R1 — Double payment.** The single failure mode. Mitigation: the transaction append and the `processedFulfilledContractIds` stamp land in the *same* immutable object returned by `applyOutcome` (D1); the idempotency test asserts exactly-once across apply + a following `advanceDay`. Preserve the D-5 commit-point ordering at `postBattleProcessor.ts:230-245`.
- **R2 — Predicate drift.** If `selectActiveContract` diverges from the Missions tab, the contradiction relocates. Note the pipeline's `getActiveContracts` is endDate-only (no status check), so the shared selector must be `getActiveContracts ∧ status === ACTIVE` — hoisting the pipeline predicate alone is insufficient. Mitigation: compose the hoisted predicate with the status filter; the dashboard-agreement test compares the dashboard and Missions-tab active contract directly, including the post-terminal case.
- **R3 — Persistence envelope read-tolerance.** Deprecating `activeContract` must not break old-save load. Mitigation: read-tolerant deserialization test with a legacy save carrying `activeContract`.
- **R4 — Existing tests assert the old behavior.** `phase4CampaignRoundTrip` asserts payment happens in `contractProcessor`; hook tests assert the hardcoded `50/100` estimate. These must be **updated to the new commit point / projection**, not loosened. Mitigation: the tasks rewrite (not widen) those assertions.
- **R5 — Formatter/validator race.** Per repo memory, the double-quote formatter hook vs oxfmt single-quote can break token-matching QC validators. After spec/validator edits, run oxfmt + the validator + its jest wrapper.

## Out of Scope (explicit)

- Co-op transport / disconnected-registry reconciliation (`route-coop-battle-reconciliation`).
- New finance ledger entry types or transaction categories.
- Faction-standing on contract closure (`add-faction-standing`).
- Per-day DayReport breakdown, co-op onboarding wizard, GM reload commit — separate wave-3 items.
