# Fix acquisition request identity and retry

## Why

A failed acquisition roll currently ends the request permanently. Request IDs
also reuse the queue length, so remove/add can cause unrelated requests to update
together and deliver into the same inventory lot.

## What Changes

- Allocate UUID request IDs at creation and reject duplicate queue inserts.
- Keep unsuccessful requests pending and retry after seven campaign calendar days,
  without a retry limit. Reuse `attempts` and `lastAttemptDate`.
- Normalize legacy duplicate IDs and terminal failures through one deterministic,
  idempotent acquisition function used by both campaign loaders and direct entry.
- Preserve existing delivered inventory and request quantities.
- Follow owner ruling D7 and MekHQ e7adc2c6f3b17ec8ad243d30843e22207fe935e4.

## Capabilities

### Modified Capabilities

- `acquisition-supply-chain`: request identity, retry eligibility and save compatibility.

## Impact

The acquisition owner, day processor, command action, both campaign deserializers,
existing tests and acquisition browser proof change. No persisted field, option,
schema version, replay schema or event payload is added. Pricing/debits and
reconstruction of historical quantity loss are separate follow-ups. Inventory
merge arithmetic is unchanged.
