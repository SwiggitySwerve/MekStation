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

The same tracking rule now applies to vehicle criticals: the
`align-vehicle-critical-location-tables` change source-pins committed vehicle
critical dispatch to MegaMek Tank/VTOL struck-location tables, so follow-up
tracking should no longer present full location-sensitive table selection as
missing.

## What Changes

- Add a tactical-map interface follow-up contract for unresolved rule-trust
  boundaries.
- Require follow-up tracking to distinguish unresolved represented-helper
  provenance from behavior that has since gained MegaMek/official source-pinned
  evidence.
- Carry the remaining movement runtime mutation/oracle matrix and isometric
  interaction sweep as named follow-up outcomes while recognizing direct
  isometric touch rotation once `add-isometric-touch-camera-gesture` lands and
  rendered occlusion retargeting once `add-isometric-occlusion-rotation-sweep`
  lands.
- Narrow the represented vehicle critical follow-up boundary to cargo import
  parity, dual-turret split identity, and external oracle sweeps.

## Out Of Scope

- Implementing the follow-up movement, combat, or isometric behavior.
- Changing current tactical-map legality, rendering, or commit validation.
- Claiming full MegaMek parity for unmodeled runtime transitions or browser
  interaction paths.
