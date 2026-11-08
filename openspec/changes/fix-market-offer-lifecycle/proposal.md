# Fix local market offer lifecycle

## Why

Declined contracts can be accepted, hires enroll before payment is committed,
and unit purchases do not record or consume their offer. Old saves can retain
offers that have already been accepted or paid. Local controls also remain
available on co-op pages, where asynchronous save rollback can restore money
without restoring the roster.

## What Changes

- Own local offer eligibility and old-save cleanup in `markets/offerLifecycle.ts`.
- Refuse local mutations and seeding during day advance or in co-op campaigns.
- Check funds, record the transaction and consume an offer before enrollment;
  restore local state on enrollment failure and preserve loan metadata.
- Normalize retained offers through processors and both campaign loaders.
- Keep co-op proposals, authority, event formats and persisted shapes unchanged.

## Capabilities

### Modified Capabilities

- `markets-system`: eligibility, payment ordering, offer consumption and recovery.

## Impact

K14a changes local stores, market rules/processors, loaders and market UI only.
K14b owns source-authoritative co-op acceptance and market hiring. Root approved
blocking local market actions whenever `coopSession` exists. This is one draft
PR; no merge is authorized. Canonical requirements remain in
`openspec/specs/markets-system/spec.md` until this change lands.
