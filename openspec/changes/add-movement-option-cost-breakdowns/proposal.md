# Add Movement Option Cost Breakdowns

## Why

When multiple movement modes evaluate the same destination hex, the tactical map
now preserves all options, but only the primary option exposes terrain and
elevation cost components. That hides important rules evidence for alternate
walk/run/jump outcomes.

## What Changes

- Extend same-hex movement option metadata with terrain cost, elevation delta,
  and elevation cost.
- Include those per-option cost components in tactical projection explanations.
- Surface stable hex and movement badge metadata for option terrain/elevation
  costs.

## Impact

Players and tests can inspect why each movement mode costs what it costs even
when several movement projections overlap on the same hex.
