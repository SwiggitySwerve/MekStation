# Align workflow contracts with measured CI budgets

## Why

Phase G replaces inline aggregation with the deterministic Node owner, builds a
complete Linux installer, and derives static job deadlines from recorded main
medians. Existing contracts still inspect the jq implementation, old Linux step
name and literal 25-minute E2E deadline. Static Checks also gains a separate
read-only advisory reporter. These mismatches fail the required unit shards.

## What Changes

- Exercise the aggregator's actual workflow-selected CLI with complete needs.
  Keep every success, gated skip, failure, cancellation and missing-input case.
- Read the E2E timeout from the validated canonical budget. Both shorter and
  longer workflow overrides remain invalid; all browser coverage guards remain.
- Pin the complete Linux installer command while retaining both desktop
  platforms and unpacked application validation.
- Enumerate the read-only advisory reporter explicitly; all other non-tsrs
  Static Checks steps remain blocking.

## Impact

Affected capability: `e2e-testing`. Affected code: workflow contract suites and
the OpenSpec CI contract owner. No application, coverage, cache-count or package
cap changes. The measured 15-minute E2E budget supersedes the literal 25-minute
spec value under Root's Phase G timeout instruction. Canonical spec sync/archive
remains pending acceptance; this change records the narrow delta now.
