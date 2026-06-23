## Why

The GM ledger core already exists, but Wave 4 needs it to be strong enough for downstream combat, economy, and time-cascade interventions. Approval paths must be atomic, and read/projection APIs must not allow accidental mutation of append-only ledger history.

## What Changes

- Harden GM cascade approval so blocked, stale, unsupported, or otherwise non-applied approvals append no intervention record and no action ledger record.
- Harden intervention/action ledger read surfaces so callers receive immutable record snapshots rather than live mutable record objects.
- Add focused regression tests for unsupported approval atomicity, action-ledger snapshot immutability, and intervention-ledger snapshot immutability.
- Keep the existing ledger API shape; this is a compatibility hardening slice, not a new GM UI implementation.

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- `gm-cascade-preview`: Approval MUST only append ledger records after the implementer successfully applies the approved preview.
- `intervention-ledger-abstraction`: Ledger read/projection surfaces MUST preserve append-only history by preventing caller-side mutation of returned records.

## Impact

- Affected code: `src/lib/interventions/GmCascadePreviewPipeline.ts`, `src/lib/interventions/InterventionLedger.ts`, `src/lib/interventions/ActionLedger.ts`, and their Jest tests.
- Affected specs: `gm-cascade-preview`, `intervention-ledger-abstraction`.
- No new dependencies or public route changes.
- Non-goals: full GM combat controls, UI shells, economy/time domain implementers, and campaign intervention screens remain later waves.
