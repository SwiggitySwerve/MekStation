# Change: Consolidate Documentation into OpenSpec

## Why

There are two parallel documentation systems with overlapping content:

- `openspec/specs/` - Formal requirements (WHEN/THEN scenarios)
- `docs/battletech/agents/` - Implementation guides with same formulas

This creates maintenance burden and confusion about the source of truth.

## What Changes

- **REMOVED**: Delete `docs/battletech/agents/` directory (11 files)
- **MODIFIED**: Add TechManual page references to OpenSpec specs where missing
- **ADDED**: Create `docs/battletech/README.md` pointing to OpenSpec as source of truth

## Impact

- Affected specs: All specs gain source references
- Deleted files: `docs/battletech/agents/*.md` (11 files, ~70KB)
- OpenSpec becomes the single source of truth for BattleTech rules
