# Add Combat Reason Hover Provenance

## Why

Combat hover reason rows are the final plain-language answer for why a target
is attackable, blocked, out of range, invalid, hidden, or modified. Specialized
combat rows already expose projection source metadata, but the generic reason
row should carry the same combat-channel source and rule references so the
player-facing explanation is auditable where it is read.

## What Changes

- Replace combat-only and combined tactical generic combat reason text with a
  shared projection-backed context row.
- Expose stable attributes for attackability, target ids, range bracket,
  distance, LOS state, firing arc, blocked reason, invalid reason/details,
  visibility reason, LOS blocker reason, to-hit reason, indirect-fire reason,
  cover reason, and displayed combat reason.
- Surface combat projection source and rule references on the reason row.

## Out Of Scope

- Changing range classification, target validity, LOS classification, to-hit
  modifiers, weapon option filtering, fog visibility, attack validation, or
  attack resolution.
