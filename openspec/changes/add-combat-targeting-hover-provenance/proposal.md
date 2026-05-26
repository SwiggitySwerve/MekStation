# Add Combat Targeting Hover Provenance

## Why

Combat range and geometry rows are where the player verifies weapon range bands,
distance, LOS state, and firing arc before committing an attack. Those rows
should expose the same combat projection source and rule references as the
specialized combat explanation rows.

## What Changes

- Replace combat-only and combined tactical range/geometry text with a shared
  combat targeting context row pair.
- Expose stable attributes for target presence, attackability, target ids,
  valid target ids, range bracket, distance, in-range state, in-arc state, LOS
  state, firing arc, weapons in range, weapons in arc, and weapons available.
- Surface combat projection source and rule references on both range and
  geometry rows.

## Out Of Scope

- Changing range classification, firing arc classification, LOS classification,
  target validity, weapon option filtering, attack validation, or attack
  resolution.
