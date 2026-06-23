## Why

GM-ledger corrections can now repair combat, post-combat, and base economy mistakes, but accumulated campaign time remains the hardest state transition to audit because travel, repairs, contract windows, markets, recovery, and upkeep can all cascade from one approval. Wave 9 adds a rules-backed time cascade surface so time jumps are previewed, approved, replayable, and manually recoverable instead of being an opaque day-advance mutation.

## What Changes

- Add a ledger-backed time cascade capability for one-day advances, multi-day jumps, travel windows, repair progression, contract deadline/window updates, market refreshes, pilot recovery, upkeep, and accumulated campaign effects.
- Extend GM cascade previews so time effects show player-visible net changes separately from private GM rationale and conflict analysis.
- Extend the intervention ledger implementer boundary so time-cascade records can be previewed, approved, replayed, redacted, and blocked for manual takeover when conflicts are ambiguous.
- Add deterministic tests and fixtures that prove preview/apply/replay parity for simple and conflicting time jumps.

## Non-goals

- Rebalancing campaign economy values, repair durations, travel times, market tables, or contract generation.
- Building the final browser UI for every time-cascade control; this slice provides the domain contract and testable orchestration surface the UI can call.
- Catalog/rules parity expansion for weapons, ammo, physical attacks, or special combat behavior; that remains Wave 10.

## Capabilities

### New Capabilities

- `time-cascade-system`: Ledger-backed campaign time advancement previews, approvals, replay, redaction, and manual conflict fallback.

### Modified Capabilities

- `gm-cascade-preview`: Time advancement joins the GM preview contract with net-effect summaries, blockers, and manual takeover escalation.
- `gm-campaign-intervention-boundaries`: Time moves from deferred to supported campaign intervention scope while preserving hidden GM rationale boundaries.
- `gm-authority-redaction`: Time-cascade approvals emit player-safe summaries and keep private conflict/rationale details GM-only.
- `intervention-ledger-abstraction`: Approved time-cascade records must be replayable action-ledger entries with deterministic projected effects.

## Impact

- Types under `src/types/interventions/` and `src/types/campaign/`.
- Intervention preview/projection/implementer modules under `src/lib/interventions/`.
- Existing campaign date, travel, repair, contract, market, recovery, and finance models are consumed by the cascade engine without changing their source-of-truth ownership.
- Focused Jest coverage for preview/apply/replay/redaction/manual-takeover behavior.
