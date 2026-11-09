# Fix Quick Game transitions and error recovery

## Why

Quick Game's public nextStep action treats Playing, Results, and unknown steps as an index before setup and returns them to unit selection. A failed auto-resolve also leaves the Battle Error card without a recovery action.

## What Changes

- Advance only from valid, nonterminal setup steps, preserving unit selection validation.
- Remove the overridden playAgain action from the battle action factory; retain the store's authoritative reset.
- Offer Start New Setup on the Battle Error card using playAgain(false), preserving selected units and scenario configuration while creating a fresh game.

## Impact

Affected capability: [quick-session](../../specs/quick-session/spec.md). Integration points are the Quick Game store, setup consumers, results reset, and battle error presentation. No engine, multiplayer, event schema, persistence format, temporal availability, or tech base rules change.

## Non-goals

Changing combat resolution, tactical launch, replay recovery, or other Wave 3 lanes.
