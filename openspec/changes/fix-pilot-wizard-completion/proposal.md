## Why

The pilot wizard reports success when creation returns null, including when a pilot was saved but the roster refresh failed. It also navigates to temporary statblock IDs, issues competing completion navigations, and saves random skills that differ from the review screen.

## What Changes

- Guard submission synchronously and keep a local pending state through completion.
- Show the store error for null creation results, block another create in that wizard session, and offer Return to roster without claiming that no pilot was saved.
- Complete statblocks with a null navigation ID and give successful completion one navigation owner.
- Add optional reviewed skills to random creation, retaining legacy skill generation and the server SPA roll, and reject invalid supplied skills before persistence.

## Impact

- Affected capability: [pilot-system](../../specs/pilot-system/spec.md).
- Affected code: pilot wizard, pilot creation page, pilot store, pilots POST API, and pilot service.
- The random POST request gains optional skills. Persisted pilot formats, database schemas, gameplay events, and replay formats do not change.
- U8 mutation reload semantics remain authoritative: null does not prove that no pilot was saved.
