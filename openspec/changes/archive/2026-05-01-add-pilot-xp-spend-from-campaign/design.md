## Context

The MekStation campaign personnel page (`src/pages/gameplay/campaigns/[id]/personnel.tsx:249`) currently reads `Array.from(campaign.personnel.values())` — an `IPerson[]` map sourced from `usePersonnelStore`. Investigation across 6 agents and 3 review rounds (documented in `openspec/council-decisions/2026-05-01-personnel-architecture-path.md`) confirmed that `usePersonnelStore` starts empty in every campaign because **nothing seeds it** — `pilotToPerson()` at `src/types/campaign/Person.ts:641` has zero production callers. The page renders an `EmptyState` by default. 13 silently-broken production features (salary, healing, turnover, vocational training, awards, life events, prisoner events, food/housing tax, daily cost summary, day-pipeline salary deduction, personnel roster UI, post-battle wound sync) are all downstream of this seeding gap.

Meanwhile, the LIVE per-campaign pilot record is `ICampaignPilotState` in `useCampaignRosterStore`, written by the campaign-creation flow at `src/components/gameplay/pages/campaigns/create/CreateCampaignPage.tsx:163-178`. This record carries `pilotId` (vault reference), `status`, `wounds`, `xp`, `campaignXpEarned`, `campaignKills`, `campaignMissions`, `assignedUnitId?`, `recoveryTime`. Vault `IPilot` (in `usePilotStore`) holds the canonical skills, abilities, and career XP — the existing `usePilotStore.improveGunnery` / `improvePiloting` / `purchaseSPA` actions already POST to the correct API routes and call `loadPilots()` on success.

The OMO Council decision committed to a sequenced fix: ship narrow XP-spend value first via the actually-populated `useCampaignRosterStore` joined to vault `IPilot` (this change), then resolve personnel architecture in `decide-campaign-personnel-architecture`, then migrate the 13 broken subsystems in `migrate-personnel-to-roster-employment`. This change is step 3 of that 5-step sequence and explicitly excludes any work on Layers 3 (`IPerson`) or 4 (`ICampaignPilotInstance`).

## Goals / Non-Goals

**Goals:**
- Connect already-built pilot improvement UI (`PilotProgressionPanel`, `PilotAbilitiesPanel`) to the campaign personnel surface via a side-panel pattern
- Repoint the personnel page from the empty `IPerson[]` source to the populated `ICampaignPilotState[]` source
- Resolve pilot data via vault join: `ICampaignPilotState.pilotId → usePilotStore.pilots.find(p => p.id === pilotId)`
- Surface a Crew Assignment Panel calling the existing `/api/forces/assignments/[id]` route
- Add an integration test that asserts RENDERED DOM updates after a successful XP spend (per Codex 2nd-review finding — store-mutation assertions are insufficient)
- Preserve all existing behavior on the standalone pilot detail page (`/gameplay/pilots/[id]`)

**Non-Goals:**
- Personnel store seeding, `IPerson` writes, `pilotToPerson()` calls — deferred per council decision
- `ICampaignPilotInstance` wiring (Layer 4 remains aspirational)
- Salary / healing / turnover / vocational training / awards / life events / prisoner events / food-housing tax / daily cost summary / day-pipeline salary deduction / post-battle wound sync — all silently no-op today; fixing is out of scope
- Non-pilot personnel UI (techs, doctors, admins). The new side panel surfaces only MechWarriors (the population of `useCampaignRosterStore.pilots`)
- New backend routes, new domain logic, new API contracts
- Mobile / responsive treatment
- Cross-campaign character continuity feature work

## Decisions

### 1. Reuse `usePilotStore` actions; do NOT add a new client hook

The previous (canceled) change proposed building `usePilotImprovement` as a new typed client hook. Investigation revealed `usePilotStore.improveGunnery` / `improvePiloting` / `purchaseSPA` at `src/stores/usePilotStore.skills.ts:59-211` already do exactly this — POST to the correct routes via `postWithSuccess`, call `get().loadPilots()` on success, manage `error` state, return boolean. `PilotProgressionPanel.tsx:167-168` and `PilotAbilitiesPanel.tsx:184-185` already consume these actions. No new hook required.

**Alternative considered:** Add a wrapper hook for testability. **Rejected** — the existing actions are already tested at the store level, and adding a wrapper would duplicate the surface for no design benefit. The panels are panel-store-agnostic (`onUpdate?: () => void` callbacks are return-type-agnostic).

