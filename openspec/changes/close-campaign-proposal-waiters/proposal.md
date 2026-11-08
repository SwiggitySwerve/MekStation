# Close campaign proposal waiters safely

## Why
Duplicate proposal IDs can overwrite the first pending entry, timer, or waiter. Closing the arbiter, runtime, or socket can leave guest callers pending forever.

## What Changes
- Reject ID reuse within an arbiter or transport lifetime using existing mechanical rejection reason `malformed-intent`.
- Settle pending callers with existing `session-closed` results on closure and unsubscribe listeners.
- Register local waiters before asynchronous admission; settle old waiters when reconnect replaces their transport.

## Capabilities
### New Capabilities
- None.
### Modified Capabilities
- `coop-campaign-sync`: proposal identity and terminal closure behavior.

## Impact
Server arbiter, local runtime, campaign transport, and guest adapter. No wire, event, schema, persistence, or parity changes. Preserve #3068 host intentContext market reader and guarded progression semantics.
