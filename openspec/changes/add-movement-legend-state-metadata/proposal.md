# Proposal: Add Movement Legend State Metadata

## Why

The tactical map already renders an MP legend for Walk, Run, and Jump, but the legend lives in a non-interactive HTML overlay. That keeps map clicks safe, but it also weakens the existing spec requirement that hovering disabled Jump explains "No jump capability." The current rows expose some test metadata, yet they do not carry a disabled reason or accessible state text.

Movement-mode highlights should be self-explanatory and inspectable without changing any movement legality.

## What Changes

- Add accessible row labels for Walk, Run, and Jump legend states.
- Expose disabled Jump reason metadata.
- Keep the legend overlay nonblocking while allowing legend-row hover/title inspection.
- Preserve existing active/dim visual behavior and movement-range rendering.

## Out of Scope

- Changing movement range calculation.
- Changing movement-mode selection controls in the tactical action dock.
- Redesigning the legend placement or palette.

## Impact

- Affected spec: `tactical-map-interface`
- Affected code: `src/components/gameplay/HexMapDisplay/HexMapDisplay.tooltips.tsx`
- Tests: focused MP legend render coverage