### 2. Repoint personnel page to `useCampaignRosterStore.pilots`, NOT `IPerson[]`

The current personnel page reads `Array.from(campaign.personnel.values())` from the empty `usePersonnelStore`. We replace that read with `useCampaignRosterStore` consumption of `ICampaignPilotState[]`. Each row's stable id is `ICampaignPilotState.pilotId` (the vault `IPilot.id`).

**Alternative considered:** Seed `usePersonnelStore` via `pilotToPerson()` at campaign creation. **Rejected for this change** — that's exactly the work scoped to `decide-campaign-personnel-architecture` + `migrate-personnel-to-roster-employment`. Doing it here would defeat the council's "narrow ship first" strategy and pre-commit Layer 3 as the destination architecture before the spike resolves the crux (does saved-campaign data persist `IPerson` divergence?).

**Alternative considered:** Keep the personnel page as-is and surface XP-spend only on the standalone pilot detail page. **Rejected** — that's even narrower than this change but doesn't deliver the user-stated value of "spend XP from inside a campaign without leaving campaign context."

### 3. Vault join — REUSE existing `usePilotById` hook

The existing `usePilotById(id: string | null): IPilot | null` at `src/stores/usePilotStore.ts:163-167` already does exactly what the side panel needs: selects via `usePilotSelector((state) => state.pilots)` and returns the matching pilot or `null`. We REUSE it directly instead of creating a new `usePilotForRoster` hook (per `correct-fix-over-easy-fix` — the existing hook is the right primitive).

```ts
// Existing in src/stores/usePilotStore.ts:163-167
export function usePilotById(id: string | null): IPilot | null {
  const pilots = usePilotSelector((state) => state.pilots);
  if (!id) return null;
  return pilots.find((p) => p.id === id) || null;
}
```

The side panel calls `usePilotById(pilotId)` directly. Returns `null` for missing pilots; the panel renders the "Pilot not found in vault" message in that branch. Subscription web stays minimal because `usePilotSelector` is a Zustand selector — components only re-render when the selected pilot list changes.

**Why this is safer than a new hook:** Oracle's Phase-2 risk register flagged "cross-store reactivity via direct `useStore` calls in many components creates a stale-closure / missing-rerender minefield." `usePilotById` is the existing single-source primitive — using it is more aligned with that risk mitigation than creating a parallel duplicate.

### 4. Side panel pattern — within-page column, interaction-gated mount

The personnel-roster row becomes clickable. On click, set local `useState` selected-pilot id; render `<PersonnelSidePanel pilotId={selectedId} />` as a column within the page layout. Tabs `Progression | Abilities | Assignment`. Mount the existing `PilotProgressionPanel` and `PilotAbilitiesPanel` unchanged on the first two tabs.

**Why interaction-gated:** prevents SSR hydration warnings (panel renders nothing until first click). Existing campaign UI uses this pattern (`Requirement: SSR and Hydration Safety` from `campaign-ui` spec).

**Alternative considered:** Modal. **Rejected** — blocks campaign view, no side-by-side context.
**Alternative considered:** Navigate to `/gameplay/pilots/[id]`. **Rejected** — loses campaign context; user must back out to return.
**Alternative considered:** Inline expansion of the row. **Rejected** — cramped; XP/SPA selectors need real estate.

### 5. Crew Assignment REUSES existing `useForceStore` actions

Investigation found two layers already in place for force assignments:

- `PUT /api/forces/assignments/[id]` (and `swap.ts`) wired through `ForceService.assignPilot/assignUnit/assignPilotAndUnit` at `src/services/forces/ForceService.ts:162` — takes Force slot assignment IDs and vault pilot IDs (validated against the pilot repository).
- `useForceStore` at `src/stores/useForceStore.ts` (singleton, API-driven) — already exposes `loadForces()`, `forces: IForce[]` (each Force carries `assignments: readonly IAssignment[]`), `assignPilot(assignmentId, pilotId)`, `clearAssignment(assignmentId)`. All actions call the API and run `loadForces()` on success.

The new `CrewAssignmentPanel` REUSES `useForceStore` directly — no new client primitives. The IAssignment shape is `{ id, pilotId, unitId, position, slot }`. To find compatible slots for a pilot:
1. Read `useForceStore.forces` (call `loadForces()` if empty)
2. Flatten all `force.assignments` across forces
3. Find current assignment: `assignments.find(a => a.pilotId === pilotId)`
4. Find compatible empty slots: `assignments.filter(a => a.pilotId === null && unitMatchesRole(a.unitId))`

