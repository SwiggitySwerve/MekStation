## Why

The unit editors track browser writes, library receipts, and modification through
separate implementations. A shared save-state owner needs a compatibility
boundary before non-mech factories and UI consumers can adopt it.

## What Changes

- Introduce a pure save-state aggregate, exhaustive event reducer, receipt type,
  and baseline comparison contract.
- Extract canonical JSON and temporary equipment-ID normalization from the mech
  fingerprint implementation without changing its output.
- Delegate existing mech receipt construction and dirty comparisons to the owner.
- Pin literal persisted drafts and fingerprints captured from main at
  `7c8579e192e521183fcfb68908ea8b0f3ba7f3fc` before the extraction.
- Document how absent optional fields preserve existing fingerprint bytes.

## Non-goals

Non-mech factory integration, unit loading, UI consumers, async save-completion
behavior, construction rules, and gameplay are separate work. Existing facade
exports, undo behavior, registry/reset seams, persisted fields, and storage keys
remain unchanged.

## Impact

Extends [customizer-edit-recovery](../../specs/customizer-edit-recovery/spec.md).
The owner accepts plain values and imports no stores, serializers, storage, or
UI. Persisted `librarySave` retains its existing shape. No migration is needed
because both fingerprint bytes and stored fields remain unchanged. Literal
old-shape draft tests exercise the existing registry hydration path, edit/undo,
receipt recording, and registry reset. Later adoption remains explicitly staged.
