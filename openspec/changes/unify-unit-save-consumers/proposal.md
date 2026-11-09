## Why

The shared save-state owner and optional receipts are available, but library UI
readers still use the mech registry. Deferred non-mech saves compare Zustand
object identity, so a no-op or timestamp update can prevent save-and-close and
leave a successfully saved draft marked modified.

## What Changes

- Route status subscriptions through the requested editable family and the shared
  save-state adapters. Preserve existing public facade shapes and serializer export.
- Capture submitted content fingerprints before the API request, validate its
  response, then compare current content through the owner. Retain identity checks
  only for store replacement and target lifetime.
- Record submitted receipts for every editable family. Keep real later edits,
  unavailable targets and failed browser writes from completing save-and-close.
- Reuse the owner's status types and keep family-specific draft keys and Retry.

## Impact

Extends [customizer-edit-recovery](../../specs/customizer-edit-recovery/spec.md).
No persisted, wire, replay or fingerprint format changes. No store factories,
construction code, editor forms, loading coordinator or root tab controller edits.