We do NOT call `CampaignInstanceAssignmentOperations.assignPilotToUnit` (server-only import; uses `ICampaignPilotInstance.id` which is never produced in production).

**Alternative considered:** Direct `fetch` to the API route, bypassing `useForceStore`. **Rejected** — `useForceStore` is the existing client primitive; bypassing it would create a parallel data path and lose the auto-refresh on success.

**Alternative considered:** Add new `/api/campaigns/[id]/assignments` route wrapping `CampaignInstanceAssignmentOperations`. **Rejected** — would commit to Layer 4 architecture before the council-decided design phase resolves whether Layer 4 should exist at all.

### 6. Integration test asserts RENDERED DOM, not store mutations

Per Codex's 2nd-review finding: store-level assertions can pass while the rendered panel shows stale values. The integration test for this change uses `@testing-library/react` queries against the rendered DOM after a successful XP spend, asserting the displayed gunnery/piloting/XP values reflect the new state. NOT just `expect(store.pilots[0].skills.gunnery).toBe(3)`.

## Risks / Trade-offs

- **[Risk]** `useCampaignRosterStore.pilots` may not be populated in older saved campaigns that pre-date the `CreateCampaignPage` write at line 163-178. → **Mitigation:** add an empty-state UI for the personnel surface that explicitly says "No pilots in this campaign roster" rather than rendering an empty list. Confirm during testing that recent test fixtures populate the store.
- **[Risk]** The personnel page's existing reads of `IPerson` fields (rank, primaryRole, hits, salary) won't have analogs on `ICampaignPilotState`. → **Mitigation:** `ICampaignPilotState` carries `pilotName`, `status`, `wounds`, `xp`, mission counters — sufficient for the new pilot-only surface. Non-pilot personnel data (techs, doctors, salary, rank progression) is OUT OF SCOPE per Non-Goals; remove those columns from the personnel-page header for this change. They will return when `migrate-personnel-to-roster-employment` ships.
- **[Risk]** Force-assignment API uses Force slot assignment IDs, not vault unit IDs. The Crew Assignment Panel needs to know which Force the selected pilot can be assigned into. → **Mitigation:** pull active Force from `useCampaignRosterStore` campaign-level state; show available slot assignments. If no Force exists yet, panel shows "No active force — create one in Forces" with a navigation link.
- **[Risk]** Removing the `IPerson`-driven personnel page reads may strand visual elements (status badges, role pills) that the previous UI relied on. → **Mitigation:** scope the personnel page rewrite to a pilot-only roster view; preserve the "view personnel" navigation but accept that techs/doctors/admins won't render until the migration change ships. Document this prominently in the change's PR.
- **[Risk]** The side-panel pattern has not been tested against React 19's `<Suspense>` interactions — first-time mount may flash. → **Mitigation:** use `useState` (not `<Suspense>`) for mount-gating per existing campaign-ui pattern. No async boundaries inside the side panel.
- **[Risk]** A future change reverses the council decision and makes Layer 3 (`IPerson`) the canonical record. → **Mitigation:** the new `usePilotForRoster` hook isolates the join. Swapping Layer 2 for Layer 3 + projection sync would update only that one hook plus the personnel page data source. Blast radius is bounded.

## Migration Plan

No data migration. The change is additive UI wiring + a single source-swap on the personnel page. Rollback = revert the PR; the campaign-creation flow's `useCampaignRosterStore` writes are unchanged.

The page swap from `IPerson[]` to `ICampaignPilotState[]` is the load-bearing change. Existing campaigns that have populated `IPerson` records (if any) will see those records ignored — the personnel page reads from `useCampaignRosterStore` only. Since investigation confirmed `IPerson` is never written outside test fixtures, this should not affect any user data in practice.

## Open Questions

- (Resolved during proposal) Should the new side panel be a global slide-over or a within-page column? → Within-page column matching campaign-detail layout convention.
- (Resolved during proposal) Should the Crew Assignment Panel show the unit list filtered to compatible roles? → Yes, client-side filter by pilot role (MECHWARRIOR → BattleMechs); server-side `ForceService.assignPilot` validates as the source of truth for rejection.
- (Open — to confirm during implementation) When a player has no Force in the campaign yet, what's the right CTA in the Assignment tab? Default plan: render a "Create your first force in /gameplay/campaigns/[id]/forces" link. If a different empty-state pattern exists in the campaign UI, follow that instead.
