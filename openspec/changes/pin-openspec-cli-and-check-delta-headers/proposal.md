# Pin OpenSpec validation and reject duplicate delta headers

## Why

Bare `npx openspec` can resolve the unrelated unscoped npm package. Repeated
operation headers in active deltas also pass the current CI quality check.

## What Changes

- Pin full strict validation to `@fission-ai/openspec@1.5.0` through
  `openspec:validate`, without changing dependencies or the lockfile.
- Repoint executable QC catalog commands and their exact-string contracts to
  the pinned script, preserving all other catalog content.
- Reject repeated operation headers in active delta specs through the existing
  OpenSpec CI quality validator, with Node regression tests in PR static checks.
- Regroup the ProtoMech and vehicle parity additions under their first ADDED
  sections, preserving each requirement's operation and bytes.

## Impact

Affected capability: `e2e-testing`, which owns the existing OpenSpec CI quality
contracts. No gameplay, schema, persistence, or catalog changes.

The existing combat validator's 1.14.0 pin and recorded 1.14.3 diagnostics stay
unchanged. Exact matching of MODIFIED requirement names remains a follow-up.
This package is required by `openspec/AGENTS.md`'s rule requiring a corresponding
delta for CI changes; it does not synchronize or archive canonical specs.
