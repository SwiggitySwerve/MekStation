# Proposal: Preserve Rejected Movement Plan

## Why

The tactical map should agree with the engine at commit time, including failure paths. `commitPlannedMovement` called the engine and then cleared the plan and selected unit even if the engine emitted `MovementInvalid` instead of `MovementDeclared`. That made a rejected move behave like a completed action in the UI shell.

## What Changes

- After applying a planned movement, inspect the new event slice for a `MovementDeclared` event owned by the selected unit.
- Only clear the movement plan, selection, valid movement hexes, and interactive phase when the engine accepted the move.
- If the engine emits only an invalid movement event, refresh the session so the event log can show the rejection while preserving the selected unit and planned movement for correction.
- Add focused store coverage for engine-rejected movement commits.

## Out of Scope

- Changing movement reachability or path validation rules.
- Adding new toast/error UI for invalid movement events.
- Changing successful movement animation behavior.

## Impact

- Affected spec: `tactical-map-interface`
- Affected code: movement plan commit handshake
- Tests: focused gameplay store combat-flow coverage
