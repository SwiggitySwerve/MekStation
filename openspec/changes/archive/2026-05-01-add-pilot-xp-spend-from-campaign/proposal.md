## Why

Players who complete missions and earn pilot XP currently have no in-campaign UI to spend that XP — the existing `PilotProgressionPanel` and `PilotAbilitiesPanel` are mounted only on the standalone `/gameplay/pilots/[id]` detail page, which is disconnected from the active campaign context. The previous attempt to surface these panels (`add-campaign-roster-action-flows`, superseded 2026-05-01) was canceled after 3 review rounds revealed the campaign personnel page reads from `IPerson[]` records that are never seeded in production — making it an empty-state surface that no UI wiring could fix. The OMO Council decision at `openspec/council-decisions/2026-05-01-personnel-architecture-path.md` mandates a sequenced approach: ship narrow XP-spend value first via the actually-populated `useCampaignRosterStore` (Layer 2) joined to vault `IPilot`, then resolve the personnel architecture in a follow-up change, then migrate the 13 silently-broken subsystems. This change is step 3 of that sequence.

## What Changes

- Add a clickable row interaction to the campaign roster surface (driven by `useCampaignRosterStore.pilots: ICampaignPilotState[]`) that opens a side panel
- The side panel mounts the EXISTING `PilotProgressionPanel` and `PilotAbilitiesPanel` components unchanged, passing the resolved vault `IPilot` as the `pilot` prop
- Pilot data resolution: vault join from `ICampaignPilotState.pilotId` → `usePilotStore.pilots.find(p => p.id === pilotId)`. NO `IPerson` reads. NO `usePersonnelStore` touched.
- XP-spend mechanic flows through the EXISTING `usePilotStore.improveGunnery / improvePiloting / purchaseSPA` actions (no new client hook). These actions already POST to the correct routes, already call `loadPilots()` on success, and already manage `error` / `isLoading` state.
- Add a Crew Assignment Panel that calls the EXISTING `PUT /api/forces/assignments/[id]` route via `ForceService` (operating on Force slot IDs and vault pilot IDs). NO calls to `CampaignInstanceAssignmentOperations` (server-only, no API route).
- Add unit tests for the new components + an integration test asserting RENDERED DOM updates after a successful XP spend (per Codex's 2nd review finding — store-mutation assertions are insufficient).
- Document the architectural decision in design.md: vault is canonical for skills/XP/abilities; campaign-roster (Layer 2) is canonical for per-campaign mutable state; Layers 3 (`IPerson`) and 4 (`ICampaignPilotInstance`) are out of scope.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `campaign-ui`: ADD requirements for "Pilot Action Side Panel from Campaign Roster" and "Crew Assignment Panel via Force Slot Assignment"

## Impact

- Affected code:
  - `src/pages/gameplay/campaigns/[id]/personnel.tsx` — replace `Array.from(campaign.personnel.values())` (which renders `IPerson[]` from the empty `usePersonnelStore`) with `useCampaignRosterStore` reads of `ICampaignPilotState[]`
  - `src/components/campaign/personnel/PersonnelSidePanel.tsx` (NEW) — tabs `Progression | Abilities | Assignment`, opens on row click via local `useState`
  - `src/components/campaign/personnel/CrewAssignmentPanel.tsx` (NEW) — calls existing `/api/forces/assignments/[id]`
  - `src/components/campaign/personnel/usePilotForRoster.ts` (NEW selector hook) — encapsulates the vault join `pilotId → IPilot` so the subscription web stays small
  - `src/components/pilots/PilotProgressionPanel.tsx`, `src/components/pilots/PilotAbilitiesPanel.tsx` — UNCHANGED. Reused as-is.
- Affected stores:
  - `usePilotStore` — UNCHANGED. Existing `improveGunnery / improvePiloting / purchaseSPA` actions are correct.
  - `useCampaignRosterStore` — read-only consumption for the personnel page surface.
  - `usePersonnelStore` — UNCHANGED, NOT TOUCHED. Will be addressed in follow-up changes per council decision.
- Affected APIs:
  - `/api/pilots/[id]/improve-gunnery|improve-piloting|purchase-ability` — UNCHANGED. Already wired correctly.
  - `/api/forces/assignments/[id]` (PUT) and `swap` (POST) — UNCHANGED. Already wired correctly. Used by new CrewAssignmentPanel.
- No new dependencies; no migrations; no breaking changes to construction or BV calc.

## Non-Goals

- **Personnel store seeding** (`pilotToPerson()` calls at campaign creation, fixing the 13 silently-broken subsystems). Deferred to `decide-campaign-personnel-architecture` (design) + `migrate-personnel-to-roster-employment` (implementation) per council decision.
- **`ICampaignPilotInstance` wiring.** Layer 4 remains aspirational scaffolding; no work in this change touches `CampaignInstanceService` / `CampaignInstancePilotOperations` / `CampaignInstanceAssignmentOperations`.
- **Salary, healing, turnover, vocational training, awards, life events, prisoner events, food/housing tax, daily cost summary, day-pipeline salary deduction, post-battle wound sync, personnel roster UI for non-pilot personnel** — all silently no-op today because they read `IPerson[]` from the empty `usePersonnelStore`. Fixing these is the explicit scope of `migrate-personnel-to-roster-employment`.
- **Non-pilot personnel UI** (techs, doctors, admins). Out of scope; the new side panel is pilot-only by virtue of consuming `useCampaignRosterStore.pilots: ICampaignPilotState[]` which only contains MechWarrior records.
- **Mobile/responsive treatment** of the new panels. Desktop-default; mobile out of scope.
- **NPC progression UI.** NPCs are campaign-scoped per user's domain rule; player-facing XP-spend UI is for PCs (vault-backed).
- **Cross-campaign character continuity feature work.** The architectural foundation for that lives in vault `IPilot` already, but no UI in this change exercises it.
