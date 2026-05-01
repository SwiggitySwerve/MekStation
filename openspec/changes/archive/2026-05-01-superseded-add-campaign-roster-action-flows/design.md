## Context

The MekStation campaign loop has three already-shipped backend systems whose UI surface is incomplete:

1. **Pilot XP improvement** — `PilotProgressionPanel.tsx` renders `SkillUpgradeRow` with `onUpgrade` callbacks and cost calculations from `getGunneryImprovementCost` / `getPilotingImprovementCost`, but the callback never reaches `/api/pilots/[id]/improve-gunnery|improve-piloting`. The API routes exist; the wiring does not.
2. **SPA purchase** — `PilotAbilitiesPanel.tsx` renders the picker and exposes an `onUpdate` callback. The `/api/pilots/[id]/purchase-ability` route exists. Same wiring gap.
3. **Crew assignment** — `CampaignInstanceAssignmentOperations.assignPilotToUnit` / `unassignPilot` are fully tested but no UI calls them.

Additionally, `PilotProgressionPanel` is currently only rendered on the standalone pilot detail page (`pages/gameplay/pilots/[id].tsx`), not surfaced from the campaign personnel-roster row. The campaign flow has no entry point to spend XP or assign pilots.

## Goals / Non-Goals

**Goals:**
- Connect already-built pilot improvement UI to already-built API routes via a single typed client hook
- Surface `PilotProgressionPanel` and `PilotAbilitiesPanel` from the campaign personnel-roster row (clickable row → side panel or modal)
- Add a Crew Assignment panel that lets the player pick a pilot and a unit, calling `assignPilotToUnit` / `unassignPilot`
- Preserve all existing behavior on the standalone pilot detail page
- Round-trip smoke test (open roster → spend XP → assign pilot → verify campaign-store mutation)

**Non-Goals:**
- No new API routes, no new services, no new domain logic
- Faction standing UI, market filtering UI (backends incomplete; separate change)
- Mobile/responsive treatment (desktop-default; mobile out of scope)
- AI opponent integration (separate change)
- Replacing the standalone pilot detail page

## Decisions

### 1. Single client hook for pilot improvement actions

Create `src/hooks/usePilotImprovement.ts` exposing:

```ts
interface UsePilotImprovement {
  improveGunnery: (pilotId: string) => Promise<PilotImprovementResult>;
  improvePiloting: (pilotId: string) => Promise<PilotImprovementResult>;
  purchaseAbility: (
    pilotId: string,
    spaId: string,
    designation?: IPilotAbilityDesignation,
    isCreationFlow?: boolean,
  ) => Promise<PilotImprovementResult>;
  isLoading: boolean;
  error: Error | null;
}
```

The hook returns route-shaped delta results (NOT `IPilot`) because the routes themselves return deltas — `improve-gunnery` returns `{ success, newGunnery, xpSpent, xpRemaining }`, `improve-piloting` returns the piloting equivalent, and `purchase-ability` returns `{ success, spaId, xpRemaining }` on the SPA path. Consumers read `xpRemaining` / `newGunnery` etc. directly. Re-render of the campaign personnel row relies on the coordinator action (Decision 4 addendum) pushing the delta into `usePersonnelStore` via the existing `updatePerson` primitive.

`purchaseAbility` takes `spaId` (not `abilityId`) — the route's SPA branch fires only when `body.spaId` is present per `src/pages/api/pilots/[id]/purchase-ability.ts:113`. Posting `abilityId` falls through to the legacy catalog path which has no designation/gating support.

Single hook because all three actions share lifecycle (loading state, error display, coordinator dispatch). One hook also keeps the `PilotProgressionPanel` / `PilotAbilitiesPanel` agnostic about transport — their existing `onUpdate?: () => void` / `onPilotChange?: () => void` callbacks are return-type-agnostic, so this change does NOT break their contracts.

**Alternatives considered:** three separate hooks (rejected — more boilerplate, more mocks in tests); RTK Query / SWR (rejected — project doesn't use them; introducing a new data layer for one feature violates KISS); making routes return `IPilot` (rejected — broader API change, violates the proposal's no-backend-changes goal).

### 2. Campaign roster row → side panel pattern

The personnel-roster row becomes clickable and opens a side panel containing tabs `Progression | Abilities | Assignment`. Reuse the panel pattern already established in the campaign UI rather than navigating to `/gameplay/pilots/[id]` (preserves campaign context — selected campaign, recent activity feed).

The side panel mounts the existing `PilotProgressionPanel` and `PilotAbilitiesPanel` components unchanged. The Assignment tab is the new component.

**Alternatives considered:** modal (rejected — blocks campaign view, no side-by-side context); navigation to detail page (rejected — loses campaign context; user must `<-Back` to return); inline expansion of the row (rejected — cramped; XP/SPA selectors need real estate).

### 3. Crew Assignment panel — pilot-centric, not unit-centric

The new `CrewAssignmentPanel` displays:
- The currently selected pilot's assignment (if any)
- A list of unassigned units in the campaign matching the pilot's role (mech-warrior → BattleMechs only, vehicle-crew → vehicles only)
- An "Unassign" button (visible only when an assignment exists)

Pilot-centric because the entry point IS a pilot (clicking the personnel-roster row). A unit-centric flow would force a context switch.

**Alternatives considered:** unit-centric panel reachable from forces page (deferred — could be added later; not blocking); two-way panel with both directions (rejected — over-engineered; YAGNI).

### 4. Campaign-store action surface — one thin coordinator + read-through assignment wrapper

