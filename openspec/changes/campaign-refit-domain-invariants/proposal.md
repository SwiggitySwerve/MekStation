# Campaign refit domain invariants

## Why
Authorized current-version PUTs can create several open refit orders for one unit, pausing all work. The approved campaign-save-loss proposal section 10 and Root rulings 8-12 require an authoritative ratchet while preserving legacy saves.

## What Changes
- Commit A extracts pure status predicates, preserving behavior and facade exports.
- Commit B checks client envelopes after authorization and version CAS, before journal append; introduces typed 422 refusals and client parsing.
- Adoption tolerates and logs legacy duplicates; server journal materialization only monitors them.

## Impact
Campaign persistence, refit predicate consumers, API refusal transport and save-state parsing. No schema, envelope, co-op protocol, digest, golden or fixture changes. Full card, discard, pre-flight and adoption-marker integration belong to PR C after adoption.
