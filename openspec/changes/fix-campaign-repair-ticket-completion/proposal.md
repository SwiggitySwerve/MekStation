## Why

Campaign GM repair completion currently closes a ticket without repairing the unit or consuming parts. Terminal tickets inflate readiness warnings and saved queues.

## What Changes

- Share repair application between day processing and GM completion.
- Capture GM unit and inventory changes using existing ledger effect families.
- Exclude terminal tickets from active projections and safely prune unreferenced terminal tickets.
- Preserve old save formats and pending/recent outcome deduplication.

## Capabilities

### Modified Capabilities
- `repair`: campaign ticket completion and safe pruning.
- `campaign-combat-loop`: active repair inventory projection.
- `gm-campaign-intervention-boundaries`: complete GM repair effects and replay equality.

## Impact

Campaign repair owner, day processor, GM intervention adapter, bay/readiness/dashboard projections and their tests. No schema or protocol changes. K5 salvage acceptance, K6 readiness caches and K8 inventory rules stay outside this change.
