## Why

Pilot PUT and force PATCH accept arbitrary statuses, and unknown persisted pilot statuses allow force assignment. Normal vault edits can revive a KIA pilot despite the existing healing guards.

## What Changes

- Parse supplied statuses against the existing enums and return sentence-case 400 errors without mutation for invalid values.
- Consolidate the two healing guards without changing their behavior, then enforce KIA terminality for normal vault persistence updates.
- Refuse force assignment for unknown persisted pilot statuses.
- Document existing-data inspection and correction without running it.
- Keep campaign death propagation and an explicit GM revive operation as follow-ups.

## Capabilities

### Modified Capabilities

- `pilot-system`: validate vault status and normal transitions.
- `force-management`: validate force status and refuse unknown pilot availability.

## Impact

API, pilot/force persistence boundaries, shared healing eligibility, and regression tests. No schema, persisted format, event payload, replay fixture, campaign journal, or construction-rule changes. The sole accounting entry is the colocated `.ledger.json`.

See [design.md](design.md) for the complete caller inventory, upstream evidence, data cleanup procedure, and scope decisions. Root approved this scope on 2026-11-08. Deliver one draft PR with the healing consolidation as the first behavior-preserving commit; never merge.
