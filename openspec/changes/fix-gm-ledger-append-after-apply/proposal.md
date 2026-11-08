# Append GM ledger records only after the change applied (S14)

## Why

`approveGmCascadePreview` appended the intervention record and its action
ledger row as soon as the domain implementer derived the approved state. Both
production callers apply that state afterwards, and that apply can still fail:

- the GM ledger control plane hands it to the campaign store or, on a co-op
  campaign, to the live host, which can refuse it or throw;
- the tactical GM surface hands it to the live `InteractiveSession`, whose
  `advancePhase` throws when the game is not active.

A refused or failed apply therefore left an "approved" record for a change that
never happened, and it showed as a ledger row at the next refresh. A refused
time cascade had also already patched the roster. Nothing refused a second
record with the same id, so one tactical preview approved twice was applied to
the engine twice. The canonical spec already says a record is appended "only
after GM approval and successful application"; the callers broke it.

## What Changes

- The pipeline splits approval in two. `prepareGmCascadeApproval` runs every
  check and derives the state, appending nothing. `recordGmCascadeApproval`
  appends the record and its action ledger row. `approveGmCascadePreview`
  stays as prepare-then-record for callers with no apply of their own.
- Both checks refuse an intervention id the ledger already holds, and
  `InterventionLedger.appendApprovedRecord` throws on one.
- The control plane prepares, applies, and only when the apply succeeded
  patches the roster and records the approval. A manual takeover records once
  per preview.
- The tactical surface prepares, applies on the engine inside a `try`, and
  records only after the engine accepted it; an engine throw is a blocked
  approval.

No event, payload, wire, schema or persisted-format change: the intervention
and action ledgers are in-memory, and the persisted `gmInterventionEvents` and
`timeCascadeEvents` keep their shapes and writers.

## Impact

- `src/lib/interventions/GmCascadePreviewPipeline.ts`, `InterventionLedger.ts`, `index.ts`
- `src/types/interventions/GmCascadePreviewTypes.ts`, `index.ts`
- `src/components/campaign/gm/GmCampaignInterventionControlPlane.tsx`
- `src/pages-modules/gameplay/games/gmTacticalInterventionSurface.ts`
- `scripts/qc/validate-gm-campaign-ledger.mjs` (source tokens)
