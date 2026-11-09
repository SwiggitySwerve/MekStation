## Why

Non-mech browser drafts do not persist confirmed library receipts. Reopened
custom-library designs likewise lack those receipts, so a shared save-state
reader cannot report their last confirmed save correctly.

## What Changes

- First move the five existing persisted projections unchanged into one shared
  persistence module, verified against literal pre-change drafts.
- Add optional receipt metadata to non-mech state types and a common persistence
  wrapper for all six editor factories. An absent receipt adds no stored field.
- Add adapters for normalized draft/library fingerprints and confirmed receipt
  writes. Existing mech fingerprints continue through their original facade.
- Record receipts on validated, versioned custom-library loads for editable
  families. Canonical loads and read-only capital views retain existing behavior.

## Non-goals

Editor forms, construction/BV rules, action implementations, loader normalization,
loading request de-duplication, UI status consumers, and save-dialog completion
remain unchanged. PR3 adopts the adapters in UI consumers after this PR merges.

## Impact

Extends [customizer-edit-recovery](../../specs/customizer-edit-recovery/spec.md).
Old non-mech drafts without a receipt load and persist unchanged; their existing
modified flags are retained. Stored receipt metadata is optional and additive.
There are no wire, replay, SQLite, or generated-contract changes. Persisted field
selection has one definition shared by storage and fingerprints.