**Addendum (post-Codex review):** The IPerson / IPilot split is intentional, NOT accidental duplication. In the BattleTech tabletop model, the campaign roster contains many `IPerson` records that are NOT pilots — techs, doctors, admins, and other support staff have no `IPilot` analog at all. `IPilot` exists only for personnel whose roles need pilot-specific data: MechWarriors, vehicle crew, aerospace pilots, etc. For that subset, `IPerson` carries a roster-projection of the pilot's skills and SPAs (`IPerson.pilotSkills`, `IPerson.specialAbilities`, `IPerson.xp`, `IPerson.xpSpent`) so the personnel page can render them inline without round-tripping through the pilot repository on every render. The canonical pilot record lives in the pilot repository (`IPilot.skills`, `IPilot.abilities`, `IPilot.career.xp`); the `IPerson` projection is read-on-render.

The only existing bridge between the canonical record and the projection is `pilotToPerson()` at `src/types/campaign/Person.ts:641`, used at import time when a new pilot enters the campaign roster. There is no live sync — verified via grep across `src/stores/`, no file in the campaign-store hierarchy imports `usePilotStore`, and no service-side equivalent exists. So today, after a pilot-side write (XP spend, SPA purchase, skill improvement), the `IPerson` projection silently drifts until the next campaign reload.

Therefore this change MUST add ONE thin coordinator action — `updatePersonFromPilotDelta(pilotId, delta)` on `usePersonnelStore` — that the new pilot-improvement hook calls after every successful API response. The coordinator reuses the existing `updatePerson(pilotId, Partial<IPerson>)` write primitive at `usePersonnelStore.ts:102`; it is store-side coordination, not new domain logic. The action no-ops when the pilot has no matching `IPerson` (e.g., the pilot exists outside the campaign roster), so it's safe to call unconditionally from the hook. The proposal's original "no new actions" claim has been revised in the proposal-text accordingly to honestly reflect this addition.

The same sync pattern applies to the assignment path: `CampaignInstanceAssignmentOperations.assignPilotToUnit` writes to the instance service but does NOT update `IPerson.unitId`. The campaign-store wrapper for `assignPilotToUnit`/`unassignPilot` MUST therefore also call `personnelStore.updatePerson(pilotId, { unitId })` (or `{ unitId: undefined }` on unassign) to keep the personnel-roster row in sync. Without this, the Crew Assignment spec scenario "Display current assignment" cannot pass.

**Alternatives considered:** route changes returning `IPilot` so the hook can replace the whole pilot record (rejected — broader API change; the routes' delta shape is fine for the projection); subscribe `useCampaignStore` to `usePilotStore` via a global effect (rejected — first cross-store subscription in the codebase, large blast radius for one feature); collapse `IPerson` and `IPilot` into a single type (rejected — would force every non-pilot personnel record to carry empty `pilotSkills`/`abilities`, distorting the domain model that correctly distinguishes "is on the roster" from "has pilot mechanics").

### 5. Loading / error UX

`SkillUpgradeRow` already has `disabled={!canAfford}`. Extend with `disabled={!canAfford || isLoading}` and surface the error via the panel's existing toast/error region. No new error component.

## Risks / Trade-offs

- **[Risk]** `PilotProgressionPanel` is currently coupled to the pilot detail page's data-fetch pattern. → **Mitigation:** keep the component prop signature unchanged; the hook handles refresh. Verify no implicit dependency on the page's `useEffect` reload.
- **[Risk]** Assigning a pilot already assigned to a different unit must auto-unassign cleanly. → **Mitigation:** `assignPilotToUnit` already encapsulates this (verified in `CampaignInstanceStateService.test.ts`); call it directly and trust the service. Do not re-implement the logic in the UI.
- **[Risk]** The roster-row → panel transition could cause hydration warnings if mounted SSR. → **Mitigation:** the panel is interaction-gated (`useState`-driven open flag); SSR renders nothing for the panel until first click. Existing campaign UI uses this pattern (`Requirement: SSR and Hydration Safety`).
- **[Risk]** Bundling 3 sub-features in one PR risks the discipline-failure mode Momus flagged. → **Mitigation:** the PR has explicit per-task acceptance criteria; tests must pass per task before next task starts; spec deltas are scoped tightly to the 3 wired flows (no scope creep into faction standing or market filtering).
- **[Risk]** `addPerson` upsert collision masks coordinator writes. `usePersonnelStore.addPerson` at line 88-93 is a full-record `Map.set`, last-write-wins, no merge. Post-battle reports fire `addPerson` with an `IPerson` reconstructed from `report.campaign.personnel`; if the report carries a stale projection (pre-XP-spend), the stale record will silently overwrite the coordinator's write. → **Mitigation (in scope):** none in this PR — the coordinator is only invoked by the new pilot-improvement hook, and the post-battle report path is unchanged. → **Mitigation (deferred):** convert `addPerson` to a merge-on-write or add a "newer-data-wins" guard at the report-merge boundary in a separate change. Documented in MEMORY for the next refactor wave; revisit if QA observes any roster-state regression after a battle that follows an XP spend.

## Migration Plan

No data migration. The change is additive UI wiring. Rollback = revert the PR; backend behavior unchanged.

## Open Questions

- (Resolved during proposal) Should the side panel be a global slide-over or a within-roster column? → Within-roster column matching campaign-detail layout convention. Confirmed against `Requirement: Component Integration`.
- (Resolved during proposal) Should crew-assignment validation enforce role compatibility client-side? → Yes, client-side filter the unit list to compatible role; server-side `assignPilotToUnit` is the source of truth for rejection.
