# Unit save state

`unitSaveState.ts` owns save-state types, transitions, receipt construction,
and comparisons against an editor baseline. It accepts plain values and does
not import a store, browser storage, serializers, routing, or UI.

## Independent facts

- Modification is `clean`, `modified`, or `unknown`. Missing persisted
  modification data is unknown; a consumer deciding whether to discard work
  must treat unknown conservatively.
- A browser draft is `pending`, `saved`, or `failed`. Only storage evidence
  establishes a completed write. A failed write can coexist with a successful
  library save.
- The library state is `none`, `matched`, or `changed`. Matched and changed
  carry the last confirmed receipt. Original source provenance is not a receipt
  and a receipt does not assert that its version is the latest server version.

| Event                                   | Effect                                                                                  |
| --------------------------------------- | --------------------------------------------------------------------------------------- |
| Hydration                               | Read the existing metadata without creating successful receipts.                        |
| Unit changed or explicitly marked clean | Update modification and compare library content against the existing receipt.           |
| Browser write completed                 | Update only the browser-draft result.                                                   |
| Library save confirmed                  | Record the submitted content; compare current editor and library content independently. |
| Library save failed                     | Retain all existing facts.                                                              |

All event variants are handled exhaustively. A library completion records what
was submitted even if later edits arrived. No editor baseline means modified;
an absent legacy `draftFingerprint` must never be replaced with today's content
and presented as a confirmed saved baseline.

## Compatibility boundary

The persisted receipt remains `{ id, version, fingerprint, draftFingerprint? }`.
`isModified`, existing storage keys, and Zustand envelopes remain readable.
`SaveState` is an aggregate over those facts, not a new persisted field.

`unitSaveFingerprints.ts` owns canonical JSON and temporary equipment-ID
normalization. Its field-extension instructions are part of the persisted
fingerprint contract. The literal `7c8579e19` draft fixture was captured from
the old implementation before extraction and must not be regenerated to make
a changed fingerprint pass.

## Rollout

The first PR delegates existing mech receipt construction and baseline
comparisons to the owner. Mech action/history APIs, persisted projections,
registry/reset seams, and fingerprint bytes remain unchanged. Non-mech factory
integration, family-aware UI consumers, and async save-completion changes are
separate PRs. The initial owner does not claim that every existing writer has
already been routed through it.

PR2 adds `unitSaveStateAdapters.ts` for the six editable store families. Mech
fingerprints still delegate to the original facade. Non-mech draft fingerprints
reuse the existing field projections in `unitDraftPersistence.ts`, excluding
runtime identity, timestamps, modification/receipt metadata and cached BV. Mount
IDs and ammunition links use the same normalization owner as mech equipment.
Library comparisons use the existing family serializers. Their transport IDs
are validated before being removed from the comparison.

All six factories use the additive receipt wrapper. An absent receipt adds no
field to a legacy draft. New persisted editable fields join their family's
projection once, following the undefined/absence rule in
`unitSaveFingerprints.ts`. In particular, a missing ProtoMech numeric armor type
stays undefined in the projection; the adapter supplies no Standard armor
default. Existing registry hydration/default behavior is retained.

The library loader attaches receipts only after validated, versioned custom
loads. Canonical designs and read-only capital views acquire no receipt. UI
status readers and save-dialog completion writers adopt these adapters in PR3;
PR2 does not change editor mutation or undo behavior.
