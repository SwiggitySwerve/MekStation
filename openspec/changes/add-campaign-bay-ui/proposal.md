# Change: Add Campaign Bay UI

## Why

After a campaign battle, the post-battle effects are computed — repair tickets,
salvage allocations, pilot injuries — and `add-campaign-combat-loop` (CP1)
projects them into a frozen `ICampaignInventory`. But there is no screen where
the player sees or acts on any of it. `campaign-ui` covers the campaign list,
dashboard, roster, forces, and missions pages; it has **no bay surfaces**. The
player cannot see which mechs are damaged, queue or prioritise repairs, track
which pilots are in the infirmary, or accept/decline salvage. The campaign loop
has a computed-but-invisible middle.

This change adds the four post-battle bay UI surfaces — **mech bay**, **repair
bay**, **medical bay**, and **salvage acceptance** — all rendering the frozen
`ICampaignInventory` from CP1. It is a UI change: it builds screens over an
existing data contract; it does not add new campaign business logic.

## What Changes

- ADDED a Mech Bay page: a roster-wide unit-status grid showing each unit's
  damage state, repair-ticket count, and combat-readiness, with drill-down to
  the unit's repair detail
- ADDED a Repair Bay page: the repair-ticket queue from `ICampaignInventory.repairBay`,
  grouped by unit, with per-ticket status, expected hours, parts-ready flag, and
  a priority-reorder action
- ADDED a Medical Bay page: the `ICampaignInventory.medicalBay` list of injured
  pilots with injury level, days-to-recover, and recovery status
- ADDED a Salvage Acceptance panel: the `ICampaignInventory.salvageBay` list with
  per-item accept / decline actions and a running mercenary-share value total
- ADDED bay navigation entries under the campaign navigation so the four
  surfaces are reachable from the campaign dashboard
- ADDED loading, empty, and error states for each surface consistent with the
  existing `campaign-ui` patterns
- ADDED Storybook stories for each bay surface covering populated, empty, and
  error states

## Dependencies

- **Requires**: `add-campaign-combat-loop` (CP1 — the frozen `ICampaignInventory`
  schema this UI renders), `campaign-ui` (the page/navigation/loading-state
  patterns this matches), `campaign-persistence` (CP0 — accept/decline actions
  mutate the campaign through the persistence store)
- **Required By**: `add-campaign-refit-and-prestige` (CP3 — the refit surface
  links from the mech bay)

## Impact

- Affected specs: `campaign-bay-ui` (new capability) — chosen over adding to
  `campaign-ui` because the bay surfaces are a cohesive post-battle cluster with
  their own navigation group and CP3 will link into them; a dedicated capability
  keeps the four-surface set coherent
- Affected code: `src/pages/campaigns/[id]/` (new bay pages),
  `src/components/campaign/bays/` (new bay components),
  `src/stores/campaign/` (read selectors over `ICampaignInventory`; accept/
  decline / reorder actions)
- No new data model — every surface renders the frozen CP1 `ICampaignInventory`;
  accept/decline/reorder mutate existing campaign state (salvage status, ticket
  priority) through the persistence store
- Reversible: the bay pages are additive routes; removing them leaves the
  campaign loop functional but invisible, as today

## Non-Goals

- Personnel hiring, finances/loans, and contract-market surfaces — those are
  CP2b `add-campaign-command-ui`
- The refit / equipment-swap surface — that is CP3 `add-campaign-refit-and-prestige`
- Changing the `ICampaignInventory` schema — it is frozen by CP1; this change
  only renders it
- New repair / salvage / medical business logic — the engines exist; this change
  surfaces their output and exposes accept/decline/reorder actions over existing
  state
- Tactical-map or in-battle UI — out of scope
