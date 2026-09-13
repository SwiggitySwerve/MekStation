# Repair equipment catalog filtering and placement

## Why

Electronics has no primary catalog filter. Pagination places it after many ammunition rows, so hiding ammo misleadingly appears necessary to reveal it. Characterization with actual catalog data rejects SRM, LRM and Gauss ammunition for compatible mounted weapons and admits AC/20 ammunition for AC/2. Unit context passes through an effect before memoized results update. Catalog rows use fully opaque critical-slot colors.

## What changes

- Provide an independent Electronics category and consistent category, search, visibility and pagination behavior.
- Preserve ammunition compatibility metadata through the JSON catalog conversion; replace substring matching with declared or conservative exact identities.
- Refresh results immediately when weapons or active units change, distinguishing an empty loadout from standalone browsing.
- Soften catalog row backgrounds while preserving category colors, readable content and controls.
- Offer optional Add and place with legal-location preview and one-step undo/redo.

## Non-goals

No model/chassis work, catalog generator overhaul, tabletop rule changes, combat changes, baseline comparison, global palette changes, publication, commits or archival.

## Integration and risk

Modify equipment-browser; reuse equipment-placement and customizer-edit-recovery. Boundaries include EquipmentLookupService, equipmentAggregation, IEquipmentItem, equipment store/hook, catalog controls/cards, unit equipment actions and Critical Slots helpers. Preserve independent availability rules. Do not hand-edit generated catalogs. Imported ammo sometimes omits compatibility IDs: fallback must not confuse families, rack sizes or variants. Placement must calculate variable properties, preserve fixed OmniMech items and reject partial/stale additions. Verify real subscriptions and real catalog records.
