# Prevent stale GM cascade approvals

## Why

Only time previews carry a campaign version today. Other corrections can apply projections after their source state changes. The ledger status type also declares previewed and cancelled even though the append boundary rejects them and the specification forbids recording them.

## What Changes

- Extract the existing time freshness check without changing its behavior, then capture freshness in the cascade pipeline for every preview kind.
- Compare campaign identity, updatedAt and currentDate; fingerprint tactical state through existing hashing utilities.
- Block stale approval before domain application or either ledger append.
- Keep freshness on transient previews, outside approved records, campaign saves and co-op wire payloads.
- Narrow canonical intervention record status to approved or manual. Preview and cancellation remain transient results.

## Impact

The existing interventions owner implements the rule. No replay schema, event payload, database migration or stored-history rewrite changes. Local campaign and co-op funds approval share the guard. Host-side journal-version comparison and local-only co-op time approval remain outside this change.

## Affected Specifications

- `openspec/specs/gm-cascade-preview/spec.md`
