# Require a current successful GM correction preview

## Why
Approve currently remains available before preview succeeds and after failed or stale previews. The producer pins requests before success.

## What Changes
- Bind approval to a successful preview of the exact current correction request.
- Invalidate on another preview, failure, context change, or approval consumption.
- Reject stale async completions and keep private reasons confined to commit.

## Capabilities
### New Capabilities
- None.
### Modified Capabilities
- `e2e-testing`: GM correction controls require current successful preview readiness.

## Impact
Client producer, multiplayer controls, lobby wiring, and the existing proof harness only. No wire, journal, event, or persistence changes. Server CAS and blocked-candidate behavior remain authoritative.
