## Why

The customizer review identified hidden draft status, unreachable saved history, and no undo controls. The user requested the next steps and optimizations after the non-3D repairs were verified.

## What Changes

Expose browser-write status and the last known library version; open saved history from Unit actions; restore a historical design into the selected browser draft; provide bounded per-unit undo and redo.

## Capabilities

### New Capabilities

- `customizer-edit-recovery`: observable save state and recovery of editing operations.

## Non-goals

3D/models, combat changes, non-BattleMech editing history, new construction rules, equipment discovery placement, baseline analysis, migrations, dependencies, commits, publication, and archive/sync are excluded.

## Impact

Build on [unit stores](../../specs/unit-store-architecture/spec.md), [unit versioning](../../specs/unit-versioning/spec.md), and [multi-unit tabs](../../specs/multi-unit-tabs/spec.md). Existing source provenance remains distinct from the most recent library-save identity. Existing shared-tree work remains intact.
