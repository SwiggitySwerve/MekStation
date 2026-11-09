## Why

Pre-battle launches can submit twice while preparing a session or waiting for navigation. A mounted game page also retains persistence flags from the previous session, and failed match-log persistence is marked successful without notifying the player.

## What Changes

- Guard force-based and unit-picker launches synchronously through navigation settlement.
- Preserve S1a's explicit restart linkage, publication ordering, and launch refusal messages.
- Track match-log and encounter-replay attempts by session ID, including failed attempts, and show persistence errors through the existing toast service.

## Impact

The encounter-system capability gains UI lifecycle guarantees. Only the two pre-battle hooks, game-session lifecycle hook, and existing hook tests change. No persisted schema, event payload, replay format, equipment availability, or combat rule changes.

## Non-goals

Victory-page recovery, automatic persistence retries, engine changes, multiplayer authority changes, and other Wave 3 items.
