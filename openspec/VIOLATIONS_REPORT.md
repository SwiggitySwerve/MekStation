# OpenSpec Terminology Violations Report

**Status date:** 2026-06-30
**Scope:** Live OpenSpec source-of-truth files and active, non-archived change files.

## Summary

Current terminology validation is clean.

| Check | Result |
| --- | --- |
| Files scanned | 222 |
| Files with violations | 0 |
| Errors | 0 |
| Warnings | 0 |
| Total violations | 0 |

## Verification Command

```powershell
npm.cmd run terminology:validate:strict
```

## Boundary

Archived change folders under `openspec/changes/archive/**` are historical evidence and are intentionally excluded from the live terminology gate. Current terminology correctness is enforced against `openspec/specs/**` and any active, non-archived OpenSpec changes.

## Tooling Update

The terminology validator now supports a `code-block` skip context for rules that should apply to prose but not to implementation-shaped examples. The `faction:` property rule was removed because campaign and starmap specs now legitimately model faction identity; faction is no longer always a mistaken tech-base field.
