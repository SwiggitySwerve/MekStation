# Track Tactical Map Rule-Trust Followups

## Why

The tactical-map projection branch now has broad OpenSpec coverage and a source
matrix, but maintenance review found remaining trust boundaries that should
stay explicit before the branch is treated as fully rules-complete: runtime
movement/oracle gaps, combat edge-case source pins, and broader isometric
interaction coverage. The earlier represented underwater helper provenance
boundary is now retired by the `pin-underwater-weapon-environment-source`
change, which links the map metadata to MegaMek source lines instead of a
MekStation-only helper label.

## What Changes

- Add a tactical-map interface follow-up contract for unresolved rule-trust
  boundaries.
- Require follow-up tracking to distinguish unresolved represented-helper
  provenance from behavior that has since gained MegaMek/official source-pinned
  evidence.
- Carry the remaining movement runtime mutation/oracle matrix and isometric
  interaction sweep as named follow-up outcomes.

## Out Of Scope

- Implementing the follow-up movement, combat, or isometric behavior.
- Changing current tactical-map legality, rendering, or commit validation.
- Claiming full MegaMek parity for unmodeled runtime transitions or browser
  interaction paths.
