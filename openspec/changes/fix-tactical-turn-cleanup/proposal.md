# Recover tactical turn controls after failures

## Why

An AI exception leaves tactical controls in the opponent-turn state. Attack commits clear different draft fields, and resetting an animation queue strands a pending phase advance.

## What Changes

- Restore the session and interactive phase in an AI-turn `finally`, preserving the original exception.
- Share successful attack cleanup across planned attacks, composed volleys, legacy fire and Hold Fire.
- Cancel waiting phase advancement on animation reset and allow a fresh request.

## Capabilities

### New Capabilities

- `tactical-turn-lifecycle`: presentation state after AI turns, attack commits and animation cancellation.

### Modified Capabilities

- None.

## Impact

Five store modules and existing store tests. No engine, gameplay reducer, simulation, wire, event, replay or persisted schema changes. Movement and multiplayer authority remain with their current owners.
