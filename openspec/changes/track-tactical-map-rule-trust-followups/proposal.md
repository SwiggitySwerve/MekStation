# Track Tactical Map Rule-Trust Followups

## Why

The tactical-map projection branch now has broad OpenSpec coverage and a source
matrix, but maintenance review found three remaining trust boundaries that
should stay explicit before the branch is treated as fully rules-complete:
represented underwater helper provenance, runtime movement/oracle gaps, and
broader isometric interaction coverage.

## What Changes

- Add a tactical-map interface follow-up contract for unresolved rule-trust
  boundaries.
- Require represented helper provenance to remain distinguishable from
  MegaMek/official source-pinned evidence.
- Carry the remaining movement runtime mutation/oracle matrix and isometric
  interaction sweep as named follow-up outcomes.

## Out Of Scope

- Implementing the follow-up movement, combat, or isometric behavior.
- Changing current tactical-map legality, rendering, or commit validation.
- Claiming full MegaMek parity for unmodeled runtime transitions or browser
  interaction paths.
