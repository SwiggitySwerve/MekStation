# Design

## Approach

Add a lightweight Node validator under `scripts/qc/` that reads the QC registry and source anchors for the post-combat/base-economy GM ledger proof. The validator emits a compact summary by default and JSON when requested.

## Validation Contract

- The campaign ledger QC surface must exist under `campaign-economy-progression` with a focused claim ID and runnable commands.
- Supported GM campaign domains must remain represented: `post-combat`, `economy`, `repair`, and `salvage`.
- Supported correction families must remain represented in type, preview, projection, implementer, and focused test anchors: salvage allocation, repair ticket, funds transaction, inventory lot, and base unit state.
- Focused tests must continue to prove ready approval, replay, public/GM projection redaction, action-ledger append, manual-takeover blocking, and invalid target rejection.
- Required surfaces must not point at stale `activeChangeRefs` once no matching OpenSpec change directory exists.

## Boundary

This wave consolidates proof for existing post-combat and base-economy GM corrections. It does not make the journey runner, long-campaign stability runner, or future time-cascade validation obsolete; instead it verifies that the ledger layer they will rely on is still registered, anchored, and covered by focused tests.
