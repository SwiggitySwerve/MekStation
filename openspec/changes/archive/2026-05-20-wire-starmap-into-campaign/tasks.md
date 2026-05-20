# Tasks: Wire Starmap Into Campaign

## 1. Star system data model + seed dataset

- [ ] 1.1 `src/types/starmap/StarSystem.ts` (new) — `IStarSystem` (id, name, position {x,y}, faction, population?), `isStarSystem` type guard, `KNOWN_FACTIONS` const array
- [ ] 1.2 `src/lib/starmap/seed/inner-sphere-seed.json` (new) — 40-system seed: the 5 Successor State capitals (Terra, Tharkad, Atreus, Sian, Luthien), 4 Periphery capitals (Taurus, Canopus, Alpha Coronis, Hindmarsh), 8 well-known industrial worlds (Hesperus II, Outreach, Solaris VII, Galax, Tikonov, Robinson, Coventry, New Avalon), 8 Clan invasion-route worlds (Tukayyid, Strana Mechty, Huntress, Arc-Royal, Tamar, Black Brian, Skye, Dieron), 5 mercenary hubs (Galatea, Northwind, Outreach again — drop duplicate), 10 misc strategically-notable systems
- [ ] 1.3 `src/lib/starmap/loadInnerSphereSeed.ts` (new) — loader that imports the JSON and validates each entry through the type guard; throws on malformed payload
- [ ] 1.4 Unit tests: seed dataset has ≥40 valid entries, each entry passes the type guard, faction values are all in `KNOWN_FACTIONS`, no duplicate ids

## 2. Campaign `currentSystemId` field

- [ ] 2.1 `src/types/campaign/Campaign.ts`: add optional `currentSystemId?: string`
- [ ] 2.2 Default behavior: a campaign without `currentSystemId` is treated as `'terra'` in the UI. The store does NOT auto-fill the field — the page-level read uses `?? 'terra'` so legacy persisted campaigns work unchanged.
- [ ] 2.3 Persistence: the existing zustand `persist` middleware already serializes the `campaign` slice; the new field rides through as-is, no migration needed

## 3. `travelToSystem` store action + activity log

- [ ] 3.1 `src/stores/campaign/useCampaignStore.ts`: add `travelToSystem(systemId: string)` action
  - Validates `systemId` is a known system (looked up against the seed dataset)
  - Sets `campaign.currentSystemId = systemId`
  - Emits an `IActivityLogEntry` of category `'travel'` with summary `"Travelled to {systemName}"` (using `appendActivityLogEntry` from Wave 6.1.B)
  - No-op (returns false) when the systemId is the same as the current location
  - Returns true on successful travel, false on no-op / invalid system
- [ ] 3.2 Add a `category: 'travel'` discriminant to `ActivityLogCategory` (in Wave 6.1.B's `IActivityLogEntry`). The dashboard's Activity Log card will render travel entries with the same shape as the other categories
- [ ] 3.3 Unit tests: happy-path travel updates state + emits log entry; unknown systemId returns false; same-system no-op returns false; activity log dedup still works

## 4. Page route + click-to-travel UX

- [ ] 4.1 `src/pages/gameplay/campaigns/[id]/starmap.tsx` (new) — mounts `<StarmapDisplay>` against the seed dataset
  - Reads `campaign.currentSystemId ?? 'terra'`, passes as `selectedSystem` to highlight the "you are here" pin
  - On click, sets local `pendingSelection` state — does NOT immediately travel
  - "Travel here" button below the map (disabled when `pendingSelection === currentSystemId` or null) — clicking calls `travelToSystem(pendingSelection)`
  - Uses the PT-102 hydration pattern: `useEffect(() => setIsClient(true), [])`
- [ ] 4.2 Empty / error states: a campaign with no `currentSystemId` shows "Currently at: Terra (default)" + the Terra pin highlighted
- [ ] 4.3 Test the page mount happy path + travel flow (click → "Travel here" → store state updated + activity log entry emitted)

## 5. Campaign nav

- [ ] 5.1 `src/components/campaign/CampaignNavigation.tsx`: add a "Starmap" entry pointing to `/gameplay/campaigns/[id]/starmap` with testid `nav-starmap`
- [ ] 5.2 Snapshot/render test confirms the nav link is present + has the correct href

## 6. Spec deltas + verification

- [ ] 6.1 Author delta at `openspec/changes/wire-starmap-into-campaign/specs/starmap-interface/spec.md` ADDING "Inner Sphere Seed Dataset" + "Selected System Travel Action" requirements with scenarios
- [ ] 6.2 Author delta at `openspec/changes/wire-starmap-into-campaign/specs/campaign-system/spec.md` ADDING "Current System Location" requirement with scenarios
- [ ] 6.3 `openspec validate wire-starmap-into-campaign --strict` passes
- [ ] 6.4 `npm run verify:full` passes
- [ ] 6.5 Archive after merge

## 7. Closeout corrections

- [ ] 7.1 `playtest/CLOSEOUT.md`: add a "Wave 6.4 — Starmap shipped" section
- [ ] 7.2 Note in roadmap that the full 3,359-system SUCKit import is a named follow-up
