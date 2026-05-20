# Change: Wire Starmap Into Campaign

## Why

The `StarmapDisplay` component exists (per the `starmap-interface` capability spec) with Canvas-based rendering, LOD, pan/zoom, and click/hover handlers — but the only place it mounts today is Storybook. The campaign UI has no starmap surface, no "current location" concept, and no way for the player to navigate between star systems. Wave 6.4 closes that gap with the minimum surface that lets a campaign actually USE the starmap end-to-end:

1. A canonical seed dataset of Inner Sphere systems shipped with the app
2. A campaign page route mounting the starmap
3. A `currentSystemId` field on the campaign record (the "you are here" pin)
4. A travel action that updates `currentSystemId` and emits an activity-log entry
5. Campaign nav exposes the starmap link

This is explicitly NOT the full 3,359-system Inner Sphere dataset or jump-route pathfinding — those are post-MVP. The MVP ships a ~40-system seed (the well-known capitals + faction-defining worlds) so the operator can navigate and the integration tests can run deterministically. The full SUCKit dataset import is named as a follow-up.

## What Changes

- **ADDED** `IStarSystem` data model + 40-system seed dataset at `src/lib/starmap/seed/inner-sphere-seed.json`
- **ADDED** `ICampaign.currentSystemId?: string` carrying the player's "you are here" pin (default: `'terra'`)
- **ADDED** `useCampaignStore.travelToSystem(systemId)` action — validates the systemId, sets `currentSystemId`, and emits an activity-log entry tagged `category: 'travel'`
- **ADDED** new page route `/gameplay/campaigns/[id]/starmap` mounting `<StarmapDisplay>` against the seed dataset, with click-to-select + "Travel here" button wiring
- **ADDED** Campaign nav link "Starmap" pointing to the new route
- **ADDED** Regression tests: seed dataset shape, `travelToSystem` happy + unknown-id paths, page mount + nav-link presence

## Dependencies

- **Requires (already shipped)**: `starmap-interface` (StarmapDisplay component), `useCampaignStore`, activity-log (Wave 6.1.B)
- **No new transport, no new dependencies** — react-konva already vendored

## Impact

- Affected specs: `starmap-interface` (NEW reqs for seed dataset + travel action), `campaign-system` (NEW req for currentSystemId field)
- Affected code:
  - `src/lib/starmap/seed/inner-sphere-seed.json` (NEW)
  - `src/types/starmap/StarSystem.ts` (NEW)
  - `src/types/campaign/Campaign.ts` — adds `currentSystemId?: string`
  - `src/stores/campaign/useCampaignStore.ts` — adds `travelToSystem`
  - `src/pages/gameplay/campaigns/[id]/starmap.tsx` (NEW)
  - `src/components/campaign/CampaignNavigation.tsx` — adds Starmap link
- No database migrations — the field is optional and persisted via the existing zustand persistence layer
- Backward compatible: a campaign without `currentSystemId` is treated as "stationed at Terra" by the UI (a sane default for new + legacy campaigns)

## Non-Goals

- Importing the full 3,359-system Inner Sphere (SUCKit) dataset — the 40-system seed is the MVP; the full import is a separate change after the integration shape is proven
- Jump-route pathfinding (multi-hop travel with KF jump distance) — the MVP "travel here" is point-to-point with no time cost
- Faction borders / planetary stats / economy — out of scope; the seed dataset carries id / name / position / faction only
- Multiplayer co-op location sync — future change, after the basic single-player surface is stable
- Tactical-map ↔ starmap binding (e.g., "battle here generates a scenario tagged with this planet's biome") — future
