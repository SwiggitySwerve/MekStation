# Change: Extend Firing Arc Overlay To Extreme Range

## Why

Combat projection can mark represented extreme-range weapon attacks as legal,
but the selected-weapon firing-arc overlay still capped its shaded envelope at
long range. That can make a legal extreme-range target appear outside the
selected weapon's tactical arc shading.

## What Changes

- Derive selected-weapon arc overlay reach from the maximum represented weapon
  range, including `ranges.extreme` when present.
- Keep long range as the fallback for weapons without represented extreme
  range.
- Add focused component coverage proving extreme-range combat projection and
  firing-arc shading agree.

## Non-Goals

- Change BattleTech range bracket math, to-hit modifiers, or attack
  resolution.
- Add new extreme-range behavior for weapons that do not already expose a
  represented extreme cutoff.
